'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  clampAndSnap,
  clampFinancialK,
  FINANCIAL_INPUT_MAX_CHARS,
  formatDigitsWhileTyping,
  formatFinancialInputValue,
  parseFinancialInput,
  type FinancialInputUnit,
} from '../../../lib/utils/financial_input_parser';
import { fluidNumericInputClasses } from './fluidInputTypography';

export type SmartSliderUnit = FinancialInputUnit;

export interface SmartSliderProps {
  label: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: SmartSliderUnit;
  onChange: (value: number) => void;
  ariaLabel?: string;
  minLabel?: string;
  maxLabel?: string;
  fillClassName?: string;
  required?: boolean;
  /** Prefix symbol when unit is currency (₪K). */
  currencySymbol?: string;
}

function safeNumber(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

/** Hybrid slider + direct numeric input — local drag state, commit on release. */
export function SmartSlider({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  onChange,
  ariaLabel,
  minLabel,
  maxLabel,
  fillClassName,
  required,
  currencySymbol = '₪',
}: SmartSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const localValueRef = useRef(safeNumber(value, min));

  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [localValue, setLocalValue] = useState(() => safeNumber(value, min));

  useEffect(() => {
    if (dragging) return;
    const next = safeNumber(value, min);
    setLocalValue(next);
    localValueRef.current = next;
  }, [value, min, dragging]);

  useEffect(() => {
    if (!dragging) return undefined;

    const blockTouchScroll = (e: TouchEvent) => {
      e.preventDefault();
    };

    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.classList.add('equify-slider-dragging');
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.addEventListener('touchmove', blockTouchScroll, { passive: false });

    return () => {
      document.body.classList.remove('equify-slider-dragging');
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
      document.removeEventListener('touchmove', blockTouchScroll);
    };
  }, [dragging]);

  const pct = useCallback(
    (v: number) => ((safeNumber(v, min) - min) / (max - min)) * 100,
    [min, max],
  );

  const applyParsed = useCallback(
    (raw: string) => {
      const parsed = parseFinancialInput(raw, unit);
      if (parsed !== null && Number.isFinite(parsed)) {
        const normalized = unit === '₪K' ? clampFinancialK(parsed) : parsed;
        const next = clampAndSnap(normalized, min, max, step);
        localValueRef.current = next;
        setLocalValue(next);
        onChange(next);
      }
    },
    [max, min, onChange, step, unit],
  );

  const commitDraft = useCallback(() => {
    if (!draft.trim()) {
      setEditing(false);
      setDraft('');
      return;
    }
    applyParsed(draft);
    setEditing(false);
    setDraft('');
  }, [applyParsed, draft]);

  const getValFromPointer = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return localValueRef.current;
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return localValueRef.current;
      // Physical LTR: left edge = min, right edge = max (dir="ltr" on track).
      const raw = (clientX - rect.left) / rect.width;
      const clamped = Math.max(0, Math.min(1, raw));
      return clampAndSnap(min + clamped * (max - min), min, max, step);
    },
    [min, max, step],
  );

  const setLocalFromPointer = useCallback(
    (clientX: number) => {
      const next = getValFromPointer(clientX);
      localValueRef.current = next;
      setLocalValue(next);
    },
    [getValFromPointer],
  );

  const commitDragValue = useCallback(() => {
    onChange(localValueRef.current);
  }, [onChange]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
      setEditing(false);
      setDraft('');
      document.body.style.userSelect = 'none';
      setLocalFromPointer(e.clientX);
    },
    [setLocalFromPointer],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      e.preventDefault();
      setLocalFromPointer(e.clientX);
    },
    [setLocalFromPointer],
  );

  const endPointerDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      setDragging(false);
      document.body.style.userSelect = '';
      commitDragValue();
    },
    [commitDragValue],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? step : -step;
      const next = clampAndSnap(localValueRef.current + delta, min, max, step);
      if (next === localValueRef.current) return;
      localValueRef.current = next;
      setLocalValue(next);
      onChange(next);
    },
    [max, min, onChange, step],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let next = localValueRef.current;
      const bigStep = step * 10;

      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        next = clampAndSnap(localValueRef.current + step, min, max, step);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        next = clampAndSnap(localValueRef.current - step, min, max, step);
      } else if (e.key === 'PageUp') {
        next = clampAndSnap(localValueRef.current + bigStep, min, max, step);
      } else if (e.key === 'PageDown') {
        next = clampAndSnap(localValueRef.current - bigStep, min, max, step);
      } else if (e.key === 'Home') {
        next = min;
      } else if (e.key === 'End') {
        next = max;
      } else {
        return;
      }

      e.preventDefault();
      localValueRef.current = next;
      setLocalValue(next);
      onChange(next);
    },
    [max, min, onChange, step],
  );

  const handleInputFocus = useCallback(() => {
    setEditing(true);
    setDraft(formatFinancialInputValue(localValueRef.current, unit));
    requestAnimationFrame(() => inputRef.current?.select());
  }, [unit]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatDigitsWhileTyping(e.target.value);
      setEditing(true);
      setDraft(formatted);
      applyParsed(formatted);
    },
    [applyParsed],
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitDraft();
        inputRef.current?.blur();
      }
      if (e.key === 'Escape') {
        setEditing(false);
        setDraft('');
        inputRef.current?.blur();
      }
    },
    [commitDraft],
  );

  const p = pct(localValue);
  const trackStyle = { '--p': `${p}%`, '--thumb-p': `${p}%` } as React.CSSProperties;
  const idleValue = formatFinancialInputValue(localValue, unit);
  const displayText = editing ? draft : idleValue;
  const fluidClasses = fluidNumericInputClasses(displayText, '!text-right');

  return (
    <div className={`smart-num${dragging ? ' is-dragging' : ''}`}>
      <div className="sn-top">
        <label>
          {label}
          {required ? <span className="req"> *</span> : null}
        </label>
        <div className="sn-value-wrap w-full min-w-0">
          {unit === '₪K' && !editing ? (
            <span key={currencySymbol} className="sn-currency eq-currency-symbol" aria-hidden="true">
              {currencySymbol}
            </span>
          ) : null}
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            enterKeyHint="done"
            autoComplete="off"
            spellCheck={false}
            maxLength={unit === '₪K' ? FINANCIAL_INPUT_MAX_CHARS : undefined}
            dir="ltr"
            className={`sn-input mono w-full min-w-0 text-right text-base md:text-sm ${fluidClasses}${editing ? ' is-editing' : ''}`}
            value={displayText}
            onFocus={handleInputFocus}
            onChange={handleInputChange}
            onBlur={() => {
              if (editing) commitDraft();
            }}
            onKeyDown={handleInputKeyDown}
            aria-label={ariaLabel ? `${ariaLabel} — numeric input` : 'Numeric value'}
          />
          {unit === '%' && !editing ? (
            <span className="sn-suffix" aria-hidden="true">
              %
            </span>
          ) : null}
        </div>
      </div>
      <div className="sn-slider-ltr" dir="ltr">
        <div
          className={`sn-track${dragging ? ' is-dragging' : ''}`}
          ref={trackRef}
          style={trackStyle}
          dir="ltr"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPointerDrag}
          onPointerCancel={endPointerDrag}
          onWheel={handleWheel}
        >
          <div className={fillClassName ? `sn-fill ${fillClassName}` : 'sn-fill'} />
          <div
            className={`sn-thumb${dragging ? ' dragging' : ''}`}
            tabIndex={0}
            role="slider"
            aria-label={ariaLabel}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={localValue}
            onKeyDown={handleKeyDown}
          />
        </div>
        {(minLabel || maxLabel) && (
          <div className="sn-range">
            <span>{minLabel}</span>
            <span>{maxLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
