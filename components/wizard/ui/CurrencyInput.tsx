'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { FinancialMonetaryFieldKey } from '../../../lib/validation/financial_field_validation';
import { validateFinancialMonetaryField } from '../../../lib/validation/financial_field_validation';
import { currencyFluidInputClasses, DEFAULT_CURRENCY_PLACEHOLDER } from './fluidInputTypography';
import { SmartFieldLabel } from './SmartFieldLabel';

const NIS_FORMATTER = new Intl.NumberFormat('he-IL', {
  maximumFractionDigits: 0,
});

/** Display formatter — grouped absolute shekels (he-IL). */
export function formatAbsoluteShekels(value: number | undefined | null): string {
  if (value == null || !Number.isFinite(value) || value === 0) return '';
  return NIS_FORMATTER.format(Math.round(value));
}

export interface CurrencyInputCoreProps {
  id: string;
  value: number | null;
  onChange: (value: number | null) => void;
  ariaLabel: string;
  allowNegative?: boolean;
  required?: boolean;
  autoFilledGlow?: boolean;
  error?: string | null;
  validationField?: FinancialMonetaryFieldKey;
  onBlurValidate?: () => void;
  placeholder?: string;
  /** When true, cleared input persists as null instead of 0. */
  emptyAsNull?: boolean;
}

function safeNumber(value: number | null): number {
  return value != null && Number.isFinite(value) ? value : 0;
}

function parseSignedDigits(raw: string, allowNegative: boolean): number {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '-') return 0;

  const normalized = trimmed.replace(/,/g, '').replace(/\s/g, '');
  if (allowNegative && /^-?\d+$/.test(normalized)) {
    return Number(normalized);
  }
  const digits = normalized.replace(/[^\d]/g, '');
  if (!digits) return 0;
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatWhileTyping(raw: string, allowNegative: boolean): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const negative = allowNegative && trimmed.startsWith('-');
  const digits = trimmed.replace(/[^\d]/g, '');
  if (!digits) return negative ? '-' : '';

  const grouped = NIS_FORMATTER.format(Number(digits));
  return negative ? `-${grouped}` : grouped;
}

function countDigitsBeforeCursor(text: string, cursor: number): number {
  let count = 0;
  for (let i = 0; i < Math.min(cursor, text.length); i += 1) {
    if (/\d/.test(text[i] ?? '')) count += 1;
  }
  return count;
}

function cursorAfterDigitCount(formatted: string, digitCount: number): number {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    if (/\d/.test(formatted[i] ?? '')) {
      seen += 1;
      if (seen >= digitCount) return i + 1;
    }
  }
  return formatted.length;
}

/**
 * Core currency control — raw absolute shekels in/out, grouped he-IL display while typing.
 * iOS: numeric keypad via inputMode + pattern; 16px base font prevents zoom.
 */
export function CurrencyInputCore({
  id,
  value,
  onChange,
  ariaLabel,
  allowNegative = false,
  autoFilledGlow = false,
  error,
  validationField,
  onBlurValidate,
  placeholder,
  emptyAsNull = false,
}: CurrencyInputCoreProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');

  const formatStored = useCallback(
    (v: number | null) => {
      if (v == null) return '';
      const n = safeNumber(v);
      if (n === 0 && emptyAsNull) return '';
      if (n === 0) return '';
      if (n < 0 && allowNegative) return `-${formatAbsoluteShekels(Math.abs(n))}`;
      return formatAbsoluteShekels(n);
    },
    [allowNegative, emptyAsNull],
  );

  useEffect(() => {
    if (!focused) setDraft(formatStored(value));
  }, [focused, formatStored, value]);

  const emitValue = useCallback(
    (parsed: number, formatted: string) => {
      if (emptyAsNull && parsed === 0 && formatted.replace(/[^\d]/g, '') === '') {
        onChange(null);
        return;
      }
      onChange(parsed);
    },
    [emptyAsNull, onChange],
  );

  const commitRaw = useCallback(
    (raw: string, selectionStart: number | null) => {
      const digitsBefore = countDigitsBeforeCursor(raw, selectionStart ?? raw.length);
      const formatted = formatWhileTyping(raw, allowNegative);
      const parsed = parseSignedDigits(formatted, allowNegative);
      setDraft(formatted);
      emitValue(parsed, formatted);

      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (!el || !focused) return;
        const nextCursor = cursorAfterDigitCount(formatted, digitsBefore);
        el.setSelectionRange(nextCursor, nextCursor);
      });
    },
    [allowNegative, emitValue, focused],
  );

  const handleBlur = useCallback(() => {
    setFocused(false);
    setDraft(formatStored(value));
    if (validationField) {
      onBlurValidate?.();
    }
  }, [formatStored, onBlurValidate, validationField, value]);

  const displayText = focused ? draft : formatStored(value);
  const hasError = Boolean(error);

  return (
    <div
      className={`si-control si-control--currency w-full min-w-0${focused ? ' is-editing' : ''}${autoFilledGlow ? ' si-control--autofill-glow' : ''}${hasError ? ' si-control--invalid' : ''}`}
    >
      <span
        className="si-prefix si-prefix--currency mono shrink-0 text-sm font-semibold leading-none"
        aria-hidden="true"
      >
        ₪
      </span>
      <input
        id={id}
        ref={inputRef}
        type="text"
        inputMode={allowNegative ? 'decimal' : 'numeric'}
        pattern={allowNegative ? undefined : '[0-9]*'}
        enterKeyHint="done"
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder ?? DEFAULT_CURRENCY_PLACEHOLDER}
        dir="rtl"
        lang="he"
        className={`si-input si-input--currency mono min-w-0 flex-1 overflow-visible whitespace-nowrap outline-none ${currencyFluidInputClasses(displayText)}`}
        value={displayText}
        aria-label={ariaLabel}
        aria-invalid={hasError || undefined}
        onFocus={() => {
          setFocused(true);
          setDraft(formatStored(value));
          requestAnimationFrame(() => inputRef.current?.select());
        }}
        onChange={(e) => commitRaw(e.target.value, e.target.selectionStart)}
        onPaste={(e) => {
          e.preventDefault();
          const pasted = e.clipboardData.getData('text');
          commitRaw(`${draft}${pasted}`, (draft + pasted).length);
        }}
        onBlur={handleBlur}
      />
    </div>
  );
}

export interface CurrencyInputProps {
  label: React.ReactNode;
  tooltip?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  ariaLabel?: string;
  required?: boolean;
  autoFilledGlow?: boolean;
  validationField?: FinancialMonetaryFieldKey;
  allowNegative?: boolean;
  className?: string;
  placeholder?: string;
  emptyAsNull?: boolean;
}

/** Labeled currency field with schema-aligned Hebrew blur validation. */
export function CurrencyInput({
  label,
  tooltip,
  value,
  onChange,
  ariaLabel,
  required,
  autoFilledGlow = false,
  validationField,
  allowNegative = false,
  className = '',
  placeholder,
  emptyAsNull = false,
}: CurrencyInputProps) {
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);

  const runValidation = useCallback(() => {
    if (!validationField) return;
    setError(validateFinancialMonetaryField(validationField, safeNumber(value)));
  }, [validationField, value]);

  return (
    <div className={`currency-input flex w-full min-w-0 flex-col gap-1.5${className ? ` ${className}` : ''}`}>
      <SmartFieldLabel
        tooltip={tooltip}
        required={required}
        htmlFor={inputId}
        className="w-full min-w-0 items-start !flex-wrap [&_label]:whitespace-normal [&_label]:break-words"
      >
        {label}
      </SmartFieldLabel>
      <CurrencyInputCore
        id={inputId}
        value={value}
        onChange={(next) => {
          onChange(next);
          if (error) setError(null);
        }}
        ariaLabel={ariaLabel ?? (typeof label === 'string' ? label : 'סכום בשקלים')}
        allowNegative={allowNegative}
        autoFilledGlow={autoFilledGlow}
        error={error}
        validationField={validationField}
        onBlurValidate={runValidation}
        placeholder={placeholder}
        emptyAsNull={emptyAsNull}
      />
      {error ? (
        <p className="si-field-error m-0 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
