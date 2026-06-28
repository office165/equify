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

/** iOS zoom-safe base — 16px mobile, compact on md+ only. */
const MOBILE_NUMERIC_TYPO = 'text-base md:text-sm text-right tabular-nums tracking-tight';

/** Half-width grid columns (Step 2 revenue / EBITDA pairs). */
const COMPACT_NUMERIC_TYPO = `${MOBILE_NUMERIC_TYPO} font-medium`;

function currencyFieldBase(compact: boolean): string {
  return [
    '!m-0 !border-0 !bg-transparent',
    'min-w-0 w-full max-w-full flex-1 overflow-visible',
    compact ? COMPACT_NUMERIC_TYPO : MOBILE_NUMERIC_TYPO,
  ].join(' ');
}

/** Physical left inset — ₪ prefix sits absolute-left; never use logical inline padding here. */
const CURRENCY_PAD_LEFT = '!pl-11 md:!pl-12 lg:!pl-14';
/** Compact split-grid — minimal mobile pads; room for 16px long comma strings. */
const CURRENCY_PAD_LEFT_COMPACT = '!pl-9 sm:!pl-10 md:!pl-11';
const CURRENCY_PAD_RIGHT_COMPACT = '!pr-2 sm:!pr-3';
const CURRENCY_PAD_RIGHT_DEFAULT = '!pr-2 sm:!pr-4';

/**
 * Desktop-only downscale for very long values — never below 16px on mobile (iOS zoom rule).
 */
function currencyScaleClass(digits: number, compact: boolean): string {
  if (!compact) return '';
  if (digits >= 12) return 'md:!text-xs';
  if (digits >= 10) return 'md:!text-[13px]';
  if (digits >= 9) return 'md:!text-sm';
  return '';
}

export function currencyFluidInputClasses(
  displayText: string,
  isPlaceholderVisible = false,
  compact = false,
): string {
  const padLeft = compact ? CURRENCY_PAD_LEFT_COMPACT : CURRENCY_PAD_LEFT;

  if (isPlaceholderVisible) {
    const placeholderTypo = compact
      ? 'placeholder:!text-[11px] placeholder:leading-snug md:placeholder:!text-xs'
      : 'placeholder:text-xs md:placeholder:text-sm';

    return [
      currencyFieldBase(compact),
      '!py-3',
      padLeft,
      compact ? CURRENCY_PAD_RIGHT_COMPACT : CURRENCY_PAD_RIGHT_DEFAULT,
      placeholderTypo,
      'placeholder:text-right',
      'placeholder:tracking-normal',
      'placeholder:whitespace-nowrap',
    ].join(' ');
  }

  const digits = countInputDigits(displayText);
  const pr = compact
    ? CURRENCY_PAD_RIGHT_COMPACT
    : digits >= 9
      ? '!pr-2 sm:!pr-3'
      : CURRENCY_PAD_RIGHT_DEFAULT;
  const scale = currencyScaleClass(digits, compact);

  return [currencyFieldBase(compact), '!py-3', padLeft, pr, scale].filter(Boolean).join(' ');
}

/**
 * Non-currency numeric inputs (sliders, %) — 16px mobile, md+ compact.
 */
export function fluidNumericInputClasses(_displayText: string, extra = ''): string {
  return [
    'min-w-0 w-full max-w-full overflow-visible font-medium',
    MOBILE_NUMERIC_TYPO,
    '!pr-2 sm:!pr-3',
    extra,
  ]
    .filter(Boolean)
    .join(' ');
}
