import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import type { ForecastMatrixCapitalStructure } from '../../forecast_sample';
import {
  bridgeFromEnterpriseValue,
  type EquityBridgeMetrics,
} from './equity_bridge';
import {
  buildMultiplesPanelData,
  type MultiplesPanelSummary,
} from './multiples_panel_data';
import { normalizeMultiplesAnalysis } from './normalize_multiples_analysis';

export type ValuationScenario = 'bear' | 'base' | 'bull';

export interface CanonicalWeights {
  dcf: number;
  multiples: number;
  dampeningReason?: 'multiples_outlier_dampened';
}

export interface CanonicalValuation {
  scenario: 'base';
  ev_dcf: number;
  ev_dcf_by_scenario: Record<ValuationScenario, number>;
  ev_multiples_implied: {
    evSales?: number;
    evEbitda?: number;
    pe?: number;
  };
  weights: CanonicalWeights;
  ev_blended: number;
  ev_blended_by_scenario: Record<ValuationScenario, number>;
  net_debt: number;
  dlom_rate: number;
  dlom_amount: number;
  equity_value: number;
  equity_by_scenario: Record<ValuationScenario, number>;
  revenue_basis: { actual: number; forecast_y1: number };
  ebitda_basis: number;
  multiples_raw_low: number;
  multiples_raw_high: number;
  weightingLabelHe: string;
  weightingLabelEn: string;
}

export interface LiveScenarioSlice {
  enterprise_value: number;
  explicit_rows?: Array<{ revenue: number }>;
}

export interface LiveScenarios {
  bear: LiveScenarioSlice;
  base: LiveScenarioSlice & { explicit_rows: Array<{ revenue: number }> };
  bull: LiveScenarioSlice;
}

const COHERENCE_TOLERANCE = 1;

function median(values: number[]): number {
  const finite = values.filter((v) => Number.isFinite(v) && v > 0);
  if (finite.length === 0) return 0;
  const sorted = [...finite].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function resolveEbitda(matrix: ForecastMatrixWithDiagnostics): number {
  const normalized = normalizeMultiplesAnalysis(matrix.multiples_analysis);
  if (normalized) {
    return normalized.forwardEbitda > 0
      ? normalized.forwardEbitda
      : normalized.normalizedEbitda;
  }
  return matrix.assumptions.adjusted_ebit / 0.85;
}

function impliedFromCards(
  panel: MultiplesPanelSummary | null,
  rangeBase: number,
): number {
  const fromCards = (panel?.cards ?? []).map((c) => c.impliedEv);
  return median([...fromCards, rangeBase].filter((v) => v > 0));
}

/**
 * Smart weighting between DCF and multiples:
 * - Default 60% DCF / 40% multiples when EBITDA > 0 and multiples are not extreme vs DCF
 * - If multiplesMedian/evDcf > 2.5 or < 0.4, or EBITDA ≤ 0 → 80% DCF / 20% multiples
 * - If ratio > 4 or < 0.25 → 100% DCF / 0% multiples (record dampeningReason)
 */
export function computeSmartWeights(
  evDcf: number,
  multiplesMedian: number,
  ebitda: number,
): CanonicalWeights {
  const defaultWeights: CanonicalWeights = { dcf: 0.6, multiples: 0.4 };

  if (evDcf <= 0 || multiplesMedian <= 0) {
    return { dcf: 1, multiples: 0, dampeningReason: 'multiples_outlier_dampened' };
  }

  const ratio = multiplesMedian / evDcf;

  if (ratio > 4 || ratio < 0.25) {
    return { dcf: 1, multiples: 0, dampeningReason: 'multiples_outlier_dampened' };
  }

  if (ratio > 2.5 || ratio < 0.4 || ebitda <= 0) {
    return { dcf: 0.8, multiples: 0.2, dampeningReason: 'multiples_outlier_dampened' };
  }

  return defaultWeights;
}

export function formatWeightingLabelHe(weights: CanonicalWeights): string {
  const dcfPct = Math.round(weights.dcf * 100);
  const multPct = Math.round(weights.multiples * 100);
  if (weights.multiples === 0) {
    return `שקלול: ${dcfPct}% DCF בלבד (מכפילים הושקלו לאין)`;
  }
  return `שקלול: ${dcfPct}% DCF · ${multPct}% מכפילי שוק`;
}

function formatWeightingLabelEn(weights: CanonicalWeights): string {
  const dcfPct = Math.round(weights.dcf * 100);
  const multPct = Math.round(weights.multiples * 100);
  if (weights.multiples === 0) {
    return `Blend: ${dcfPct}% DCF only (multiples dampened)`;
  }
  return `Blend: ${dcfPct}% DCF · ${multPct}% market multiples`;
}

function extractImpliedEv(
  panel: MultiplesPanelSummary | null,
): CanonicalValuation['ev_multiples_implied'] {
  const out: CanonicalValuation['ev_multiples_implied'] = {};
  if (!panel) return out;
  for (const card of panel.cards) {
    if (card.id === 'evSales') out.evSales = card.impliedEv;
    if (card.id === 'evEbitda') out.evEbitda = card.impliedEv;
    if (card.id === 'pe') out.pe = card.impliedEv;
  }
  return out;
}

function blendEv(
  evDcf: number,
  multValue: number,
  weights: CanonicalWeights,
): number {
  return weights.dcf * evDcf + weights.multiples * multValue;
}

export function buildCanonicalValuation(
  matrix: ForecastMatrixWithDiagnostics,
  liveScenarios: LiveScenarios,
): CanonicalValuation {
  const capital = matrix.capital_structure;
  const wizardNetDebt = matrix.wizard_context?.net_debt;

  const ev_dcf_by_scenario: Record<ValuationScenario, number> = {
    bear: liveScenarios.bear.enterprise_value,
    base: liveScenarios.base.enterprise_value,
    bull: liveScenarios.bull.enterprise_value,
  };
  const ev_dcf = ev_dcf_by_scenario.base;

  const normalized = normalizeMultiplesAnalysis(matrix.multiples_analysis);
  const ebitda_basis = resolveEbitda(matrix);

  const bridgeForPe = bridgeFromEnterpriseValue(ev_dcf, capital, wizardNetDebt);
  const panel = normalized
    ? buildMultiplesPanelData(normalized, matrix, ev_dcf, bridgeForPe.finalEquityValue)
    : null;

  const rangeBase = normalized?.valuationRange.base ?? panel?.multiplesBase ?? 0;
  const rangeLow = normalized?.valuationRange.low ?? panel?.multiplesLow ?? 0;
  const rangeHigh = normalized?.valuationRange.high ?? panel?.multiplesHigh ?? 0;

  const multiplesMedian = impliedFromCards(panel, rangeBase);
  const weights = computeSmartWeights(ev_dcf, multiplesMedian, ebitda_basis);

  const ev_blended = blendEv(ev_dcf, multiplesMedian, weights);
  const ev_blended_by_scenario: Record<ValuationScenario, number> = {
    bear: blendEv(ev_dcf_by_scenario.bear, rangeLow, weights),
    base: ev_blended,
    bull: blendEv(ev_dcf_by_scenario.bull, rangeHigh, weights),
  };

  const equity_by_scenario = {} as Record<ValuationScenario, number>;
  for (const key of ['bear', 'base', 'bull'] as const) {
    equity_by_scenario[key] = bridgeFromEnterpriseValue(
      ev_blended_by_scenario[key],
      capital,
      wizardNetDebt,
    ).finalEquityValue;
  }

  const baseBridge = bridgeFromEnterpriseValue(
    ev_blended,
    capital,
    wizardNetDebt,
  );

  const forecast_y1 =
    liveScenarios.base.explicit_rows[0]?.revenue ??
    matrix.assumptions.base_revenue;

  return {
    scenario: 'base',
    ev_dcf,
    ev_dcf_by_scenario,
    ev_multiples_implied: extractImpliedEv(panel),
    weights,
    ev_blended,
    ev_blended_by_scenario,
    net_debt: baseBridge.netDebt,
    dlom_rate: baseBridge.dlomRate,
    dlom_amount: baseBridge.dlomDeduction,
    equity_value: equity_by_scenario.base,
    equity_by_scenario,
    revenue_basis: {
      actual: matrix.assumptions.base_revenue,
      forecast_y1,
    },
    ebitda_basis,
    multiples_raw_low: rangeLow,
    multiples_raw_high: rangeHigh,
    weightingLabelHe: formatWeightingLabelHe(weights),
    weightingLabelEn: formatWeightingLabelEn(weights),
  };
}

/** Dev-only: hero, waterfall, and scenario equity must agree within ₪1. */
export function assertValuationCoherence(
  canonical: CanonicalValuation,
  bridge: EquityBridgeMetrics,
  scenarioEquity: number,
): void {
  if (process.env.NODE_ENV === 'production') return;

  const checks: [string, number, number][] = [
    ['canonical.equity_value vs bridge.finalEquityValue', canonical.equity_value, bridge.finalEquityValue],
    ['scenarioEquity vs bridge.finalEquityValue', scenarioEquity, bridge.finalEquityValue],
    ['canonical.ev_blended vs bridge.enterpriseValue', canonical.ev_blended, bridge.enterpriseValue],
  ];

  for (const [name, a, b] of checks) {
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (Math.abs(a - b) > COHERENCE_TOLERANCE) {
      throw new Error(
        `[canonical] Valuation coherence failed: ${name} (${a} ≠ ${b})`,
      );
    }
  }
}

export function scenarioEquitySlices(
  canonical: CanonicalValuation,
  capital: ForecastMatrixCapitalStructure,
  wizardNetDebt?: number | null,
): Record<
  ValuationScenario,
  {
    enterprise_value: number;
    equity_before_dlom: number;
    equity_after_dlom: number;
    final_equity_value: number;
  }
> {
  const out = {} as Record<
    ValuationScenario,
    {
      enterprise_value: number;
      equity_before_dlom: number;
      equity_after_dlom: number;
      final_equity_value: number;
    }
  >;
  for (const key of ['bear', 'base', 'bull'] as const) {
    const bridge = bridgeFromEnterpriseValue(
      canonical.ev_blended_by_scenario[key],
      capital,
      wizardNetDebt,
    );
    out[key] = {
      enterprise_value: bridge.enterpriseValue,
      equity_before_dlom: bridge.equityBeforeDlom,
      equity_after_dlom: bridge.equityAfterDlom,
      final_equity_value: canonical.equity_by_scenario[key],
    };
  }
  return out;
}
