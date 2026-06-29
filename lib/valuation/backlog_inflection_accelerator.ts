import type { ValuationInputs } from '../valuation';
import {
  INSTITUTIONAL_BLEND_WEIGHTS,
  computeBacklogCoverageRatio,
  computeBacklogRatio,
  computeBacklogWaccRiskReduction,
  computeOrganicForwardRevenue2027K,
  computeProjectedEbitda2027FromGrowth,
  resolveCurrentYearEbitdaK,
  resolveHistoricalThreeYearEbitdaAverage,
  type BacklogInflectionResult,
} from './backlog_metrics';
import type { SectorMethodologyConfig } from './sector_methodology_matrix';

/** @deprecated Use computeBacklogWaccRiskReduction — dynamic up to −1.5pp. */
export const BACKLOG_INFLECTION_WACC_PREMIUM = -1.0;

export {
  BACKLOG_INFLECTION_RATIO_THRESHOLD,
  BACKLOG_INFLECTION_TARGETS,
  computeBacklogInflectionWeight,
} from './backlog_metrics';

export type { BacklogInflectionResult } from './backlog_metrics';

/**
 * Backlog Inflection — contracted backlog stabilizes WACC (Alpha mitigation), all sectors including SaaS.
 * EV blend weights are resolved separately via valuation_weights_registry.
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
  /** Full idiosyncratic Alpha premium (pp) — eligible for backlog mitigation. */
  specificRiskPremiumPp?: number;
}): BacklogInflectionResult {
  const { sectorConfig, inputs, cappedGrowthPct } = params;
  const userGrowthPct = cappedGrowthPct;
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

  const currentYearEbitdaK = resolveCurrentYearEbitdaK(ebitdaContext);
  const projectedFromState =
    inputs.projectedEbitdaK?.[0] ?? inputs.ebitda2027K ?? null;
  const forwardEbitda2027K =
    typeof projectedFromState === 'number' && projectedFromState > 0
      ? projectedFromState
      : computeProjectedEbitda2027FromGrowth(currentYearEbitdaK, userGrowthPct);

  const organicForwardRevenue2027K = computeOrganicForwardRevenue2027K(
    revenue2026K,
    userGrowthPct,
  );

  const backlogCheck = computeBacklogRatio(inputs.backlogSignedK, revenue2026K);
  const inflectionWeight = backlogCheck.inflectionWeight;
  const backlogInflectionActive = backlogCheck.triggerInflection;
  const coverageRatio = computeBacklogCoverageRatio(
    inputs.backlogSignedK,
    organicForwardRevenue2027K,
  );

  const isRevenueStrategy = sectorConfig.strategy === 'current_run_rate_revenue';
  const baseEbitdaForMultiple = isRevenueStrategy
    ? currentYearEbitdaK
    : historicalThreeYearEbitdaAvg;

  return {
    inflectionIntensity: inflectionWeight,
    acceleratedGrowthPct: userGrowthPct,
    blendWeights: { ...INSTITUTIONAL_BLEND_WEIGHTS },
    baseEbitdaForMultiple,
    backlogInflectionActive,
    backlogRatio: backlogCheck.backlogRatio,
    historicalThreeYearEbitdaAvg,
    forwardEbitda2027K,
    waccAdjustmentPct: computeBacklogWaccRiskReduction(
      coverageRatio,
      inflectionWeight,
      params.specificRiskPremiumPp,
    ),
  };
}
