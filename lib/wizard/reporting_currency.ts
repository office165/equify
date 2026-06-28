import type { ValuationLocale } from '../../api_client';
import {
  getCurrencyNameHebrew,
  getCurrencySymbol,
  normalizeCurrencyCode,
  type ReportingCurrencyCode,
} from '../utils/formatCurrency';

export type { ReportingCurrencyCode };
export { getCurrencyNameHebrew };

/** Input unit label shown in financial fields (e.g. ₪K, $K). */
export function formatCurrencyUnitLabel(currency: ReportingCurrencyCode | string): string {
  return `${getCurrencySymbol(currency)}K`;
}

/** Compact range label for sliders (500K ₪ vs $500K). */
export function formatCurrencyAmountLabel(
  compact: string,
  currency: ReportingCurrencyCode | string,
  locale: ValuationLocale = 'he',
): string {
  const code = normalizeCurrencyCode(currency);
  const sym = getCurrencySymbol(code);

  if (code === 'ILS') {
    return locale === 'he' ? `${compact} ${sym}` : `${sym}${compact}`;
  }

  return `${sym}${compact}`;
}

/** Replace legacy ₪ placeholders in static i18n copy with the active symbol. */
export function injectCurrencyIntoCopy(
  text: string,
  currency: ReportingCurrencyCode | string,
): string {
  const sym = getCurrencySymbol(currency);
  return text.replace(/₪K/g, `${sym}K`).replace(/₪/g, sym);
}
