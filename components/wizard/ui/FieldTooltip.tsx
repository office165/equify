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

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Tooltip [i] — viewport-safe on mobile with collision-aware fixed positioning */
export function FieldTooltip({ text, label }: FieldTooltipProps) {
  const { locale } = useValuationI18n();
  const defaultLabel = getEquifyWizardStepStrings(locale).common.tooltipAria;
  const ariaLabel = label ?? defaultLabel;

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const tipId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const reposition = useCallback(() => {
    const btn = btnRef.current;
    const pop = popRef.current;
    if (!btn || !pop) return;

    const anchor = btn.getBoundingClientRect();
    const popW = pop.offsetWidth;
    const popH = pop.offsetHeight;
    const gap = 10;
    const maxW = Math.min(320, window.innerWidth - VIEWPORT_PAD * 2);

    pop.style.maxWidth = `${maxW}px`;

    let left = anchor.left + anchor.width / 2 - popW / 2;
    left = clamp(left, VIEWPORT_PAD, window.innerWidth - popW - VIEWPORT_PAD);

    let top = anchor.bottom + gap;
    if (top + popH > window.innerHeight - VIEWPORT_PAD) {
      top = anchor.top - gap - popH;
    }
    top = clamp(top, VIEWPORT_PAD, window.innerHeight - popH - VIEWPORT_PAD);

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
  }, [open, reposition, text]);

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

  const toggle = useCallback(() => setOpen((v) => !v), []);

  const popover =
    open && mounted && coords ? (
      <span
        id={tipId}
        ref={popRef}
        role="tooltip"
        className="field-tip-pop field-tip-pop--fixed"
        style={{
          position: 'fixed',
          top: coords.top,
          left: coords.left,
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
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
      >
        i
      </button>
      {popover ? createPortal(popover, document.body) : null}
    </span>
  );
}
