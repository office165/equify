import {
  attachCurrencySymbol,
  normalizeCurrencyCode,
  resolveActiveCurrency,
  type ReportingCurrencyCode,
} from '../utils/formatCurrency';

export type FormatLocale = 'he' | 'en';

export interface FormatCurrencyKOptions {
  locale: FormatLocale;
  style?: 'compact' | 'full';
  signDisplay?: 'auto' | 'always' | 'never';
  currency?: ReportingCurrencyCode;
}

export type NetDebtTone = 'negative' | 'positive' | 'neutral';

export interface NetDebtLineResult {
  labelHe: string;
  labelEn: string;
  /** Bidi-isolated display token — includes sign when applicable. */
  displayValue: string;
  tone: NetDebtTone;
}

const FSI = '\u2068';
const PDI = '\u2069';

/** Wrap numeric currency token so sign + digits stay LTR in Hebrew RTL flow. */
export function isolateBidiNumericToken(token: string): string {
  if (!token || token === '—') return '—';
  return `${FSI}${token}${PDI}`;
}

function resolveIntlLocale(locale: FormatLocale): string {
  return locale === 'he' ? 'he-IL' : 'en-US';
}

function compactCoreFromKNis(valueK: number, intlLocale: string): string {
  const nis = valueK * 1000;
  const abs = Math.abs(nis);

  if (abs >= 1_000_000_000) {
    const scaled = abs / 1_000_000_000;
    return `${new Intl.NumberFormat(intlLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(scaled)}B`;
  }
  if (abs >= 1_000_000) {
    const scaled = abs / 1_000_000;
    return `${new Intl.NumberFormat(intlLocale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(scaled)}M`;
  }
  if (abs >= 1_000) {
    const scaled = abs / 1_000;
    return `${new Intl.NumberFormat(intlLocale, {
      maximumFractionDigits: 0,
    }).format(scaled)}K`;
  }
  return new Intl.NumberFormat(intlLocale, {
    maximumFractionDigits: 0,
  }).format(abs);
}

function applySignDisplay(
  unsignedCore: string,
  valueK: number,
  signDisplay: NonNullable<FormatCurrencyKOptions['signDisplay']>,
): string {
  if (unsignedCore === '—') return '—';

  if (signDisplay === 'never') {
    return unsignedCore;
  }

  if (signDisplay === 'always') {
    if (valueK > 0) return `+${unsignedCore}`;
    if (valueK < 0) return `-${unsignedCore}`;
    return unsignedCore;
  }

  // auto — leading minus only when negative
  if (valueK < 0) return `-${unsignedCore}`;
  return unsignedCore;
}

/**
 * Format ₪K-scale amounts for live UI / PDF (valueK × 1000 = absolute NIS).
 * Sign, digits, scale suffix, and ₪ are one bidi-isolated LTR token.
 */
export function formatCurrencyK(
  valueK: number | null | undefined,
  opts: FormatCurrencyKOptions,
): string {
  if (valueK == null || !Number.isFinite(valueK)) return '—';

  const locale = opts.locale;
  const intlLocale = resolveIntlLocale(locale);
  const currency = normalizeCurrencyCode(opts.currency ?? 'ILS');
  const profile = resolveActiveCurrency(currency, locale);
  const signDisplay = opts.signDisplay ?? 'auto';
  const style = opts.style ?? 'compact';

  let signedCore: string;
  if (style === 'full') {
    const formatted = new Intl.NumberFormat(intlLocale, {
      maximumFractionDigits: 0,
    }).format(Math.abs(valueK * 1000));
    signedCore = applySignDisplay(formatted, valueK, signDisplay);
  } else {
    const unsigned = compactCoreFromKNis(Math.abs(valueK), intlLocale);
    signedCore = applySignDisplay(unsigned, valueK, signDisplay);
  }

  const withSymbol = attachCurrencySymbol(signedCore, profile);
  return isolateBidiNumericToken(withSymbol);
}

export function formatPercent(value: number, locale: FormatLocale): string {
  if (!Number.isFinite(value)) return '—';
  const formatted = new Intl.NumberFormat(resolveIntlLocale(locale), {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value / 100);
  return isolateBidiNumericToken(formatted);
}

function unwrapBidiToken(token: string): string {
  if (token === '—') return token;
  if (token.startsWith(FSI) && token.endsWith(PDI)) {
    return token.slice(1, -1);
  }
  return token;
}

/**
 * Net debt bridge semantics — single source for live UI and PDF waterfall.
 * @param netDebtK Gross debt minus cash (₪K); negative = net cash surplus.
 */
export function formatNetDebtLine(
  netDebtK: number,
  locale: FormatLocale = 'he',
  currency: ReportingCurrencyCode = 'ILS',
): NetDebtLineResult {
  if (netDebtK > 0) {
    const unsigned = formatCurrencyK(netDebtK, {
      locale,
      currency,
      signDisplay: 'never',
    });
    const inner = unwrapBidiToken(unsigned);
    return {
      labelHe: 'חוב נטו',
      labelEn: 'Net debt',
      displayValue: inner === '—' ? '—' : isolateBidiNumericToken(`-${inner}`),
      tone: 'negative',
    };
  }

  if (netDebtK < 0) {
    return {
      labelHe: 'עודף מזומנים נטו',
      labelEn: 'Net cash surplus',
      displayValue: formatCurrencyK(Math.abs(netDebtK), {
        locale,
        currency,
        signDisplay: 'always',
      }),
      tone: 'positive',
    };
  }

  return {
    labelHe: 'חוב נטו',
    labelEn: 'Net debt',
    displayValue: formatCurrencyK(0, { locale, currency, signDisplay: 'never' }),
    tone: 'neutral',
  };
}
