import type { ValuationInputs } from '../valuation';
import {
  BACKLOG_INFLECTION_TARGETS,
  computeBacklogRatio,
  resolveCurrentYearEbitdaK,
  resolveForwardBlendedMultipleBaseEbitda,
  resolveHistoricalThreeYearEbitdaAverage,
  resolveInflectionForwardEbitda2027K,
  type BacklogInflectionResult,
} from './backlog_metrics';
import {
  computeInflectionForwardEbitda2027K,
} from './adaptive_calibration';
import {
  normalizeMethodologyWeights,
  type SectorMethodologyConfig,
} from './sector_methodology_matrix';

export const BACKLOG_INFLECTION_WACC_PREMIUM = -1.0;

export {
  BACKLOG_INFLECTION_RATIO_THRESHOLD,
  BACKLOG_INFLECTION_TARGETS,
} from './backlog_metrics';

export type { BacklogInflectionResult } from './backlog_metrics';

/**
 * Backlog Inflection Accelerator — ratio-driven overlay on sectorConfigs.
 *
 * industry / services (historical_blended_ebitda):
 *   backlog_signed / revenue_2026 >= 0.5 → 70/30 weights + forward EBITDA blend
 *   else → sector baseline weights + 3-year EBITDA average
 *
 * saas: sectorConfigs weights; backlog ignored; revenue multiple on 2026 run-rate.
 */
export function applyBacklogInflectionAccelerator(params: {
  sectorConfig: SectorMethodologyConfig;
  inputs: Pick<
    ValuationInputs,
    | 'backlogSignedK'
    | 'projectedEbitdaK'
    | 'ebitda2027K'
    | 'ebitda2026K'
    | 'ebitda2024K'
    | 'ebitda2025K'
    | 'rev'
    | 'margin'
    | 'revenue2026K'
  >;
  cappedGrowthPct: number;
  /** Post-guardrail mean margin % across 2024–2026. */
  historicalAvgMarginPct?: number;
}): BacklogInflectionResult {
  const { sectorConfig, inputs, cappedGrowthPct, historicalAvgMarginPct = 0 } = params;
  const sectorBaseline = normalizeMethodologyWeights(sectorConfig);
  const revenue2026K = inputs.revenue2026K ?? inputs.rev ?? 0;

  const ebitdaContext = {
    ebitda2024K: inputs.ebitda2024K,
    ebitda2025K: inputs.ebitda2025K,
    ebitda2026K: inputs.ebitda2026K,
    ebitda2027K: inputs.ebitda2027K,
    rev: revenue2026K,
    margin: inputs.margin,
  };

  const historicalThreeYearEbitdaAvg =
    resolveHistoricalThreeYearEbitdaAverage(ebitdaContext);

  const backlogSignedK = inputs.backlogSignedK ?? 0;
  const inflectionForwardEbitda2027K =
    historicalAvgMarginPct > 0 && backlogSignedK > 0
      ? computeInflectionForwardEbitda2027K(
          historicalAvgMarginPct,
          backlogSignedK,
        )
      : resolveInflectionForwardEbitda2027K(inputs.projectedEbitdaK, ebitdaContext);

  if (sectorConfig.strategy === 'current_run_rate_revenue') {
    return {
      inflectionIntensity: 0,
      acceleratedGrowthPct: cappedGrowthPct,
      blendWeights: sectorBaseline,
      baseEbitdaForMultiple: resolveCurrentYearEbitdaK(ebitdaContext),
      backlogInflectionActive: false,
      backlogRatio: 0,
      historicalThreeYearEbitdaAvg,
      forwardEbitda2027K: inflectionForwardEbitda2027K,
      waccAdjustmentPct: 0,
    };
  }

  const backlogCheck = computeBacklogRatio(inputs.backlogSignedK, revenue2026K);
  const backlogInflectionActive = backlogCheck.triggerInflection;

  const blendWeights = backlogInflectionActive
    ? { ...BACKLOG_INFLECTION_TARGETS }
    : sectorBaseline;

  const baseEbitdaForMultiple = backlogInflectionActive
    ? resolveForwardBlendedMultipleBaseEbitda(
        historicalThreeYearEbitdaAvg,
        inflectionForwardEbitda2027K,
      )
    : historicalThreeYearEbitdaAvg;

  return {
    inflectionIntensity: backlogInflectionActive ? 1 : 0,
    acceleratedGrowthPct: cappedGrowthPct,
    blendWeights,
    baseEbitdaForMultiple,
    backlogInflectionActive,
    backlogRatio: backlogCheck.backlogRatio,
    historicalThreeYearEbitdaAvg,
    forwardEbitda2027K: inflectionForwardEbitda2027K,
    waccAdjustmentPct: backlogInflectionActive
      ? BACKLOG_INFLECTION_WACC_PREMIUM
      : 0,
  };
}
