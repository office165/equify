import type { ValuationLocale } from '../../api_client';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import { formatCurrency, formatCurrencyShort } from '../utils/formatCurrency';

/** ILS / currency shorthand for PDF tables (3.15M ₪, $3.15B, etc.). */
export function fmtILS(val: number): string {
  return formatCurrency(val, 'ILS', { short: true });
}

export function formatMoney(
  value: number,
  currency: string,
  _locale: ValuationLocale,
): string {
  const code = currency.length === 3 ? currency : 'ILS';
  return formatCurrency(value, code, { short: true });
}

export function formatPct(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatDate(iso: string | undefined, locale: ValuationLocale): string {
  const d = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

/** Institutional reference e.g. VAL-2026-X89 */
export function formatValuationRef(matrix: ForecastMatrixWithDiagnostics): string {
  const year = new Date(matrix.meta.generated_at ?? Date.now()).getFullYear();
  const raw = matrix.meta.valuation_id?.replace(/-/g, '') ?? 'X89MVP00';
  const suffix = raw.slice(0, 3).toUpperCase() || 'X89';
  return `VAL-${year}-${suffix}`;
}

export function scenarioValues(matrix: ForecastMatrixWithDiagnostics): {
  bear: number;
  base: number;
  bull: number;
} {
  const mid =
    matrix.scenarios?.base?.enterprise_value ??
    matrix.enterprise_value ??
    matrix.terminal_value.terminal_value;
  return {
    bear: matrix.scenarios?.bear?.enterprise_value ?? mid * 0.82,
    base: mid,
    bull: matrix.scenarios?.bull?.enterprise_value ?? mid * 1.18,
  };
}

export function equityValues(matrix: ForecastMatrixWithDiagnostics): {
  bear: number;
  base: number;
  bull: number;
} {
  const netDebt =
    matrix.wizard_context?.net_debt ??
    matrix.capital_structure.total_debt - matrix.capital_structure.cash_and_equivalents;
  const ev = scenarioValues(matrix);
  return {
    bear: matrix.scenarios?.bear?.final_equity_value ?? ev.bear - netDebt,
    base: matrix.scenarios?.base?.final_equity_value ?? ev.base - netDebt,
    bull: matrix.scenarios?.bull?.final_equity_value ?? ev.bull - netDebt,
  };
}

export function ebitdaMargin(matrix: ForecastMatrixWithDiagnostics): number {
  const rev = matrix.assumptions.base_revenue;
  const ebitda =
    matrix.diagnostics_inputs?.ebitda ??
    matrix.assumptions.adjusted_ebit / 0.85;
  return rev > 0 ? ebitda / rev : 0;
}
