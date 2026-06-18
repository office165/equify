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
import { useValuationI18n } from '../../../valuation_i18n';
import { getEquifyWizardStepStrings } from '../../../lib/i18n/equify_wizard_steps';

export interface FieldTooltipProps {
  text: string;
  label?: string;
}

const VIEWPORT_PAD = 16;
const MOBILE_BREAKPOINT = 640;
const HOVER_OPEN_MS = 120;
const HOVER_CLOSE_MS = 100;

type Placement = 'top' | 'bottom';

interface PopoverCoords {
  top: number;
  left: number;
  width?: number;
  placement: Placement;
  arrowLeft: number;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function supportsFineHover(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function InfoIcon() {
  return (
    <svg
      className="field-tip-icon"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M7 6.2V9.4M7 4.6h.01"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Premium field tooltip — hover on desktop, tap on mobile, viewport-safe positioning */
export function FieldTooltip({ text, label }: FieldTooltipProps) {
  const { locale } = useValuationI18n();
  const defaultLabel = getEquifyWizardStepStrings(locale).common.tooltipAria;
  const ariaLabel = label ?? defaultLabel;
  const reducedMotion = useReducedMotion();

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hoverCapable, setHoverCapable] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [coords, setCoords] = useState<PopoverCoords | null>(null);
  const [renderPop, setRenderPop] = useState(false);

  const tipId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLSpanElement>(null);
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
    closeTimerRef.current = setTimeout(show, HOVER_OPEN_MS);
  }, [clearTimers, show]);

  const scheduleHide = useCallback(() => {
    clearTimers();
    closeTimerRef.current = setTimeout(hide, HOVER_CLOSE_MS);
  }, [clearTimers, hide]);

  useEffect(() => {
    setMounted(true);
    const syncViewport = () => {
      setMobile(window.innerWidth < MOBILE_BREAKPOINT);
      setHoverCapable(supportsFineHover());
    };
    syncViewport();
    window.addEventListener('resize', syncViewport);
    return () => {
      window.removeEventListener('resize', syncViewport);
      clearTimers();
    };
  }, [clearTimers]);

  const reposition = useCallback(() => {
    const btn = btnRef.current;
    const pop = popRef.current;
    if (!btn || !pop) return;

    const anchor = btn.getBoundingClientRect();
    const gap = 10;
    const arrowSize = 8;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const isMobile = viewportW < MOBILE_BREAKPOINT;
    const maxW = Math.min(isMobile ? viewportW - VIEWPORT_PAD * 2 : 320, viewportW - VIEWPORT_PAD * 2);

    pop.style.maxWidth = `${maxW}px`;
    pop.style.width = isMobile ? `${maxW}px` : 'max-content';

    const popW = pop.offsetWidth;
    const popH = pop.offsetHeight;
    const anchorCenterX = anchor.left + anchor.width / 2;

    if (isMobile) {
      const left = VIEWPORT_PAD;
      const spaceBelow = viewportH - anchor.bottom - gap - VIEWPORT_PAD;
      const spaceAbove = anchor.top - gap - VIEWPORT_PAD;
      const placement: Placement =
        spaceBelow >= popH || spaceBelow >= spaceAbove ? 'bottom' : 'top';

      let top =
        placement === 'bottom'
          ? anchor.bottom + gap
          : anchor.top - gap - popH;
      top = clamp(top, VIEWPORT_PAD, viewportH - popH - VIEWPORT_PAD);

      setCoords({
        top,
        left,
        width: maxW,
        placement,
        arrowLeft: clamp(anchorCenterX - left, 18, maxW - 18),
      });
      return;
    }

    const spaceBelow = viewportH - anchor.bottom - gap - arrowSize - VIEWPORT_PAD;
    const spaceAbove = anchor.top - gap - arrowSize - VIEWPORT_PAD;
    const placement: Placement =
      spaceBelow >= popH || spaceBelow >= spaceAbove ? 'bottom' : 'top';

    let top =
      placement === 'bottom'
        ? anchor.bottom + gap + arrowSize
        : anchor.top - gap - arrowSize - popH;
    top = clamp(top, VIEWPORT_PAD, viewportH - popH - VIEWPORT_PAD);

    let left = anchorCenterX - popW / 2;
    left = clamp(left, VIEWPORT_PAD, viewportW - popW - VIEWPORT_PAD);

    setCoords({
      top,
      left,
      placement,
      arrowLeft: clamp(anchorCenterX - left, 16, popW - 16),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open || !renderPop) return undefined;

    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => reposition());
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, renderPop, mobile, reposition, text]);

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
      if (btnRef.current?.contains(target) || popRef.current?.contains(target)) return;
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

  const popMotion = reducedMotion
    ? {
        initial: false as const,
        animate: coords ? { opacity: 1 } : { opacity: 0 },
        exit: { opacity: 0 },
      }
    : {
        initial: coords ? { opacity: 0, y: 8, scale: 0.97 } : false,
        animate: coords ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0 },
        exit: { opacity: 0, y: 5, scale: 0.98 },
        transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
      };

  const backdropMotion = reducedMotion
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.18 },
      };

  const portalContent =
    mounted && renderPop ? (
      <AnimatePresence onExitComplete={handleExitComplete}>
        {open && mobile ? (
          <motion.button
            key="backdrop"
            type="button"
            className="field-tip-backdrop"
            aria-hidden="true"
            tabIndex={-1}
            onClick={hide}
            {...backdropMotion}
          />
        ) : null}
        {open && renderPop ? (
          <motion.span
            key="popover"
            id={tipId}
            ref={popRef}
            role="tooltip"
            className={[
              'field-tip-pop',
              'field-tip-pop--fixed',
              mobile ? 'field-tip-pop--mobile' : '',
              coords?.placement === 'top' ? 'field-tip-pop--above' : 'field-tip-pop--below',
              coords ? '' : 'field-tip-pop--measuring',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              position: 'fixed',
              top: coords?.top ?? -9999,
              left: coords?.left ?? VIEWPORT_PAD,
              width: coords?.width,
              zIndex: 10050,
              maxWidth: `calc(100vw - ${VIEWPORT_PAD * 2}px)`,
              visibility: coords ? 'visible' : 'hidden',
              pointerEvents: coords ? 'auto' : 'none',
              ...(coords
                ? { ['--field-tip-arrow-left' as string]: `${coords.arrowLeft}px` }
                : {}),
            }}
            {...popMotion}
          >
            <span className="field-tip-pop-inner">{text}</span>
          </motion.span>
        ) : null}
      </AnimatePresence>
    ) : null;

  return (
    <span
      className="field-tip-wrap"
      onMouseEnter={hoverCapable ? scheduleShow : undefined}
      onMouseLeave={hoverCapable ? scheduleHide : undefined}
    >
      <button
        ref={btnRef}
        type="button"
        className={`field-tip-btn${open ? ' field-tip-btn--active' : ''}`}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onClick={toggleTouch}
        onPointerDown={(e) => e.stopPropagation()}
        onFocus={hoverCapable ? show : undefined}
        onBlur={hoverCapable ? scheduleHide : undefined}
      >
        <InfoIcon />
      </button>
      {mounted ? createPortal(portalContent, document.body) : null}
    </span>
  );
}
