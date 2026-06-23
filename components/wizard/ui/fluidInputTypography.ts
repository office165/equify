/** Digit count for currency anti-truncation scaling (ignores commas/symbols). */
export function countInputDigits(text: string): number {
  return text.replace(/\D/g, '').length;
}

/** Visible character count for fluid font scaling (includes grouping commas). */
export function countInputDisplayLength(text: string): number {
  return text.trim().length;
}

/** Unified manual-entry placeholder for monetary fields. */
export const DEFAULT_CURRENCY_PLACEHOLDER = 'דוגמה: 0';

/** Shared numeric typography — tight tracking, RTL-safe right alignment. */
const NUMERIC_TYPO = 'tracking-tight text-sm lg:text-base text-right tabular-nums';

/** Currency field base — ₪ sits physical-left; digits grow leftward from minimal right pad. */
const CURRENCY_BASE = [
  '!m-0 !border-0 !bg-transparent',
  'min-w-0 w-full max-w-full flex-1 overflow-visible',
  'font-medium',
  NUMERIC_TYPO,
].join(' ');

/**
 * Currency inputs (Step 2 SmartInput) — fits up to 12 digits with grouping commas.
 * Left pad clears ₪; right pad kept minimal so the last digit is never clipped.
 */
export function currencyFluidInputClasses(displayText: string): string {
  const digits = countInputDigits(displayText);
  const pr = digits >= 9 ? '!pr-1' : '!pr-2';

  return `${CURRENCY_BASE} !py-3 !pl-7 lg:!pl-8 ${pr}`;
}

/**
 * Non-currency numeric inputs (sliders, %) — same typography contract as currency fields.
 */
export function fluidNumericInputClasses(_displayText: string, extra = ''): string {
  return [
    'min-w-0 w-full max-w-full overflow-visible font-medium',
    NUMERIC_TYPO,
    '!pr-1',
    extra,
  ]
    .filter(Boolean)
    .join(' ');
}
