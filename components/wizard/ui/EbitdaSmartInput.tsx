'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  FINANCIAL_INPUT_MAX_CHARS,
  FINANCIAL_MAX_ABSOLUTE_NIS,
  formatDigitsWhileTyping,
  formatFinancialInputValue,
  formatWithCommas,
  parseFinancialInput,
} from '../../../lib/utils/financial_input_parser';
import { SmartFieldLabel } from './SmartFieldLabel';

export type EbitdaInputMode = 'amount' | 'percent';

export interface EbitdaSmartInputProps {
  label: string;
  tooltip?: string;
  /** EBITDA margin % — persisted in wizard state */
  marginPct: number;
  /** Annual revenue in ₪K */
  revenueK: number;
  onChangeMargin: (pct: number) => void;
  amountLabel: string;
  percentLabel: string;
  ariaLabel?: string;
  required?: boolean;
}

function ebitdaAbsoluteFromState(revenueK: number, marginPct: number): number {
  if (!Number.isFinite(revenueK) || revenueK <= 0) return 0;
  return revenueK * 1000 * (marginPct / 100);
}

function marginFromAbsolute(revenueK: number, absolute: number): number {
  if (!Number.isFinite(revenueK) || revenueK <= 0) return 0;
  return (absolute / (revenueK * 1000)) * 100;
}

/** EBITDA entry — toggle between absolute ₪ amount and % of revenue */
export function EbitdaSmartInput({
  label,
  tooltip,
  marginPct,
  revenueK,
  onChangeMargin,
  amountLabel,
  percentLabel,
  ariaLabel,
  required,
}: EbitdaSmartInputProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<EbitdaInputMode>('percent');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const formatDisplay = useCallback(() => {
    if (mode === 'percent') {
      return formatFinancialInputValue(marginPct, '%');
    }
    return formatWithCommas(ebitdaAbsoluteFromState(revenueK, marginPct), 0);
  }, [marginPct, mode, revenueK]);

  useEffect(() => {
    if (!editing) {
      setDraft(formatDisplay());
    }
  }, [editing, formatDisplay]);

  const commitRaw = useCallback(
    (raw: string) => {
      if (mode === 'percent') {
        const parsed = parseFinancialInput(raw, '%');
        if (parsed === null || !Number.isFinite(parsed)) return;
        onChangeMargin(Math.max(0, Math.min(100, parsed)));
        return;
      }

      const cleaned = raw.replace(/,/g, '').trim();
      const absolute = Math.min(FINANCIAL_MAX_ABSOLUTE_NIS, Number(cleaned.replace(/[^\d.-]/g, '')));
      if (!Number.isFinite(absolute)) return;
      onChangeMargin(marginFromAbsolute(revenueK, absolute));
    },
    [mode, onChangeMargin, revenueK],
  );

  const handleFocus = useCallback(() => {
    setEditing(true);
    setDraft(formatDisplay());
    requestAnimationFrame(() => inputRef.current?.select());
  }, [formatDisplay]);

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
    setDraft(formatDisplay());
  }, [formatDisplay]);

  const switchMode = useCallback(
    (next: EbitdaInputMode) => {
      setMode(next);
      setEditing(false);
    },
    [],
  );

  const displayText = editing ? draft : formatDisplay();

  return (
    <div className="smart-input smart-input--ebitda flex w-full min-w-0 max-w-full flex-col gap-2">
      <div className="si-ebitda-head flex w-full min-w-0 max-w-full flex-col gap-2">
        <SmartFieldLabel tooltip={tooltip} required={required} htmlFor={inputId}>
          {label}
        </SmartFieldLabel>
        <div
          className="si-mode-toggle shrink-0 self-start"
          role="group"
          aria-label={label}
        >
          <button
            type="button"
            className={`si-mode-btn${mode === 'amount' ? ' on' : ''}`}
            onClick={() => switchMode('amount')}
          >
            {amountLabel}
          </button>
          <button
            type="button"
            className={`si-mode-btn${mode === 'percent' ? ' on' : ''}`}
            onClick={() => switchMode('percent')}
          >
            {percentLabel}
          </button>
        </div>
      </div>

      <div className={`si-control w-full min-w-0 max-w-full${editing ? ' is-editing' : ''}`}>
        {mode === 'amount' ? (
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
          maxLength={mode === 'amount' ? FINANCIAL_INPUT_MAX_CHARS : undefined}
          className="si-input mono text-base md:text-sm"
          value={displayText}
          dir="ltr"
          aria-label={ariaLabel ?? label}
          onFocus={handleFocus}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        {mode === 'percent' ? (
          <span className="si-suffix mono" aria-hidden="true">
            %
          </span>
        ) : null}
      </div>
    </div>
  );
}
