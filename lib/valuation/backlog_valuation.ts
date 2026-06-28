import type { ValuationInputs } from '../valuation';
import { applyBacklogInflectionAccelerator } from './backlog_inflection_accelerator';
import {
  resolveCurrentYearEbitdaK,
  resolveForwardEbitda2027K,
  resolveHistoricalThreeYearEbitdaAverage,
  resolveInflectionForwardEbitda2027K,
} from './backlog_metrics';
import { resolveSectorMethodologyConfig } from './sector_methodology_resolver';
import { resolveValuationBlendWeights } from './valuation_weights_registry';

export {
  resolveCurrentYearEbitdaK,
  resolveHistoricalThreeYearEbitdaAverage,
  resolveHistoricalThreeYearEbitdaAverage as resolveHistoricalEbitdaAverage,
  resolveInflectionForwardEbitda2027K,
  resolveForwardEbitda2027K,
  computeBacklogRatio,
  BACKLOG_INFLECTION_RATIO_THRESHOLD,
} from './backlog_metrics';

/** @deprecated Prefer sector methodology + backlog inflection accelerator. */
export const STANDARD_BLEND_WEIGHTS = {
  dcf: 0.4,
  ebitda: 0.6,
  rev: 0,
} as const;

/** @deprecated Prefer sector methodology + backlog inflection accelerator. */
export const BACKLOG_BLEND_WEIGHTS = {
  dcf: 0.7,
  ebitda: 0.3,
  rev: 0,
} as const;

/**
 * First projected year EBITDA — user-supplied forward projections only.
 * Tries projectedEbitdaK[0], then [1], then [2], then legacy ebitda2027K; falls back to current year.
 */
export function resolveForwardProjectedEbitdaK(
  projectedEbitdaK: number[] | undefined,
  inputs: Pick<
    ValuationInputs,
    'ebitda2027K' | 'ebitda2026K' | 'rev' | 'margin'
  >,
): number {
  const y0 = projectedEbitdaK?.[0];
  const y1 = projectedEbitdaK?.[1];
  const y2 = projectedEbitdaK?.[2];
  if (isPositiveFinite(y0)) return y0;
  if (isPositiveFinite(y1)) return y1;
  if (isPositiveFinite(y2)) return y2;

  const legacyForward = resolveForwardEbitda2027K(inputs);
  if (legacyForward != null) return legacyForward;

  return resolveCurrentYearEbitdaK(inputs);
}

function isPositiveFinite(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

/** Sector baseline blend weights (before backlog inflection). */
export function resolveSectorBaselineWeights(
  sector: ValuationInputs['sector'],
  subSector?: string,
): {
  dcf: number;
  ebitda: number;
  rev: number;
} {
  const config = resolveSectorMethodologyConfig(sector, subSector);
  return resolveValuationBlendWeights({
    subSectorId: subSector,
    strategy: config.strategy,
  });
}

/**
 * Resolves final blend weights: sector methodology baseline morphed by backlog inflection.
 */
export function resolveBlendWeights(
  sector: ValuationInputs['sector'],
  inputs: Pick<
    ValuationInputs,
    | 'backlogSignedK'
    | 'projectedEbitdaK'
    | 'growth'
    | 'rev'
    | 'margin'
    | 'revenue2026K'
    | 'ebitda2027K'
    | 'ebitda2026K'
    | 'ebitda2024K'
    | 'ebitda2025K'
  >,
  cappedGrowthPct: number,
): { dcf: number; ebitda: number; rev: number } {
  const sectorConfig = resolveSectorMethodologyConfig(sector);
  const inflection = applyBacklogInflectionAccelerator({
    sectorConfig,
    inputs,
    cappedGrowthPct,
  });
  return inflection.blendWeights;
}

/** EBITDA base for the multiples leg of the combined EV formula. */
export function resolveBaseEbitdaForMultiple(
  inputs: Pick<
    ValuationInputs,
    'ebitda2027K' | 'ebitda2026K' | 'ebitda2024K' | 'ebitda2025K' | 'rev' | 'margin'
  >,
  forwardFromInflection?: number | null,
  inflectionActive = false,
): number {
  if (isPositiveFinite(forwardFromInflection)) {
    return forwardFromInflection;
  }

  if (inflectionActive) {
    return resolveInflectionForwardEbitda2027K(undefined, inputs);
  }

  return resolveHistoricalThreeYearEbitdaAverage(inputs);
}
