/** Shared monetary formatting for Valubot UI, PDF, and notifications. */

export function formatILS(value: number, opts?: { short?: boolean }): string {
  if (!Number.isFinite(value)) return '—';

  if (opts?.short) {
    const abs = Math.abs(value);
    if (abs >= 1e9) return `₪ ${(value / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `₪ ${(value / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `₪ ${(value / 1e3).toFixed(0)}K`;
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
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${sym} ${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sym} ${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sym} ${(value / 1e3).toFixed(0)}K`;
  return `${sym} ${value.toLocaleString('he-IL', { maximumFractionDigits: 0 })}`;
}
