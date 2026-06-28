import type { ValuationLocale } from '../../api_client';
import {
  attachCurrencySymbol,
  getCurrencyNameHebrew,
  resolveActiveCurrency,
  type ActiveCurrencyProfile,
  type ReportingCurrencyCode,
} from '../utils/formatCurrency';

export type { ReportingCurrencyCode, ActiveCurrencyProfile };
export { getCurrencyNameHebrew, resolveActiveCurrency };

/** Input unit label shown in financial fields (e.g. ₪K, $K). */
export function formatCurrencyUnitLabel(
  currency: ReportingCurrencyCode | string | ActiveCurrencyProfile,
): string {
  const profile =
    typeof currency === 'string' ? resolveActiveCurrency(currency) : currency;
  if (profile.position === 'before') {
    return `${profile.symbol}K`;
  }
  return `${profile.symbol}K`;
}

/** Compact range label for sliders (500K ₪ vs $500K). */
export function formatCurrencyAmountLabel(
  compact: string,
  currency: ReportingCurrencyCode | string | ActiveCurrencyProfile,
  locale: ValuationLocale = 'he',
): string {
  const profile =
    typeof currency === 'string'
      ? resolveActiveCurrency(currency, locale)
      : currency;
  return attachCurrencySymbol(compact, profile);
}

/** Replace legacy ₪ placeholders in static i18n copy with the active symbol. */
export function injectCurrencyIntoCopy(
  text: string,
  currency: ReportingCurrencyCode | string | ActiveCurrencyProfile,
): string {
  const profile =
    typeof currency === 'string' ? resolveActiveCurrency(currency) : currency;
  return text.replace(/₪K/g, `${profile.symbol}K`).replace(/₪/g, profile.symbol);
}
