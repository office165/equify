'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  formatDigitsWhileTyping,
  formatFinancialInputValue,
  formatWithCommas,
  parseFinancialInput,
} from '../../../lib/utils/financial_input_parser';
import { useEquifyStrings } from '../../../lib/i18n/use_equify_strings';
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
  /** K / M quick-scale pills (currency only) */
  showMultipliers?: boolean;
}

function safeNum(n: number, fallback = 0): number {
  return Number.isFinite(n) ? n : fallback;
}

/** Premium numeric field — comma formatting, select-all on focus, optional K/M scale */
export function SmartInput({
  label,
  tooltip,
  value,
  variant,
  onChange,
  ariaLabel,
  required,
  showMultipliers = variant === 'currency',
}: SmartInputProps) {
  const { steps } = useEquifyStrings();
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

  const applyMultiplier = useCallback(
    (factor: 1_000 | 1_000_000) => {
      const raw = editing ? draft : formatStored(value);
      const cleaned = raw.replace(/,/g, '').trim();
      const base = parseFloat(cleaned);
      if (!Number.isFinite(base) || base === 0) return;

      const absolute = base * factor;
      const nextK = absolute / 1000;
      onChange(nextK);
      const formatted = formatWithCommas(absolute, 0);
      setDraft(formatted);
      setEditing(true);
      requestAnimationFrame(() => inputRef.current?.select());
    },
    [draft, editing, formatStored, onChange, value],
  );

  const displayText = editing ? draft : formatStored(value);

  return (
    <div className="smart-input flex w-full min-w-0 max-w-full flex-col gap-2">
      <SmartFieldLabel tooltip={tooltip} required={required} htmlFor={inputId}>
        {label}
      </SmartFieldLabel>

      <div className={`si-control w-full min-w-0 max-w-full${editing ? ' is-editing' : ''}`}>
        {variant === 'currency' ? (
          <span className="si-prefix mono" aria-hidden="true">
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
          className="si-input mono"
          value={displayText}
          dir="ltr"
          aria-label={ariaLabel ?? label}
          onFocus={handleFocus}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        {variant === 'percent' ? (
          <span className="si-suffix mono" aria-hidden="true">
            %
          </span>
        ) : null}
      </div>

      {showMultipliers ? (
        <div
          className="si-mults flex w-full min-w-0 max-w-full flex-row flex-wrap justify-end gap-2"
          role="group"
          aria-label={steps.common.scaleMultiplierGroup}
        >
          <button
            type="button"
            className="si-mult-pill"
            onClick={() => applyMultiplier(1_000)}
          >
            {steps.common.scaleThousands}
          </button>
          <button
            type="button"
            className="si-mult-pill"
            onClick={() => applyMultiplier(1_000_000)}
          >
            {steps.common.scaleMillions}
          </button>
        </div>
      ) : null}
    </div>
  );
}
