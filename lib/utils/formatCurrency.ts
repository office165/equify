/** Shared monetary formatting for Valubot UI, PDF, and notifications. */

export type CompactAmountUnit = 'B' | 'M' | 'K' | '';

export type ReportingCurrencyCode = 'ILS' | 'USD' | 'EUR';

const CURRENCY_SYMBOLS: Record<string, string> = {
  ILS: '₪',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

/** Resolve display symbol for ISO currency code (defaults to ₪). */
export function getCurrencySymbol(currency: string): string {
  const code = (currency ?? 'ILS').toUpperCase();
  return CURRENCY_SYMBOLS[code] ?? '₪';
}

export function normalizeCurrencyCode(currency: string | undefined): ReportingCurrencyCode {
  const code = (currency ?? 'ILS').toUpperCase();
  if (code === 'USD' || code === 'EUR') return code;
  return 'ILS';
}

const CURRENCY_NAMES_HE: Record<ReportingCurrencyCode, string> = {
  ILS: 'ש״ח',
  USD: 'דולר ארה״ב',
  EUR: 'אירו',
};

/** Hebrew prose label for reporting currency (ILS → ש״ח, USD → דולר ארה״ב, EUR → אירו). */
export function getCurrencyNameHebrew(currencyCode: string): string {
  return CURRENCY_NAMES_HE[normalizeCurrencyCode(currencyCode)];
}

/** Chart/table axis unit — e.g. ₪M, $M, €M (English ILS: M ₪). */
export function formatReportMillionsUnit(
  currency: string,
  locale: 'he' | 'en' = 'he',
): string {
  const sym = getCurrencySymbol(currency);
  const code = normalizeCurrencyCode(currency);
  if (locale === 'en') {
    return code === 'ILS' ? `M ${sym}` : `${sym}M`;
  }
  return `${sym}M`;
}

/** Comps / sensitivity table header — e.g. EV (₪M) or EV ($M). */
export function formatReportEvHeader(
  currency: string,
  locale: 'he' | 'en' = 'he',
): string {
  return `EV (${formatReportMillionsUnit(currency, locale)})`;
}

/** Hebrew narrative amounts — e.g. 75.5M דולר ארה״ב (absolute NIS in). */
export function formatCurrencyNarrativeHe(
  value: number,
  currency: string = 'ILS',
): string {
  if (!Number.isFinite(value)) return '—';
  const { amount, unit } = splitCompactAmount(value);
  const compact = unit ? `${amount}${unit}` : formatCompactAmount(value);
  return `${compact} ${getCurrencyNameHebrew(currency)}`;
}

/** K / M / B compact amount without currency symbol (absolute NIS in). */
export function formatCompactAmount(value: number): string {
  if (!Number.isFinite(value)) return '—';

  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(2)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(0)}K`;
  }
  return `${sign}${Math.round(abs)}`;
}

/** Attach currency symbol to an already-compact amount string. */
export function formatCurrencyCompact(
  compactAmount: string,
  currency: string = 'ILS',
): string {
  if (compactAmount === '—') return '—';

  const sym = getCurrencySymbol(currency);
  const code = normalizeCurrencyCode(currency);

  // ILS — suffix (e.g. 3.15B ₪)
  if (code === 'ILS') {
    return `${compactAmount} ${sym}`;
  }

  // USD / EUR — prefix (e.g. $3.15B, €3.15B)
  return `${sym}${compactAmount}`;
}

/** Numeric portion of compact display (e.g. 3.15 for ₪3.15B) — for count-up animations. */
export function compactAmountNumber(value: number): number {
  if (!Number.isFinite(value)) return 0;

  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return abs / 1_000_000_000;
  if (abs >= 1_000_000) return abs / 1_000_000;
  if (abs >= 1_000) return abs / 1_000;
  return abs;
}

export function splitCompactAmount(value: number): {
  amount: string;
  unit: CompactAmountUnit;
} {
  const compact = formatCompactAmount(value);
  const match = /^(-?[\d.]+)([BMK])$/.exec(compact);
  if (match) {
    return { amount: match[1], unit: match[2] as CompactAmountUnit };
  }
  return { amount: compact, unit: '' };
}

export interface FormatCurrencyOptions {
  short?: boolean;
  locale?: string;
}

/**
 * Format absolute monetary value with dynamic currency symbol placement.
 * Does not convert amounts — display layer only.
 */
export function formatCurrency(
  value: number,
  currency: string = 'ILS',
  opts?: FormatCurrencyOptions,
): string {
  if (!Number.isFinite(value)) return '—';

  const code = normalizeCurrencyCode(currency);
  const useShort = opts?.short !== false;

  if (useShort) {
    const compact = formatCompactAmount(value);
    if (/[BMK]$/.test(compact) || compact === '—') {
      return formatCurrencyCompact(compact, code);
    }
  }

  const locale =
    opts?.locale ?? (code === 'ILS' ? 'he-IL' : 'en-US');
  const formatted = value.toLocaleString(locale, { maximumFractionDigits: 0 });
  return formatCurrencyCompact(formatted, code);
}

/** ILS shorthand — delegates to {@link formatCurrency}. */
export function formatILS(value: number, opts?: { short?: boolean }): string {
  return formatCurrency(value, 'ILS', opts);
}

/** K / M / B shorthand for any supported ISO currency code. */
export function formatCurrencyShort(value: number, currency = 'ILS'): string {
  return formatCurrency(value, currency, { short: true });
}
