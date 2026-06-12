import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import type { MultiplesAnalysisSnapshot } from './engine';
import { getMedianMultiple } from './multiples';
import { normalizeMultiplesAnalysis } from './normalize_multiples_analysis';

export type MultipleStatus = 'in_range' | 'above' | 'below';

export interface MultipleComparisonCard {
  id: string;
  label: string;
  industryMedian: number;
  companyMultiple: number;
  status: MultipleStatus;
  impliedEv: number;
}

export interface MultiplesPanelSummary {
  cards: MultipleComparisonCard[];
  multiplesLow: number;
  multiplesHigh: number;
  multiplesBase: number;
  blendedValue: number;
  industryName: string;
}

function resolveStatus(
  companyMultiple: number,
  range: [number, number],
): MultipleStatus {
  const [low, high] = range;
  if (companyMultiple >= low && companyMultiple <= high) return 'in_range';
  if (companyMultiple > high) return 'above';
  return 'below';
}

function privateDiscount(): number {
  return 0.8;
}

function resolveNetIncome(matrix: ForecastMatrixWithDiagnostics): number {
  const inputs = matrix.diagnostics_inputs;
  const ebit = inputs?.ebit ?? matrix.assumptions.adjusted_ebit;
  const taxRate =
    inputs?.tax_rate ?? matrix.assumptions.effective_tax_rate ?? 0.23;
  return Math.max(ebit * (1 - taxRate), 0);
}

function pushEvCard(
  cards: MultipleComparisonCard[],
  id: string,
  label: string,
  metric: number,
  range: [number, number] | undefined,
  referenceEv: number,
): void {
  if (!range || metric <= 0) return;
  const median = getMedianMultiple(range);
  const companyMultiple = referenceEv / metric;
  cards.push({
    id,
    label,
    industryMedian: median,
    companyMultiple,
    status: resolveStatus(companyMultiple, range),
    impliedEv: metric * median * privateDiscount(),
  });
}

const EMPTY_PANEL_SUMMARY: MultiplesPanelSummary = {
  cards: [],
  multiplesLow: 0,
  multiplesHigh: 0,
  multiplesBase: 0,
  blendedValue: 0,
  industryName: 'כללי',
};

export interface MultiplesBlendWeights {
  dcf: number;
  mult: number;
}

export function buildMultiplesPanelData(
  analysis: MultiplesAnalysisSnapshot | unknown,
  matrix: ForecastMatrixWithDiagnostics,
  dcfBaseEv: number,
  equityValue: number,
  weights?: MultiplesBlendWeights,
): MultiplesPanelSummary {
  const normalized = normalizeMultiplesAnalysis(analysis);
  if (!normalized) {
    return EMPTY_PANEL_SUMMARY;
  }

  const revenue = matrix.assumptions?.base_revenue ?? 0;
  const ebitda =
    normalized.forwardEbitda > 0
      ? normalized.forwardEbitda
      : normalized.normalizedEbitda;
  const ebita = ebitda > 0 ? ebitda * 0.85 : 0;
  const netIncome = resolveNetIncome(matrix);
  const { multiplesUsed } = normalized;

  const cards: MultipleComparisonCard[] = [];

  pushEvCard(
    cards,
    'evEbitda',
    'EV/EBITDA',
    ebitda,
    multiplesUsed.evEbitda,
    dcfBaseEv,
  );

  if (ebita > 0) {
    pushEvCard(
      cards,
      'evEbita',
      'EV/EBITA',
      ebita,
      multiplesUsed.evEbita,
      dcfBaseEv,
    );
  }

  pushEvCard(
    cards,
    'evSales',
    'EV/Sales',
    revenue,
    multiplesUsed.evSales,
    dcfBaseEv,
  );

  if (multiplesUsed.pe && netIncome > 0) {
    const range = multiplesUsed.pe;
    const median = getMedianMultiple(range);
    const companyMultiple = equityValue / netIncome;
    cards.push({
      id: 'pe',
      label: 'P/E',
      industryMedian: median,
      companyMultiple,
      status: resolveStatus(companyMultiple, range),
      impliedEv: netIncome * median * privateDiscount(),
    });
  }

  const comparisonGroup = normalized.comparisonGroup ?? '';
  const industryName =
    matrix.wizard_context?.sector_label?.trim() ||
    comparisonGroup.split('·')[0]?.trim() ||
    'כללי';

  const { low, high, base } = normalized.valuationRange;
  const wDcf = weights?.dcf ?? 0.5;
  const wMult = weights?.mult ?? 0.5;
  const blendedValue = wDcf * dcfBaseEv + wMult * base;

  return {
    cards,
    multiplesLow: low,
    multiplesHigh: high,
    multiplesBase: base,
    blendedValue,
    industryName,
  };
}
