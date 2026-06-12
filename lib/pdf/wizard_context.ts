import type {
  ForecastMatrixWithDiagnostics,
  WizardContextSnapshot,
} from '../../valuation_forecast';
import {
  hasValidatedUserIdentifiers,
  type UserIdentifiersSnapshot,
} from '../validation/user_identifiers';

export { hasValidatedUserIdentifiers };
export type { UserIdentifiersSnapshot };

export function getWizardContext(
  matrix: ForecastMatrixWithDiagnostics,
): WizardContextSnapshot {
  if (matrix.wizard_context) {
    return matrix.wizard_context;
  }
  const debt = matrix.capital_structure.total_debt;
  const cash = matrix.capital_structure.cash_and_equivalents;
  return {
    qualitative_description: '',
    recurring_revenue_percent: 60,
    net_debt: debt - cash,
    customer_concentration_over_20: false,
    customer_concentration_pct: 25,
  };
}

export function defaultQualitativeNarrative(locale: 'en' | 'he'): string {
  return locale === 'he'
    ? 'המשתמש לא סיפק תיאור איכותני. מומלץ להשלים ניתוח מצב שוק, יתרון תחרותי ונכסים בלתי מוחשיים לשיפור דיוק ההערכה.'
    : 'No qualitative narrative was provided. Consider documenting market position, competitive moat, and intangible assets to improve valuation precision.';
}
