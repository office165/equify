'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  formatDigitsWhileTyping,
  formatFinancialInputValue,
  parseFinancialInput,
} from '../../../lib/utils/financial_input_parser';
import {
  currencyFluidInputClasses,
  fluidNumericInputClasses,
} from './fluidInputTypography';
import { SmartFieldLabel } from './SmartFieldLabel';

export type SmartInputVariant = 'currency' | 'percent';

export interface SmartInputProps {
  label: string;
  tooltip?: string;
  value: number;
  variant: SmartInputVariant;
  onChange: (value: number) => void;
  ariaLabel?: string;
  required?: boolean;
}

function safeNum(n: number, fallback = 0): number {
  return Number.isFinite(n) ? n : fallback;
}

/** Premium numeric field — raw NIS with live comma grouping (stored internally as ₪K). */
export function SmartInput({
  label,
  tooltip,
  value,
  variant,
  onChange,
  ariaLabel,
  required,
}: SmartInputProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const unit = variant === 'currency' ? '₪K' : '%';

  const formatStored = useCallback(
    (v: number) => formatFinancialInputValue(safeNum(v), unit),
    [unit],
  );

  useEffect(() => {
    if (!editing) {
      setDraft(formatStored(value));
    }
  }, [editing, formatStored, value]);

  const commitRaw = useCallback(
    (raw: string) => {
      const parsed = parseFinancialInput(raw, unit);
      if (parsed === null || !Number.isFinite(parsed)) return;
      onChange(parsed);
    },
    [onChange, unit],
  );

  const handleFocus = useCallback(() => {
    setEditing(true);
    const text = formatStored(value);
    setDraft(text);
    requestAnimationFrame(() => inputRef.current?.select());
  }, [formatStored, value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatDigitsWhileTyping(e.target.value);
      setEditing(true);
      setDraft(formatted);
      commitRaw(formatted);
    },
    [commitRaw],
  );

  const handleBlur = useCallback(() => {
    setEditing(false);
    setDraft(formatStored(value));
  }, [formatStored, value]);

  const displayText = editing ? draft : formatStored(value);
  const fluidClasses =
    variant === 'currency'
      ? currencyFluidInputClasses(displayText)
      : fluidNumericInputClasses(displayText, '!text-right !py-3 !px-4');

  return (
    <div className="smart-input flex w-full min-w-0 max-w-full flex-col gap-2">
      <SmartFieldLabel tooltip={tooltip} required={required} htmlFor={inputId}>
        {label}
      </SmartFieldLabel>

      <div
        className={[
          'si-control relative flex w-full min-w-0 max-w-full items-stretch',
          editing ? 'is-editing' : '',
          variant === 'currency' ? 'si-control--currency' : 'si-control--plain',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {variant === 'currency' ? (
          <span
            className="si-prefix mono pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 lg:left-3"
            aria-hidden="true"
          >
            ₪
          </span>
        ) : null}
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          inputMode="decimal"
          enterKeyHint="done"
          autoComplete="off"
          spellCheck={false}
          className={`si-input mono block w-full min-w-0 max-w-full text-right ${fluidClasses}`}
          value={displayText}
          dir="ltr"
          aria-label={ariaLabel ?? label}
          onFocus={handleFocus}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        {variant === 'percent' ? (
          <span className="si-suffix mono shrink-0" aria-hidden="true">
            %
          </span>
        ) : null}
      </div>
    </div>
  );
}
