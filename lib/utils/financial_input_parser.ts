export type FinancialInputUnit = '%' | '₪K' | '';

/** Max stored ₪K (~999 trillion NIS absolute at ×1000 display). */
export const FINANCIAL_MAX_K = 999_999_999_999;

/** Max absolute NIS shown in currency fields (= {@link FINANCIAL_MAX_K} × 1000). */
export const FINANCIAL_MAX_ABSOLUTE_NIS = FINANCIAL_MAX_K * 1000;

/** Integer digit cap while typing (12 corporate digits + headroom). */
export const FINANCIAL_INPUT_MAX_DIGITS = 15;

/** Input `maxLength` — 12 digits + grouping commas + sign. */
export const FINANCIAL_INPUT_MAX_CHARS = 18;

export function formatWithCommas(value: number, maxDecimals = 2): string {
  if (!Number.isFinite(value)) return '';
  if (maxDecimals === 0) {
    const rounded = Math.round(value);
    if (!Number.isFinite(rounded)) return '';
    const sign = rounded < 0 ? '-' : '';
    const digits = Math.abs(rounded).toString();
    return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  const fixed = value.toFixed(maxDecimals);
  const [intPart, decPart] = fixed.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (!decPart) return withCommas;
  const trimmedDec = decPart.replace(/0+$/, '');
  return trimmedDec ? `${withCommas}.${trimmedDec}` : withCommas;
}

function stripInput(raw: string): string {
  return raw.trim().replace(/[,\s₪$€]/g, '');
}

function countIntegerDigits(cleaned: string): number {
  const core = cleaned.replace(/^-/, '').split('.')[0] ?? '';
  return core.replace(/\D/g, '').length;
}

function limitTypedNumeric(normalized: string): string {
  if (!normalized) return normalized;

  const sign = normalized.startsWith('-') ? '-' : '';
  const unsigned = sign ? normalized.slice(1) : normalized;
  const [intPart, decPart] = unsigned.split('.');
  const limitedInt = (intPart ?? '').slice(0, FINANCIAL_INPUT_MAX_DIGITS);
  if (decPart === undefined) {
    return `${sign}${limitedInt}`;
  }
  return `${sign}${limitedInt}.${decPart.slice(0, 2)}`;
}

/**
 * Parse free-form financial text into slider value.
 * ₪K sliders store thousands; input shows absolute currency (×1000).
 */
export function parseFinancialInput(
  raw: string,
  unit: FinancialInputUnit,
): number | null {
  const cleaned = stripInput(raw);
  if (!cleaned) return null;

  const match = /^(-?[\d.]+)\s*([kmb%])?$/i.exec(cleaned);
  if (!match) return null;

  let num = parseFloat(match[1]);
  if (!Number.isFinite(num)) return null;

  const suffix = (match[2] ?? '').toLowerCase();

  if (unit === '%') {
    return suffix === '%' || !suffix ? num : null;
  }

  if (unit === '₪K') {
    if (suffix === 'b') return (num * 1_000_000_000) / 1000;
    if (suffix === 'm') return (num * 1_000_000) / 1000;
    if (suffix === 'k') return num;
    // Currency fields display absolute NIS — always convert to ₪K storage.
    return num / 1000;
  }

  if (suffix === 'k') return num * 1000;
  if (suffix === 'm') return num * 1_000_000;
  if (suffix === 'b') return num * 1_000_000_000;
  return num;
}

export function formatFinancialInputValue(value: number, unit: FinancialInputUnit): string {
  if (!Number.isFinite(value)) return '';
  if (unit === '₪K') return formatWithCommas(value * 1000, 0);
  if (unit === '%') return formatWithCommas(value, value % 1 === 0 ? 0 : 1);
  return formatWithCommas(value, 0);
}

export function clampFinancialK(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-FINANCIAL_MAX_K, Math.min(FINANCIAL_MAX_K, value));
}

export function clampAndSnap(value: number, min: number, max: number, step: number): number {
  const clamped = Math.max(min, Math.min(max, value));
  if (step <= 0) return clamped;
  const snapped = Math.round(clamped / step) * step;
  return Math.max(min, Math.min(max, snapped));
}

/** Live comma grouping while typing digits (preserves trailing decimal). */
export function formatDigitsWhileTyping(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const suffixMatch = /([kmb%])$/i.exec(trimmed);
  const suffix = suffixMatch?.[1] ?? '';
  const core = suffix ? trimmed.slice(0, -suffix.length) : trimmed;
  const normalized = limitTypedNumeric(core.replace(/,/g, ''));

  if (!/^-?[\d.]*$/.test(normalized)) return raw;

  const [intPart, decPart] = normalized.split('.');
  const sign = intPart.startsWith('-') ? '-' : '';
  const digits = intPart.replace('-', '');
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formatted = `${sign}${grouped}${decPart !== undefined ? `.${decPart}` : ''}`;
  return suffix ? `${formatted}${suffix}` : formatted;
}

/** Digit count helper for validation / typography (ignores grouping). */
export function countFinancialIntegerDigits(raw: string): number {
  return countIntegerDigits(stripInput(raw));
}
