/** Shared monetary formatting for Valubot UI, PDF, and notifications. */

export type CompactAmountUnit = 'B' | 'M' | 'K' | '';

export type ReportingCurrencyCode = 'ILS' | 'USD' | 'EUR';

export type CurrencySymbolPosition = 'before' | 'after';

export type UiLocale = 'he' | 'en';

/** Active reporting-currency token profile — shared by live UI and PDF export. */
export interface ActiveCurrencyProfile {
  symbol: string;
  code: ReportingCurrencyCode;
  position: CurrencySymbolPosition;
  locale: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  ILS: '₪',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

const ACTIVE_CURRENCY_BASE: Record<
  ReportingCurrencyCode,
  Omit<ActiveCurrencyProfile, 'code'>
> = {
  ILS: { symbol: '₪', position: 'after', locale: 'he-IL' },
  USD: { symbol: '$', position: 'before', locale: 'en-US' },
  EUR: { symbol: '€', position: 'before', locale: 'en-US' },
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

/** Build the active currency profile from ISO code + UI locale (wizard / PDF). */
export function resolveActiveCurrency(
  currency: string | undefined,
  uiLocale: UiLocale = 'he',
): ActiveCurrencyProfile {
  const code = normalizeCurrencyCode(currency);
  const base = ACTIVE_CURRENCY_BASE[code];
  return {
    code,
    symbol: base.symbol,
    position: base.position,
    locale: uiLocale === 'en' && code === 'ILS' ? 'en-US' : base.locale,
  };
}

export interface FormatCurrencyValueOptions {
  /** Use K/M/B compaction (default true). */
  short?: boolean;
  /** Force a scale suffix when value is below compact threshold. */
  compactUnit?: CompactAmountUnit;
}

/** Attach symbol per active profile — e.g. "$1.28M" vs "1.28M ₪". */
export function attachCurrencySymbol(
  amountCore: string,
  activeCurrency: ActiveCurrencyProfile,
): string {
  if (amountCore === '—' || !amountCore) return '—';
  if (activeCurrency.position === 'before') {
    return `${activeCurrency.symbol}${amountCore}`;
  }
  return `${amountCore} ${activeCurrency.symbol}`;
}

/**
 * Central monetary formatter — reads active token profile for symbol placement.
 * Does not convert amounts (display layer only).
 */
export function formatCurrencyValue(
  value: number,
  activeCurrency: ActiveCurrencyProfile,
  opts?: FormatCurrencyValueOptions,
): string {
  if (!Number.isFinite(value)) return '—';

  const useShort = opts?.short !== false;
  if (useShort) {
    const { amount, unit } = splitCompactAmount(value);
    const scale = unit || opts?.compactUnit || '';
    const core = scale ? `${amount}${scale}` : amount;
    return attachCurrencySymbol(core, activeCurrency);
  }

  const formatted = value.toLocaleString(activeCurrency.locale, {
    maximumFractionDigits: 0,
  });
  return attachCurrencySymbol(formatted, activeCurrency);
}

/** Chart/table axis unit — e.g. ₪M, $M, €M (English ILS: M ₪). */
export function formatReportMillionsUnitFromProfile(
  activeCurrency: ActiveCurrencyProfile,
  uiLocale: UiLocale = 'he',
): string {
  if (uiLocale === 'en' && activeCurrency.code === 'ILS') {
    return `M ${activeCurrency.symbol}`;
  }
  if (activeCurrency.position === 'before') {
    return `${activeCurrency.symbol}M`;
  }
  return `${activeCurrency.symbol}M`;
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
  locale: UiLocale = 'he',
): string {
  return formatReportMillionsUnitFromProfile(resolveActiveCurrency(currency, locale), locale);
}

/** Comps / sensitivity table header — e.g. EV (₪M) or EV ($M). */
export function formatReportEvHeader(
  currency: string,
  locale: UiLocale = 'he',
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
  currency: string | ActiveCurrencyProfile = 'ILS',
  uiLocale: UiLocale = 'he',
): string {
  if (compactAmount === '—') return '—';

  const profile =
    typeof currency === 'string' ? resolveActiveCurrency(currency, uiLocale) : currency;
  return attachCurrencySymbol(compactAmount, profile);
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
  uiLocale?: UiLocale;
}

/**
 * Format absolute monetary value with dynamic currency symbol placement.
 * Does not convert amounts — display layer only.
 */
export function formatCurrency(
  value: number,
  currency: string | ActiveCurrencyProfile = 'ILS',
  opts?: FormatCurrencyOptions,
): string {
  if (!Number.isFinite(value)) return '—';

  const uiLocale: UiLocale =
    opts?.uiLocale ?? (opts?.locale === 'en-US' ? 'en' : 'he');
  const profile =
    typeof currency === 'string'
      ? resolveActiveCurrency(currency, uiLocale)
      : currency;
  const useShort = opts?.short !== false;

  if (useShort) {
    const compact = formatCompactAmount(value);
    if (/[BMK]$/.test(compact) || compact === '—') {
      return formatCurrencyCompact(compact, profile);
    }
  }

  const formatted = value.toLocaleString(profile.locale, { maximumFractionDigits: 0 });
  return attachCurrencySymbol(formatted, profile);
}

/** ILS shorthand — delegates to {@link formatCurrency}. */
export function formatILS(value: number, opts?: { short?: boolean }): string {
  return formatCurrency(value, 'ILS', opts);
}

/** K / M / B shorthand for any supported ISO currency code. */
export function formatCurrencyShort(
  value: number,
  currency: string | ActiveCurrencyProfile = 'ILS',
  uiLocale: UiLocale = 'he',
): string {
  const profile =
    typeof currency === 'string' ? resolveActiveCurrency(currency, uiLocale) : currency;
  return formatCurrencyValue(value, profile, { short: true });
}

/** Split hero display parts aligned with {@link formatCurrencyValue}. */
export function formatCurrencyHeroParts(
  value: number,
  activeCurrency: ActiveCurrencyProfile,
): { prefix: string; suffix: string; amount: string } {
  const { amount, unit } = splitCompactAmount(value);
  const scale = unit || 'M';

  if (activeCurrency.position === 'before') {
    return { prefix: activeCurrency.symbol, suffix: scale, amount };
  }

  return { prefix: '', suffix: `${scale} ${activeCurrency.symbol}`, amount };
}
