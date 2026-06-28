import type { ValuationLocale } from '../../api_client';
import { getCurrencySymbol, type ReportingCurrencyCode } from '../../lib/utils/formatCurrency';
import type { EquifyWizardFinancials } from './map_equify_wizard';

function safeK(value: number | undefined | null): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export type Step2RequiredFieldKey = 'y2026Revenue' | 'y2026Ebitda';

/** Field-level flags for Step 2 required 2026 revenue + EBITDA. */
export function getStep2RequiredFieldErrors(
  financials: EquifyWizardFinancials,
): Record<Step2RequiredFieldKey, boolean> {
  return {
    y2026Revenue: safeK(financials.y2026?.revenueK) <= 0,
    y2026Ebitda: safeK(financials.y2026?.ebitdaK) <= 0,
  };
}

/** True once current-year revenue and EBITDA are both entered (Step 2 gate + live panel). */
export function hasMeaningfulFinancialInputs(
  financials: EquifyWizardFinancials,
): boolean {
  const errors = getStep2RequiredFieldErrors(financials);
  return !errors.y2026Revenue && !errors.y2026Ebitda;
}

/** Step 2 → 3 progression guard. */
export function canProceedFromStep2(financials: EquifyWizardFinancials): boolean {
  return hasMeaningfulFinancialInputs(financials);
}

/** Dashed live-panel amount before the user enters financials. */
export function formatLiveAmountEmpty(
  locale: ValuationLocale = 'he',
  currency: ReportingCurrencyCode = 'ILS',
): string {
  const sym = getCurrencySymbol(currency);
  if (currency === 'ILS') {
    return locale === 'he' ? `--- ${sym}` : `${sym}---`;
  }
  return `${sym}---`;
}
