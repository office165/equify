/** Print-safe formatting — thousands separators, consistent ₪, no raw zeros */

export function escHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Decode pre-escaped hints so we only escape once at render */
export function normalizeHintText(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"');
}

export function isMeaningfulNumber(
  value: number | null | undefined,
  opts: { allowZero?: boolean } = {},
): value is number {
  if (value == null || !Number.isFinite(value)) return false;
  if (!opts.allowZero && Math.abs(value) < 1e-9) return false;
  return true;
}

export function fmtMoneyILS(value: number | null | undefined): string {
  if (!isMeaningfulNumber(value, { allowZero: true })) return '—';
  const formatted = new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value);
  return formatted.replace(/\u00a0/g, ' ');
}

/** Compact ₪ for blend breakdown lines (e.g. ₪328.1M). */
export function fmtMoneyCompact(value: number | null | undefined): string {
  if (!isMeaningfulNumber(value, { allowZero: true })) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `₪${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (abs >= 1_000_000) {
    return `₪${(value / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `₪${(value / 1_000).toFixed(0)}K`;
  }
  return fmtMoneyILS(value);
}

export function fmtPercent(
  value: number | null | undefined,
  opts: { decimals?: number; isRatio?: boolean } = {},
): string | null {
  if (!isMeaningfulNumber(value)) return null;
  const { decimals = 1, isRatio = false } = opts;
  const pct = isRatio ? value * 100 : value;
  if (Math.abs(pct) < 0.05) return null;
  return `${pct.toFixed(decimals)}%`;
}

export function fmtRatio(value: number | null | undefined, suffix = 'x'): string | null {
  if (!isMeaningfulNumber(value)) return null;
  return `${value.toFixed(2)}${suffix}`;
}

export function fmtMultiple(value: number | null | undefined): string {
  if (!isMeaningfulNumber(value)) return '—';
  return `${value.toFixed(1)}x`;
}

export function reportDateHe(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}
