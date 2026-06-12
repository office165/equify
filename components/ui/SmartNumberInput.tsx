'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ValuationLocale } from '../../api_client';
import { FieldHelpTooltip } from './FieldHelpTooltip';

export type SmartNumberScale = 'units' | 'thousands' | 'millions' | 'billions';

export interface SmartNumberInputProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  required?: boolean;
  tooltip?: string;
  currency?: '₪' | '$' | '€';
  defaultScale?: SmartNumberScale;
  placeholder?: string;
  className?: string;
  /** Smaller layout without quick-pick chips (history fields). */
  compact?: boolean;
  id?: string;
  invalid?: boolean;
  errorId?: string;
  locale?: ValuationLocale;
  /** Dev logging identifier */
  fieldName?: string;
  /** Called when user presses Enter in the amount field */
  onConfirm?: () => void;
  autoFocus?: boolean;
}

const SCALE_MULTIPLIER: Record<SmartNumberScale, number> = {
  units: 1,
  thousands: 1_000,
  millions: 1_000_000,
  billions: 1_000_000_000,
};

const SCALE_ORDER: SmartNumberScale[] = [
  'thousands',
  'millions',
  'billions',
  'units',
];

const COPY = {
  he: {
    scaleAria: 'בחירת יחידת קנה מידה',
    chipsAria: 'ערכים מהירים',
    tooltipAria: (label: string) => `מידע על ${label}`,
    scales: {
      thousands: { primary: 'אלפים', sub: '100K, 500K...' },
      millions: { primary: 'מיליון', sub: '1M, 5M, 10M...' },
      billions: { primary: 'מיליארד', sub: '0.1B, 0.5B, 1B...' },
      units: { primary: '₪ מדויק', sub: 'כולל אגורות' },
    },
    badges: {
      1_000: 'אלפי ₪',
      1_000_000: 'מיליון ₪',
      1_000_000_000: 'מיליארד ₪',
      1: '₪',
    } as Record<number, string>,
    previewPrefix: '= ',
    previewSuffix: (formatted: string) => `${formatted} ₪`,
  },
  en: {
    scaleAria: 'Select amount scale',
    chipsAria: 'Quick amounts',
    tooltipAria: (label: string) => `About ${label}`,
    scales: {
      thousands: { primary: 'Thousands', sub: '100K, 500K...' },
      millions: { primary: 'Millions', sub: '1M, 5M, 10M...' },
      billions: { primary: 'Billions', sub: '0.1B, 0.5B, 1B...' },
      units: { primary: 'Exact ₪', sub: 'Precise amount' },
    },
    badges: {
      1_000: '₪ K',
      1_000_000: '₪ M',
      1_000_000_000: '₪ B',
      1: '₪',
    } as Record<number, string>,
    previewPrefix: '= ',
    previewSuffix: (formatted: string) => `₪ ${formatted}`,
  },
} as const;

const QUICK_CHIPS: Record<
  Exclude<SmartNumberScale, 'units'>,
  { label: string; displayValue: number }[]
> = {
  thousands: [
    { label: '50K', displayValue: 50 },
    { label: '100K', displayValue: 100 },
    { label: '250K', displayValue: 250 },
    { label: '500K', displayValue: 500 },
    { label: '750K', displayValue: 750 },
    { label: '1M', displayValue: 1_000 },
  ],
  millions: [
    { label: '1M', displayValue: 1 },
    { label: '2M', displayValue: 2 },
    { label: '5M', displayValue: 5 },
    { label: '10M', displayValue: 10 },
    { label: '25M', displayValue: 25 },
    { label: '50M', displayValue: 50 },
  ],
  billions: [
    { label: '0.1B', displayValue: 0.1 },
    { label: '0.25B', displayValue: 0.25 },
    { label: '0.5B', displayValue: 0.5 },
    { label: '1B', displayValue: 1 },
    { label: '2B', displayValue: 2 },
    { label: '5B', displayValue: 5 },
  ],
};

function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

function formatDisplayNumber(n: number): string {
  if (!Number.isFinite(n)) return '';
  const rounded = Math.round(n * 1e6) / 1e6;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '');
}

function parseDisplayText(raw: string): number | null {
  const trimmed = raw.trim().replace(/,/g, '');
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function pickScaleForAbsolute(
  absolute: number,
  fallback: SmartNumberScale,
): SmartNumberScale {
  const abs = Math.abs(absolute);
  if (abs >= 1_000_000_000) return 'billions';
  if (abs >= 1_000_000) return 'millions';
  if (abs >= 1_000) return 'thousands';
  return fallback;
}

function formatPreviewAmount(value: number, locale: ValuationLocale): string {
  return new Intl.NumberFormat(locale === 'he' ? 'he-IL' : 'en-US', {
    maximumFractionDigits: 0,
  }).format(value);
}

function scaleBadgeLabel(
  scale: SmartNumberScale,
  locale: ValuationLocale,
  currency: '₪' | '$' | '€',
): string {
  const mult = SCALE_MULTIPLIER[scale];
  const badge = COPY[locale].badges[mult];
  if (badge) return badge;
  return currency;
}

export function SmartNumberInput({
  label,
  value,
  onChange,
  required,
  tooltip,
  currency = '₪',
  defaultScale = 'millions',
  placeholder = '0',
  className,
  compact = false,
  id: idProp,
  invalid,
  errorId,
  locale = 'he',
  fieldName,
  onConfirm,
  autoFocus,
}: SmartNumberInputProps) {
  const autoId = useId();
  const inputId = idProp ?? `smart-num-${autoId}`;
  const previewId = `${inputId}-preview`;
  const tooltipId = tooltip ? `${inputId}-tooltip` : undefined;
  const t = COPY[locale];
  const isRtl = locale === 'he';

  const [scale, setScale] = useState<SmartNumberScale>(defaultScale);
  const [displayText, setDisplayText] = useState('');
  const lastExternalValue = useRef<number | null | undefined>(undefined);

  const multiplier = SCALE_MULTIPLIER[scale];
  const parsedDisplay = parseDisplayText(displayText);
  const absoluteValue =
    parsedDisplay === null ? null : parsedDisplay * multiplier;

  const syncFromExternalValue = useCallback(
    (external: number | null) => {
      if (external === null) {
        setDisplayText('');
        return;
      }
      const nextScale = pickScaleForAbsolute(external, defaultScale);
      setScale(nextScale);
      const display = external / SCALE_MULTIPLIER[nextScale];
      setDisplayText(formatDisplayNumber(display));
    },
    [defaultScale],
  );

  useEffect(() => {
    if (lastExternalValue.current === value) return;
    lastExternalValue.current = value;
    syncFromExternalValue(value);
  }, [value, syncFromExternalValue]);

  const emitAbsolute = useCallback(
    (display: string, activeScale: SmartNumberScale) => {
      const parsed = parseDisplayText(display);
      const mult = SCALE_MULTIPLIER[activeScale];
      const absolute = parsed === null ? null : parsed * mult;
      lastExternalValue.current = absolute;
      if (process.env.NODE_ENV === 'development' && fieldName) {
        console.log('[SmartInput]', fieldName, absolute);
      }
      onChange(absolute);
    },
    [fieldName, onChange],
  );

  const handleDisplayChange = (next: string) => {
    if (next !== '' && !/^[0-9]*\.?[0-9]*$/.test(next.replace(/,/g, ''))) {
      return;
    }
    setDisplayText(next);
    emitAbsolute(next, scale);
  };

  const handleScaleChange = (nextScale: SmartNumberScale) => {
    setScale(nextScale);
    emitAbsolute(displayText, nextScale);
  };

  const handleChipClick = (chipDisplay: number) => {
    const next = formatDisplayNumber(chipDisplay);
    setDisplayText(next);
    emitAbsolute(next, scale);
  };

  const isChipActive = (chipDisplay: number) =>
    parsedDisplay !== null && Math.abs(parsedDisplay - chipDisplay) < 1e-9;

  const describedBy =
    [errorId, previewId, tooltipId].filter(Boolean).join(' ') || undefined;

  const showChips = !compact && scale !== 'units';

  const previewLine =
    absoluteValue !== null
      ? `${t.previewPrefix}${t.previewSuffix(formatPreviewAmount(absoluteValue, locale))}`
      : '\u00A0';

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={cn('smart-input-shell space-y-2', className)}
    >
      {tooltip ? (
        <FieldHelpTooltip
          content={tooltip}
          helpAria={t.tooltipAria(label)}
          isRtl={isRtl}
          label={label}
        >
          <label
            htmlFor={inputId}
            className={cn(
              'min-w-0 text-xs font-medium uppercase tracking-wider text-slate-300',
              compact && 'text-[10px] normal-case',
            )}
          >
            {label}
            {required && <span className="me-0.5 text-[#00D4C8]">*</span>}
          </label>
        </FieldHelpTooltip>
      ) : (
        <label
          htmlFor={inputId}
          className={cn(
            'min-w-0 text-xs font-medium uppercase tracking-wider text-slate-300',
            compact && 'text-[10px] normal-case',
          )}
        >
          {label}
          {required && <span className="me-0.5 text-[#00D4C8]">*</span>}
        </label>
      )}

      <div
        className={cn(
          'rounded-2xl border bg-white/[0.03] p-3 transition focus-within:border-[#00bfa5]/50 focus-within:ring-2 focus-within:ring-[#00bfa5]/25',
          invalid ? 'border-rose-500/50' : 'border-white/10',
          compact && 'p-2',
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            enterKeyHint="done"
            autoComplete="off"
            autoFocus={autoFocus}
            value={displayText}
            onChange={(e) => handleDisplayChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && onConfirm) {
                e.preventDefault();
                onConfirm();
              }
            }}
            placeholder={placeholder}
            aria-required={required || undefined}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={cn(
              'number-display min-w-0 flex-1 border-0 bg-transparent font-semibold text-slate-50 outline-none placeholder:text-slate-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
              compact ? 'text-lg' : 'valubot-mono-figure',
              isRtl ? 'text-end' : 'text-start',
            )}
            style={{ fontSize: '16px' }}
          />
          <span
            className={cn(
              'shrink-0 rounded-lg bg-[#00bfa5]/15 px-2.5 py-1 text-xs font-semibold text-[#00D4C8]',
              compact && 'px-2 py-0.5 text-[10px]',
            )}
          >
            {scaleBadgeLabel(scale, locale, currency)}
          </span>
        </div>

        <div
          className={cn('scale-buttons-row mt-3', compact && 'mt-2')}
          role="group"
          aria-label={t.scaleAria}
        >
          {SCALE_ORDER.map((key) => {
            const active = scale === key;
            const btn = t.scales[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleScaleChange(key)}
                aria-pressed={active}
                className={cn(
                  'flex min-h-[52px] min-w-max flex-col items-center justify-center whitespace-nowrap rounded-xl px-3 py-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfa5]/50',
                  compact && 'min-h-[48px] px-3 py-2',
                  active
                    ? 'bg-[var(--brand-mint-1)] text-[var(--brand-ink)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.18),0_4px_14px_rgba(52,211,153,0.2)]'
                    : 'border border-white/10 bg-white/5 text-slate-300 hover:border-[#00bfa5]/30 hover:text-[#00D4C8]',
                )}
              >
                <span className="text-sm font-bold leading-tight">
                  {btn.primary}
                </span>
                <span
                  className={cn(
                    'mt-0.5 text-[10px] leading-tight',
                    active ? 'text-[#0b2c24]/75' : 'text-slate-500',
                  )}
                >
                  {btn.sub}
                </span>
              </button>
            );
          })}
        </div>

        {showChips && (
          <div
            className="quick-chips-row"
            role="group"
            aria-label={t.chipsAria}
          >
            {QUICK_CHIPS[scale as Exclude<SmartNumberScale, 'units'>].map(
              (chip) => {
                const active = isChipActive(chip.displayValue);
                return (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => handleChipClick(chip.displayValue)}
                    aria-pressed={active}
                    className={cn(
                      'quick-chip font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfa5]/40',
                      active
                        ? 'bg-[var(--brand-mint-1)] text-[var(--brand-ink)] shadow-[0_4px_14px_rgba(52,211,153,0.2)]'
                        : 'border border-white/10 bg-white/5 text-slate-300 hover:border-[#00bfa5]/35 hover:bg-[#00bfa5]/10 hover:text-[#00D4C8]',
                    )}
                  >
                    {chip.label}
                  </button>
                );
              },
            )}
          </div>
        )}
      </div>

      <p id={previewId} className="text-xs text-slate-500" aria-live="polite">
        {previewLine}
      </p>
    </div>
  );
}
