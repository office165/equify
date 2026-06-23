/** Shared monetary formatting for Valubot UI, PDF, and notifications. */

export type CompactAmountUnit = 'B' | 'M' | 'K' | '';

/** K / M / B compact amount without currency symbol (absolute NIS in). */
export function formatCompactAmount(value: number): string {
  if (!Number.isFinite(value)) return '—';

  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1e9) {
    const scaled = abs / 1e9;
    const decimals = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
    return `${sign}${scaled.toFixed(decimals)}B`;
  }
  if (abs >= 1e6) {
    const scaled = abs / 1e6;
    const decimals = scaled >= 100 ? 0 : 1;
    return `${sign}${scaled.toFixed(decimals)}M`;
  }
  if (abs >= 1e3) {
    return `${sign}${(abs / 1e3).toFixed(0)}K`;
  }
  return `${sign}${Math.round(abs)}`;
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

export function formatILS(value: number, opts?: { short?: boolean }): string {
  if (!Number.isFinite(value)) return '—';

  if (opts?.short) {
    const compact = formatCompactAmount(value);
    if (/[BMK]$/.test(compact) || compact === '—') {
      return `₪ ${compact}`;
    }
    return `₪ ${value.toLocaleString('he-IL')}`;
  }

  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value);
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  ILS: '₪',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency.toUpperCase()] ?? '₪';
}

/** K / M / B shorthand for any supported ISO currency code. */
export function formatCurrencyShort(value: number, currency = 'ILS'): string {
  if (!Number.isFinite(value)) return '—';

  const code = currency.toUpperCase();
  if (code === 'ILS') return formatILS(value, { short: true });

  const sym = currencySymbol(code);
  const compact = formatCompactAmount(value);
  if (/[BMK]$/.test(compact) || compact === '—') {
    return `${sym} ${compact}`;
  }
  return `${sym} ${value.toLocaleString('he-IL', { maximumFractionDigits: 0 })}`;
}
