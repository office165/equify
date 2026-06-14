export type FinancialInputUnit = '%' | '₪K' | '';
export function formatWithCommas(value: number, maxDecimals = 2): string {
  if (!Number.isFinite(value)) return '';
  const fixed =
    maxDecimals > 0 ? value.toFixed(maxDecimals) : String(Math.round(value));
  const [intPart, decPart] = fixed.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (!decPart) return withCommas;
  const trimmedDec = decPart.replace(/0+$/, '');
  return trimmedDec ? `${withCommas}.${trimmedDec}` : withCommas;
}

function stripInput(raw: string): string {
  return raw.trim().replace(/[,\s₪$€]/g, '');
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
    // Bare number: large values = absolute shekels; small = thousands
    if (Math.abs(num) >= 1000) return num / 1000;
    return num;
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
  const normalized = core.replace(/,/g, '');

  if (!/^-?[\d.]*$/.test(normalized)) return raw;

  const [intPart, decPart] = normalized.split('.');
  const sign = intPart.startsWith('-') ? '-' : '';
  const digits = intPart.replace('-', '');
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formatted = `${sign}${grouped}${decPart !== undefined ? `.${decPart}` : ''}`;
  return suffix ? `${formatted}${suffix}` : formatted;
}
