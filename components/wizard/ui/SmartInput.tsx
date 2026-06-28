'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  clampFinancialK,
  FINANCIAL_INPUT_MAX_CHARS,
  formatDigitsWhileTyping,
  formatFinancialInputValue,
  parseFinancialInput,
} from '../../../lib/utils/financial_input_parser';
import {
  getCurrencySymbol,
  type ReportingCurrencyCode,
} from '../../../lib/utils/formatCurrency';
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
  onChange?: (value: number) => void;
  ariaLabel?: string;
  required?: boolean;
  placeholder?: string;
  /** When true, a stored value of 0 renders as an empty field (blank slate UX). */
  emptyWhenZero?: boolean;
  /** Computed / display-only — no manual entry. */
  readOnly?: boolean;
  /** Half-width grid columns — extra ₪ clearance + responsive placeholder scale. */
  density?: 'default' | 'compact';
  /** Validation error — red outline on control + optional message below. */
  invalid?: boolean;
  errorMessage?: string;
  /** Reporting currency for currency-variant prefix symbol. */
  currencyCode?: ReportingCurrencyCode;
}

function safeNum(n: number, fallback = 0): number {
  return Number.isFinite(n) ? n : fallback;
}

/** True when placeholder copy includes Hebrew (needs RTL bidi when field is empty). */
function placeholderNeedsRtl(text: string | undefined): boolean {
  return Boolean(text && /[\u0590-\u05FF]/.test(text));
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
  placeholder,
  emptyWhenZero = true,
  readOnly = false,
  density = 'default',
  invalid = false,
  errorMessage,
  currencyCode = 'ILS',
}: SmartInputProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const unit = variant === 'currency' ? '₪K' : '%';
  const currencySymbol = getCurrencySymbol(currencyCode);

  const formatStored = useCallback(
    (v: number) => {
      if (emptyWhenZero && safeNum(v) === 0) return '';
      return formatFinancialInputValue(safeNum(v), unit);
    },
    [emptyWhenZero, unit],
  );

  useEffect(() => {
    if (!editing) {
      setDraft(formatStored(value));
    }
  }, [editing, formatStored, value]);

  const commitRaw = useCallback(
    (raw: string) => {
      if (readOnly || !onChange) return;
      const cleaned = raw.trim();
      if (!cleaned) {
        onChange(0);
        return;
      }
      const parsed = parseFinancialInput(raw, unit);
      if (parsed === null || !Number.isFinite(parsed)) return;
      onChange(unit === '₪K' ? clampFinancialK(parsed) : parsed);
    },
    [onChange, readOnly, unit],
  );

  const handleFocus = useCallback(() => {
    if (readOnly) return;
    setEditing(true);
    const text = formatStored(value);
    setDraft(text);
    requestAnimationFrame(() => inputRef.current?.select());
  }, [formatStored, readOnly, value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (readOnly) return;
      const formatted = formatDigitsWhileTyping(e.target.value);
      setEditing(true);
      setDraft(formatted);
      commitRaw(formatted);
    },
    [commitRaw, readOnly],
  );

  const handleBlur = useCallback(() => {
    setEditing(false);
    setDraft(formatStored(value));
  }, [formatStored, value]);

  const displayText = editing ? draft : formatStored(value);
  const isPlaceholderVisible = !displayText && Boolean(placeholder);
  const hePlaceholder =
    isPlaceholderVisible && placeholderNeedsRtl(placeholder);
  const inputDir = hePlaceholder ? 'rtl' : 'ltr';
  const fluidClasses =
    variant === 'currency'
      ? currencyFluidInputClasses(displayText, isPlaceholderVisible, density === 'compact')
      : fluidNumericInputClasses(displayText, '!text-right !py-3 !px-2 sm:!px-4 placeholder:text-right placeholder:text-xs md:placeholder:text-sm');

  const inputTypographyClass = hePlaceholder ? 'si-input--he-placeholder' : 'mono';

  return (
    <div className="smart-input flex w-full min-w-0 max-w-full flex-col gap-2">
      <SmartFieldLabel tooltip={tooltip} required={required} htmlFor={inputId}>
        {label}
      </SmartFieldLabel>

      <div
        className={[
          'si-control relative flex w-full min-w-0 max-w-full items-stretch',
          editing ? 'is-editing' : '',
          readOnly ? 'si-control--readonly' : '',
          invalid ? 'si-control--invalid' : '',
          isPlaceholderVisible ? 'si-control--placeholder' : '',
          density === 'compact' ? 'si-control--compact' : '',
          hePlaceholder ? 'si-control--he-placeholder' : '',
          variant === 'currency' ? 'si-control--currency' : 'si-control--plain',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {variant === 'currency' ? (
          <span
            key={currencyCode}
            className="si-prefix mono eq-currency-symbol pointer-events-none absolute left-3 top-1/2 z-[2] -translate-y-1/2 select-none"
            aria-hidden="true"
          >
            {currencySymbol}
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
          maxLength={variant === 'currency' ? FINANCIAL_INPUT_MAX_CHARS : undefined}
          placeholder={placeholder}
          readOnly={readOnly}
          tabIndex={readOnly ? -1 : undefined}
          aria-readonly={readOnly || undefined}
          aria-invalid={invalid || undefined}
          className={[
            'si-input',
            inputTypographyClass,
            'block w-full min-w-0 max-w-full overflow-visible text-right text-base md:text-sm',
            'placeholder:text-teal-700/50',
            density === 'compact' ? 'font-medium' : '',
            fluidClasses,
          ]
            .filter(Boolean)
            .join(' ')}
          value={displayText}
          dir={inputDir}
          lang={inputDir === 'rtl' ? 'he' : undefined}
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
      {errorMessage ? (
        <span className="v-msg err show" role="alert">
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
}
