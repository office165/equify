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
import { useValuationI18n } from '../../../valuation_i18n';
import { getEquifyWizardStepStrings } from '../../../lib/i18n/equify_wizard_steps';

export interface FieldTooltipProps {
  text: string;
  label?: string;
}

const VIEWPORT_PAD = 16;
const MOBILE_BREAKPOINT = 640;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT;
}

/** Tooltip [i] — tap-to-open on mobile, 44px target, viewport-safe positioning */
export function FieldTooltip({ text, label }: FieldTooltipProps) {
  const { locale } = useValuationI18n();
  const defaultLabel = getEquifyWizardStepStrings(locale).common.tooltipAria;
  const ariaLabel = label ?? defaultLabel;

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width?: number } | null>(
    null,
  );
  const tipId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setMounted(true);
    const syncMobile = () => setMobile(window.innerWidth < MOBILE_BREAKPOINT);
    syncMobile();
    window.addEventListener('resize', syncMobile);
    return () => window.removeEventListener('resize', syncMobile);
  }, []);

  const reposition = useCallback(() => {
    const btn = btnRef.current;
    const pop = popRef.current;
    if (!btn || !pop) return;

    const anchor = btn.getBoundingClientRect();
    const gap = 12;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const isMobile = viewportW < MOBILE_BREAKPOINT;
    const maxW = Math.min(isMobile ? viewportW - VIEWPORT_PAD * 2 : 300, viewportW - VIEWPORT_PAD * 2);

    pop.style.maxWidth = `${maxW}px`;
    pop.style.width = isMobile ? `${maxW}px` : 'max-content';

    const popW = pop.offsetWidth;
    const popH = pop.offsetHeight;

    if (isMobile) {
      const left = VIEWPORT_PAD;
      let top = anchor.bottom + gap;
      if (top + popH > viewportH - VIEWPORT_PAD) {
        top = Math.max(VIEWPORT_PAD, anchor.top - gap - popH);
      }
      setCoords({ top, left, width: maxW });
      return;
    }

    let left = anchor.left + anchor.width / 2 - popW / 2;
    left = clamp(left, VIEWPORT_PAD, viewportW - popW - VIEWPORT_PAD);

    let top = anchor.bottom + gap;
    if (top + popH > viewportH - VIEWPORT_PAD) {
      top = anchor.top - gap - popH;
    }
    top = clamp(top, VIEWPORT_PAD, viewportH - popH - VIEWPORT_PAD);

    setCoords({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => reposition());
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, mobile, reposition, text]);

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
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || popRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  const toggle = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen((v) => !v);
  }, []);

  const backdrop =
    open && mounted && mobile ? (
      <button
        type="button"
        className="field-tip-backdrop"
        aria-hidden="true"
        tabIndex={-1}
        onClick={() => setOpen(false)}
      />
    ) : null;

  const popover =
    open && mounted && coords ? (
      <span
        id={tipId}
        ref={popRef}
        role="tooltip"
        className={`field-tip-pop field-tip-pop--fixed${mobile ? ' field-tip-pop--mobile' : ''}`}
        style={{
          position: 'fixed',
          top: coords.top,
          left: coords.left,
          width: coords.width,
          zIndex: 10050,
          maxWidth: `calc(100vw - ${VIEWPORT_PAD * 2}px)`,
        }}
      >
        {text}
      </span>
    ) : null;

  return (
    <span className="field-tip-wrap">
      <button
        ref={btnRef}
        type="button"
        className="field-tip-btn"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onClick={toggle}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
      >
        i
      </button>
      {mounted ? createPortal(
        <>
          {backdrop}
          {popover}
        </>,
        document.body,
      ) : null}
    </span>
  );
}
