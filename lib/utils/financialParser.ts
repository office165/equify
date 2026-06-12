/**
 * Professional financial shorthand parsing (k / M / B suffixes).
 */

const CURRENCY_NOISE =
  /[₪$€£¥]|(?:\b(?:ILS|USD|EUR|GBP|NIS|NIS\.)\b)/gi;

const SHORTHAND_PATTERN = /^([+-]?\d*\.?\d+)([kmb])?$/i;

function stripFinancialNoise(raw: string): string {
  return raw
    .trim()
    .replace(/,/g, '')
    .replace(CURRENCY_NOISE, '')
    .replace(/\s+/g, '')
    .trim();
}

/**
 * Parse a financial input string into a numeric value.
 * Supports k/K (×1,000), m/M (×1,000,000), b/B (×1,000,000,000).
 * Returns NaN when the value cannot be parsed.
 */
export function parseFinancialInput(val: string): number {
  const cleaned = stripFinancialNoise(val);
  if (!cleaned) return NaN;

  const match = cleaned.match(SHORTHAND_PATTERN);
  if (!match) {
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
  }

  const base = Number(match[1]);
  if (!Number.isFinite(base)) return NaN;

  const suffix = (match[2] ?? '').toLowerCase();
  switch (suffix) {
    case 'k':
      return base * 1_000;
    case 'm':
      return base * 1_000_000;
    case 'b':
      return base * 1_000_000_000;
    default:
      return base;
  }
}

/** Normalize wizard field state to a raw numeric string for downstream engines. */
export function normalizeFinancialInputValue(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const parsed = parseFinancialInput(trimmed);
  if (!Number.isFinite(parsed)) return trimmed;
  return String(parsed);
}

export function formatFinancialExpanded(
  value: number,
  locale: 'en' | 'he' = 'en',
): string {
  return new Intl.NumberFormat(locale === 'he' ? 'he-IL' : 'en-US', {
    maximumFractionDigits: 2,
  }).format(value);
}

export function hasFinancialShorthand(raw: string): boolean {
  return /[kmb]\s*$/i.test(stripFinancialNoise(raw));
}
