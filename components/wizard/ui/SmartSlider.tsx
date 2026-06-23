'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  clampAndSnap,
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
}

const ON_CHANGE_DEBOUNCE_MS = 80;

function safeNumber(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

/** Hybrid slider + direct numeric input — RTL track, pointer-capture drag, iOS-friendly keypad */
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
}: SmartSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingValueRef = useRef<number | null>(null);

  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [displayValue, setDisplayValue] = useState(() => safeNumber(value, min));

  useEffect(() => {
    if (!dragging) {
      setDisplayValue(safeNumber(value, min));
    }
  }, [value, min, dragging]);

  useEffect(
    () => () => {
      if (onChangeTimerRef.current) clearTimeout(onChangeTimerRef.current);
    },
    [],
  );

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

  const flushOnChange = useCallback(() => {
    if (onChangeTimerRef.current) {
      clearTimeout(onChangeTimerRef.current);
      onChangeTimerRef.current = null;
    }
    if (pendingValueRef.current !== null) {
      onChange(pendingValueRef.current);
      pendingValueRef.current = null;
    }
  }, [onChange]);

  const scheduleOnChange = useCallback(
    (v: number) => {
      pendingValueRef.current = v;
      if (onChangeTimerRef.current) clearTimeout(onChangeTimerRef.current);
      onChangeTimerRef.current = setTimeout(() => {
        onChangeTimerRef.current = null;
        if (pendingValueRef.current !== null) {
          onChange(pendingValueRef.current);
          pendingValueRef.current = null;
        }
      }, ON_CHANGE_DEBOUNCE_MS);
    },
    [onChange],
  );

  const applyParsed = useCallback(
    (raw: string) => {
      const parsed = parseFinancialInput(raw, unit);
      if (parsed !== null && Number.isFinite(parsed)) {
        const next = clampAndSnap(parsed, min, max, step);
        setDisplayValue(next);
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
      if (!track) return displayValue;
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return displayValue;
      const raw = (rect.right - clientX) / rect.width;
      const clamped = Math.max(0, Math.min(1, raw));
      return clampAndSnap(min + clamped * (max - min), min, max, step);
    },
    [displayValue, min, max, step],
  );

  const setValueFromPointer = useCallback(
    (clientX: number) => {
      const next = getValFromPointer(clientX);
      setDisplayValue(next);
      scheduleOnChange(next);
    },
    [getValFromPointer, scheduleOnChange],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
      setEditing(false);
      setDraft('');
      document.body.style.userSelect = 'none';
      setValueFromPointer(e.clientX);
    },
    [setValueFromPointer],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      e.preventDefault();
      setValueFromPointer(e.clientX);
    },
    [setValueFromPointer],
  );

  const endPointerDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      setDragging(false);
      document.body.style.userSelect = '';
      flushOnChange();
    },
    [flushOnChange],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? step : -step;
      const next = clampAndSnap(displayValue + delta, min, max, step);
      if (next === displayValue) return;
      setDisplayValue(next);
      onChange(next);
    },
    [displayValue, max, min, onChange, step],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let next = displayValue;
      const bigStep = step * 10;

      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        next = clampAndSnap(displayValue + step, min, max, step);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        next = clampAndSnap(displayValue - step, min, max, step);
      } else if (e.key === 'PageUp') {
        next = clampAndSnap(displayValue + bigStep, min, max, step);
      } else if (e.key === 'PageDown') {
        next = clampAndSnap(displayValue - bigStep, min, max, step);
      } else if (e.key === 'Home') {
        next = min;
      } else if (e.key === 'End') {
        next = max;
      } else {
        return;
      }

      e.preventDefault();
      setDisplayValue(next);
      onChange(next);
    },
    [displayValue, max, min, onChange, step],
  );

  const handleInputFocus = useCallback(() => {
    setEditing(true);
    setDraft(formatFinancialInputValue(displayValue, unit));
    requestAnimationFrame(() => inputRef.current?.select());
  }, [displayValue, unit]);

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

  const p = pct(displayValue);
  const trackStyle = { '--p': `${p}%` } as React.CSSProperties;
  const idleValue = formatFinancialInputValue(displayValue, unit);
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
            <span className="sn-currency" aria-hidden="true">
              ₪
            </span>
          ) : null}
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            enterKeyHint="done"
            autoComplete="off"
            spellCheck={false}
            dir="ltr"
            className={`sn-input mono w-full min-w-0 text-right ${fluidClasses}${editing ? ' is-editing' : ''}`}
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
      <div
        className={`sn-track${dragging ? ' is-dragging' : ''}`}
        ref={trackRef}
        style={trackStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointerDrag}
        onPointerCancel={endPointerDrag}
        onWheel={handleWheel}
      >
        <div className={fillClassName ? `sn-fill ${fillClassName}` : 'sn-fill'} />
        <div
          className={`sn-thumb${dragging ? ' dragging' : ''}`}
          style={{ insetInlineEnd: `${100 - p}%` }}
          tabIndex={0}
          role="slider"
          aria-label={ariaLabel}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={displayValue}
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
  );
}
