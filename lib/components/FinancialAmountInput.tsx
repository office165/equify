'use client';

import React, { useMemo } from 'react';
import {
  formatFinancialExpanded,
  hasFinancialShorthand,
  normalizeFinancialInputValue,
  parseFinancialInput,
} from '../utils/financialParser';
import type { ValuationLocale } from '../../api_client';

export interface FinancialAmountInputProps {
  id: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
  labelId?: string;
  required?: boolean;
  invalid?: boolean;
  errorId?: string;
  autoComplete?: string;
  expandedLabel: string;
  locale: ValuationLocale;
  className?: string;
}

function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function FinancialAmountInput({
  id,
  name,
  value,
  onChange,
  placeholder = '0',
  ariaLabel,
  labelId,
  required,
  invalid,
  errorId,
  autoComplete,
  expandedLabel,
  locale,
  className,
}: FinancialAmountInputProps) {
  const describedBy = [errorId, `${id}-expanded`].filter(Boolean).join(' ') || undefined;

  const parsed = useMemo(() => {
    if (!value.trim()) return null;
    const n = parseFinancialInput(value);
    return Number.isFinite(n) ? n : null;
  }, [value]);

  const showExpanded =
    parsed !== null &&
    value.trim() !== '' &&
    (hasFinancialShorthand(value) ||
      value.includes(',') ||
      /[₪$€£]/.test(value) ||
      value.trim() !== String(parsed));

  const handleBlur = () => {
    if (!value.trim()) return;
    const normalized = normalizeFinancialInputValue(value);
    if (normalized !== value) {
      onChange(normalized);
    }
  };

  return (
    <div className={cn('space-y-1', className)}>
      <input
        id={id}
        name={name ?? id}
        type="text"
        inputMode="decimal"
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-labelledby={labelId}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="w-full rounded-xl border border-slate-700/80 bg-slate-800/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 shadow-inner shadow-black/20 transition focus:border-mint-400/60 focus:bg-slate-800/90 focus:outline-none focus:ring-2 focus:ring-mint-400/30"
      />
      {showExpanded && parsed !== null && (
        <p
          id={`${id}-expanded`}
          className="text-[11px] text-mint-400/80"
          aria-live="polite"
        >
          {expandedLabel.replace(
            '{amount}',
            formatFinancialExpanded(parsed, locale),
          )}
        </p>
      )}
    </div>
  );
}
