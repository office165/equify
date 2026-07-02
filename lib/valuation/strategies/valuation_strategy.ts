import type { ValuationInputs } from '../../valuation';
import type { EbitdaBlendBreakdown } from '../blended_ebitda';
import type { BacklogInflectionResult } from '../backlog_metrics';
import type { SectorMethodologyConfig } from '../sector_methodology_matrix';

export interface ValuationStrategyLegs {
  ebitdaBaseForMultiple: number;
  ebtMult: number;
  revMult: number;
  revMultiplier: number;
}

export interface ValuationStrategyContext {
  inputs: ValuationInputs;
  config: SectorMethodologyConfig;
  effectiveMult: number;
  ebitdaBlend: EbitdaBlendBreakdown;
  backlog: BacklogInflectionResult;
  currentYearEbitdaK: number;
  revenueRunRateK: number;
}

export interface ValuationStrategy {
  computeLegs(ctx: ValuationStrategyContext): ValuationStrategyLegs;
}

/** Implied EBITDA-multiple leg EV (₪K) — must match report coherence anchors. */
export function computeEbitdaMultipleLegEvK(
  ebitdaBaseK: number,
  multiple: number,
): number {
  if (!Number.isFinite(ebitdaBaseK) || !Number.isFinite(multiple) || ebitdaBaseK <= 0) {
    return 0;
  }
  return Math.round(ebitdaBaseK * multiple * 100) / 100;
}

/** historical_blended_ebitda — EBITDA multiple leg from backlog-resolved base. */
class HistoricalBlendedEbitdaStrategy implements ValuationStrategy {
  computeLegs(ctx: ValuationStrategyContext): ValuationStrategyLegs {
    const base = ctx.backlog.baseEbitdaForMultiple;
    return {
      ebitdaBaseForMultiple: base,
      ebtMult: computeEbitdaMultipleLegEvK(base, ctx.effectiveMult),
      revMult: 0,
      revMultiplier: 0,
    };
  }
}

/** current_run_rate_revenue — revenue run-rate multiple (2026) + EBITDA reference leg for reports. */
class CurrentRunRateRevenueStrategy implements ValuationStrategy {
  computeLegs(ctx: ValuationStrategyContext): ValuationStrategyLegs {
    const base = ctx.backlog.baseEbitdaForMultiple;
    const revMultiplier = ctx.effectiveMult;
    return {
      ebitdaBaseForMultiple: base,
      ebtMult: computeEbitdaMultipleLegEvK(base, ctx.effectiveMult),
      revMult: ctx.revenueRunRateK * revMultiplier,
      revMultiplier,
    };
  }
}

const STRATEGY_REGISTRY: Record<
  SectorMethodologyConfig['strategy'],
  ValuationStrategy
> = {
  historical_blended_ebitda: new HistoricalBlendedEbitdaStrategy(),
  current_run_rate_revenue: new CurrentRunRateRevenueStrategy(),
};

/** Strategy factory — selects methodology from sectorConfigs.profile.strategy. */
export function createValuationStrategy(
  config: SectorMethodologyConfig,
): ValuationStrategy {
  return STRATEGY_REGISTRY[config.strategy] ?? STRATEGY_REGISTRY.historical_blended_ebitda;
}
