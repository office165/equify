import type { ValuationLocale } from '../../api_client';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import { normalizeMultiplesAnalysis } from '../valuation/normalize_multiples_analysis';
import type { CanonicalReportValuation } from './canonical_report_valuation';
import { getWizardContext } from './wizard_context';
import { ebitdaMargin, formatMoney } from './formatters';
import { truncateWords } from './pdf_text_helpers';

/** Three one-line executive bullets: finding, risk, next step. */
export function buildExecutiveBullets(
  matrix: ForecastMatrixWithDiagnostics,
  locale: ValuationLocale,
  canonical?: CanonicalReportValuation,
): [string, string, string] {
  const currency = matrix.meta.currency || 'ILS';
  const wizard = getWizardContext(matrix);
  const margin = ebitdaMargin(matrix);
  const marginPct = margin > 0 ? (margin * 100).toFixed(0) : null;
  const equityFmt = formatMoney(
    canonical?.finalEquityValue ??
      matrix.scenarios?.base?.final_equity_value ??
      matrix.enterprise_value ??
      0,
    currency,
    locale,
  );
  const evFmt = formatMoney(
    canonical?.enterpriseValue ?? matrix.scenarios?.base?.enterprise_value ?? 0,
    currency,
    locale,
  );
  const waccPct = (matrix.assumptions.wacc * 100).toFixed(1);

  if (locale === 'he') {
    const finding = marginPct
      ? `ממצא מרכזי: שווי לבעלים ${equityFmt} (EV ${evFmt}), שולי EBITDA ${marginPct}%`
      : `ממצא מרכזי: שווי לבעלים ${equityFmt} (EV ${evFmt})`;
    const risk = wizard.customer_concentration_over_20
      ? `סיכון עיקרי: לקוח מוביל ${wizard.customer_concentration_pct}% מההכנסות`
      : `סיכון עיקרי: WACC ${waccPct}% מגביל את תקרת השווי`;
    const next = 'צעד מומלץ: עדכון תחזית תזרים לפני עסקה משמעותית';
    return [
      truncateWords(finding, 14),
      truncateWords(risk, 14),
      truncateWords(next, 14),
    ];
  }

  const finding = marginPct
    ? `Key finding: owner equity ${equityFmt} (EV ${evFmt}), EBITDA margin ${marginPct}%`
    : `Key finding: owner equity ${equityFmt} (EV ${evFmt})`;
  const risk = wizard.customer_concentration_over_20
    ? `Main risk: top customer ${wizard.customer_concentration_pct}% of revenue`
    : `Main risk: WACC ${waccPct}% caps valuation upside`;
  const next = 'Next step: refresh cash-flow forecast before major transactions';
  return [
    truncateWords(finding, 14),
    truncateWords(risk, 14),
    truncateWords(next, 14),
  ];
}

export function countIsraelMultiples(
  matrix: ForecastMatrixWithDiagnostics,
): number {
  const analysis = normalizeMultiplesAnalysis(matrix.multiples_analysis);
  if (!analysis) return 3;
  const ebitda =
    analysis.forwardEbitda > 0
      ? analysis.forwardEbitda
      : analysis.normalizedEbitda;
  const ebita = ebitda > 0 ? ebitda * 0.85 : 0;
  const ebit = matrix.diagnostics_inputs?.ebit ?? matrix.assumptions.adjusted_ebit;
  const tax = matrix.assumptions.effective_tax_rate ?? 0.23;
  const netIncome = Math.max(ebit * (1 - tax), 0);

  let count = 2;
  if (ebita > 0) count += 1;
  if (analysis.multiplesUsed.pe && netIncome > 0) count += 1;
  return count;
}
