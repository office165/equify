import type { ValuationInputs } from '../../valuation';
import type { EbitdaBlendBreakdown } from '../blended_ebitda';
import type { BacklogInflectionResult } from '../backlog_inflection_accelerator';
import {
  resolveCurrentYearEbitdaK,
  resolveHistoricalEbitdaAverage,
} from '../backlog_valuation';
import type { SectorMethodologyConfig } from '../sector_methodology_matrix';

export interface ValuationStrategyLegs {
  /** EBITDA (₪K) base used for the multiples leg. */
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

export function createValuationStrategy(
  config: SectorMethodologyConfig,
): ValuationStrategy {
  switch (config.strategy) {
    case 'current_run_rate_revenue':
      return {
        computeLegs(ctx) {
          const revBase = ctx.revenueRunRateK;
          const revMultiplier = ctx.effectiveMult;
          const revMult = revBase * revMultiplier;
          const ebitdaBase = ctx.backlog.forwardEbitda2027K ?? ctx.currentYearEbitdaK;
          const ebtMult =
            config.weightEbitda > 0 ? ebitdaBase * ctx.effectiveMult : 0;
          return {
            ebitdaBaseForMultiple: ebitdaBase,
            ebtMult,
            revMult,
            revMultiplier,
          };
        },
      };
    case 'historical_blended_ebitda':
    default:
      return {
        computeLegs(ctx) {
          const ebitdaBase =
            ctx.backlog.inflectionIntensity > 0
              ? ctx.backlog.forwardEbitda2027K ?? ctx.currentYearEbitdaK
              : resolveHistoricalEbitdaAverage(ctx.inputs);

          const ebtMult = ebitdaBase * ctx.effectiveMult;
          return {
            ebitdaBaseForMultiple: ebitdaBase,
            ebtMult,
            revMult: 0,
            revMultiplier: 0,
          };
        },
      };
  }
}

export { resolveCurrentYearEbitdaK };
