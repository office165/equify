'use client';

import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { ValuationLocale } from '../../../api_client';
import type { WaccBreakdown } from '../../../lib/valuation';
import type { EquifyWizardStepStrings } from '../../../lib/i18n/equify_wizard_steps';

const VIEWPORT_PAD = 12;
const MOBILE_BREAKPOINT = 640;
const HOVER_OPEN_MS = 100;
const HOVER_CLOSE_MS = 120;
const POPOVER_W = 288;

type Placement = 'top' | 'bottom';

interface PopoverCoords {
  top: number;
  left: number;
  placement: Placement;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function supportsFineHover(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function formatPct(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

function InfoIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 opacity-70"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="8" cy="5.25" r="0.85" fill="currentColor" />
      <path
        d="M8 7.5V11"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
}

export interface WaccBreakdownPopoverProps {
  wacc: number;
  breakdown: WaccBreakdown;
  copy: Pick<
    EquifyWizardStepStrings['step2'],
    | 'waccBreakdownAria'
    | 'waccBreakdownTitle'
    | 'waccBreakdownRf'
    | 'waccBreakdownBeta'
    | 'waccBreakdownErp'
    | 'waccBreakdownAlpha'
    | 'waccBreakdownKe'
    | 'waccBreakdownFormula'
  >;
  locale: ValuationLocale;
  /** Live card container — popover stays inside this frame when possible. */
  boundaryRef?: React.RefObject<HTMLElement | null>;
}

export function WaccBreakdownPopover({
  wacc,
  breakdown,
  copy,
  locale,
  boundaryRef,
}: WaccBreakdownPopoverProps) {
  const reducedMotion = useReducedMotion();
  const isRtl = locale === 'he';
  const popoverId = useId();

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hoverCapable, setHoverCapable] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [coords, setCoords] = useState<PopoverCoords | null>(null);
  const [renderPop, setRenderPop] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const clearTimers = useCallback(() => {
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  const show = useCallback(() => {
    clearTimers();
    setOpen(true);
    setRenderPop(true);
  }, [clearTimers]);

  const hide = useCallback(() => {
    clearTimers();
    setOpen(false);
  }, [clearTimers]);

  const scheduleShow = useCallback(() => {
    clearTimers();
    openTimerRef.current = setTimeout(show, HOVER_OPEN_MS);
  }, [clearTimers, show]);

  const scheduleHide = useCallback(() => {
    clearTimers();
    closeTimerRef.current = setTimeout(hide, HOVER_CLOSE_MS);
  }, [clearTimers, hide]);

  useEffect(() => {
    setMounted(true);
    const sync = () => {
      setMobile(window.innerWidth < MOBILE_BREAKPOINT);
      setHoverCapable(supportsFineHover());
    };
    sync();
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('resize', sync);
      clearTimers();
    };
  }, [clearTimers]);

  const reposition = useCallback(() => {
    const trigger = triggerRef.current;
    const pop = popRef.current;
    if (!trigger || !pop) return;

    const anchor = trigger.getBoundingClientRect();
    const gap = 8;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const boundary = boundaryRef?.current?.getBoundingClientRect();

    pop.style.width = `${POPOVER_W}px`;
    const popW = pop.offsetWidth;
    const popH = pop.offsetHeight;

    const minLeft = Math.max(VIEWPORT_PAD, (boundary?.left ?? VIEWPORT_PAD) + VIEWPORT_PAD);
    const maxLeft = Math.min(
      viewportW - popW - VIEWPORT_PAD,
      (boundary?.right ?? viewportW - VIEWPORT_PAD) - popW - VIEWPORT_PAD,
    );
    const minTop = Math.max(VIEWPORT_PAD, (boundary?.top ?? VIEWPORT_PAD) + VIEWPORT_PAD);
    const maxTop = Math.min(
      viewportH - popH - VIEWPORT_PAD,
      (boundary?.bottom ?? viewportH - VIEWPORT_PAD) - popH - VIEWPORT_PAD,
    );

    const spaceBelow = (boundary?.bottom ?? viewportH) - anchor.bottom - gap - VIEWPORT_PAD;
    const spaceAbove = anchor.top - gap - VIEWPORT_PAD - (boundary?.top ?? VIEWPORT_PAD);
    const placement: Placement =
      spaceBelow >= popH || spaceBelow >= spaceAbove ? 'bottom' : 'top';

    let top =
      placement === 'bottom' ? anchor.bottom + gap : anchor.top - gap - popH;
    let left = anchor.left + anchor.width / 2 - popW / 2;

    if (isRtl) {
      left = anchor.right - popW / 2 - anchor.width * 0.15;
    }

    left = clamp(left, minLeft, Math.max(minLeft, maxLeft));
    top = clamp(top, minTop, Math.max(minTop, maxTop));

    setCoords({ top, left, placement });
  }, [boundaryRef, isRtl]);

  useLayoutEffect(() => {
    if (!open || !renderPop) return undefined;
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => reposition());
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, renderPop, mobile, reposition, wacc, breakdown]);

  useEffect(() => {
    if (!open) return undefined;
    const onScrollOrResize = () => reposition();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [hide, open]);

  useEffect(() => {
    if (!open || hoverCapable) return undefined;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || popRef.current?.contains(target)) return;
      hide();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [hide, hoverCapable, open]);

  const toggleTouch = useCallback(
    (e: React.MouseEvent) => {
      if (hoverCapable) return;
      e.preventDefault();
      e.stopPropagation();
      setOpen((v) => {
        const next = !v;
        if (next) setRenderPop(true);
        return next;
      });
    },
    [hoverCapable],
  );

  const handleExitComplete = useCallback(() => {
    if (!open) {
      setRenderPop(false);
      setCoords(null);
    }
  }, [open]);

  const rows = [
    { label: copy.waccBreakdownRf, value: formatPct(breakdown.rf) },
    { label: copy.waccBreakdownBeta, value: breakdown.leveredBeta.toFixed(2) },
    { label: copy.waccBreakdownErp, value: formatPct(breakdown.erp) },
    {
      label: copy.waccBreakdownAlpha,
      value: `+${formatPct(breakdown.alpha)}`,
    },
    { label: copy.waccBreakdownKe, value: formatPct(breakdown.ke) },
  ];

  const popMotion = reducedMotion
    ? {
        initial: false as const,
        animate: coords ? { opacity: 1 } : { opacity: 0 },
        exit: { opacity: 0 },
      }
    : {
        initial: coords ? { opacity: 0, y: coords.placement === 'bottom' ? -8 : 8, scale: 0.98 } : false,
        animate: coords ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0 },
        exit: { opacity: 0, y: 4, scale: 0.98 },
        transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
      };

  const portalContent =
    mounted && renderPop ? (
      <AnimatePresence onExitComplete={handleExitComplete}>
        {open && renderPop ? (
          <motion.div
            key="wacc-popover"
            id={popoverId}
            ref={popRef}
            role="dialog"
            aria-label={copy.waccBreakdownAria}
            dir={isRtl ? 'rtl' : 'ltr'}
            className={[
              'fixed z-[10050] w-72 rounded-xl border border-teal-500/30',
              'bg-slate-950/95 p-4 text-right shadow-2xl shadow-teal-950/50',
              'backdrop-blur-md',
              isRtl ? 'text-right' : 'text-left',
              coords ? '' : 'pointer-events-none invisible',
            ].join(' ')}
            style={{
              top: coords?.top ?? -9999,
              left: coords?.left ?? VIEWPORT_PAD,
              width: POPOVER_W,
            }}
            onMouseEnter={hoverCapable ? show : undefined}
            onMouseLeave={hoverCapable ? scheduleHide : undefined}
            {...popMotion}
          >
            <div className="mb-3 text-[11px] font-semibold tracking-wide text-teal-300/90">
              {copy.waccBreakdownTitle}
            </div>
            <dl className="space-y-2.5">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-3 text-[12px] leading-snug"
                >
                  <dt className="text-gray-400">{row.label}</dt>
                  <dd className="font-mono text-[12px] font-medium tabular-nums text-teal-100">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="my-2.5 border-t border-teal-900/40" />
            <div className="flex items-baseline justify-between gap-3 text-[12px]">
              <span className="font-medium text-gray-300">WACC</span>
              <span className="font-mono text-sm font-semibold tabular-nums text-teal-300">
                {formatPct(wacc)}
              </span>
            </div>
            <p className="mt-2.5 text-[10px] leading-relaxed text-teal-600/70">
              {copy.waccBreakdownFormula}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    ) : null;

  return (
    <span
      className="inline-flex items-center"
      onMouseEnter={hoverCapable ? scheduleShow : undefined}
      onMouseLeave={hoverCapable ? scheduleHide : undefined}
    >
      <button
        ref={triggerRef}
        type="button"
        className={[
          'group inline-flex cursor-help items-center gap-1',
          'text-gray-400 transition-colors hover:text-teal-400',
          'rounded-sm focus-visible:outline focus-visible:outline-2',
          'focus-visible:outline-offset-2 focus-visible:outline-teal-400/60',
          open ? 'text-teal-400' : '',
        ].join(' ')}
        aria-label={copy.waccBreakdownAria}
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={toggleTouch}
        onPointerDown={(e) => e.stopPropagation()}
        onFocus={hoverCapable ? show : undefined}
        onBlur={hoverCapable ? scheduleHide : undefined}
      >
        <span className="border-b border-dotted border-gray-500/50 pb-px font-mono transition-colors group-hover:border-teal-400/70">
          WACC {wacc.toFixed(1)}%
        </span>
        <InfoIcon />
      </button>
      {mounted ? createPortal(portalContent, document.body) : null}
    </span>
  );
}
