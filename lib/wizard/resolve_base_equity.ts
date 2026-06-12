import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';

/** שווי לבעלים (Equity) בתרחיש בסיס — עדיפות ל-final_equity_value מהמנוע. */
export function resolveBaseEquityValue(
  matrix: ForecastMatrixWithDiagnostics | null | undefined,
): number {
  const base = matrix?.scenarios?.base;
  if (!base) return 0;
  if (Number.isFinite(base.final_equity_value) && base.final_equity_value > 0) {
    return base.final_equity_value;
  }
  if (Number.isFinite(base.enterprise_value) && base.enterprise_value > 0) {
    return base.enterprise_value;
  }
  return 0;
}
