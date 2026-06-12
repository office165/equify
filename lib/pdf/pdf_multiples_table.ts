import type { ValuationLocale } from '../../api_client';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import { buildMultiplesPanelData } from '../valuation/multiples_panel_data';
import { normalizeMultiplesAnalysis } from '../valuation/normalize_multiples_analysis';
import { equityValues, formatMoney, scenarioValues } from './formatters';

export interface PdfMultiplesRow {
  label: string;
  industryMedian: string;
  companyMultiple: string;
  impliedEv: string;
}

export function buildPdfMultiplesTable(
  matrix: ForecastMatrixWithDiagnostics,
  locale: ValuationLocale,
  currency: string,
): { rows: PdfMultiplesRow[]; averageEv: string } | null {
  const analysis = normalizeMultiplesAnalysis(matrix.multiples_analysis);
  if (!analysis) return null;

  const ev = scenarioValues(matrix);
  const equity = equityValues(matrix);
  const summary = buildMultiplesPanelData(
    analysis,
    matrix,
    ev.base,
    equity.base,
  );

  const rows: PdfMultiplesRow[] = summary.cards
    .filter((card) => card.id !== 'evEbita')
    .map((card) => ({
    label: card.label,
    industryMedian: `${card.industryMedian.toFixed(1)}x`,
    companyMultiple: `${card.companyMultiple.toFixed(1)}x`,
    impliedEv: formatMoney(card.impliedEv, currency, locale),
  }));

  return {
    rows,
    averageEv: formatMoney(analysis.valuationRange.base, currency, locale),
  };
}
