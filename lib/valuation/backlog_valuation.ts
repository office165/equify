import type { ValuationInputs } from '../valuation';
import { applyBacklogInflectionAccelerator } from './backlog_inflection_accelerator';
import { resolveSectorMethodologyConfig } from './sector_methodology_resolver';
import { normalizeMethodologyWeights } from './sector_methodology_matrix';

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

function isPositiveFinite(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

/** Reported / manual 2026 EBITDA (₪K). */
export function resolveCurrentYearEbitdaK(
  inputs: Pick<ValuationInputs, 'ebitda2026K' | 'rev' | 'margin'>,
): number {
  if (isPositiveFinite(inputs.ebitda2026K)) {
    return inputs.ebitda2026K;
  }
  if (isPositiveFinite(inputs.rev) && Number.isFinite(inputs.margin)) {
    return inputs.rev * (inputs.margin / 100);
  }
  return 0;
}

/**
 * Three-year historical average for historical_blended_ebitda (no inflection).
 * Falls back to current-year EBITDA when history is incomplete.
 */
export function resolveHistoricalEbitdaAverage(
  inputs: Pick<
    ValuationInputs,
    'ebitda2024K' | 'ebitda2025K' | 'ebitda2026K' | 'rev' | 'margin'
  >,
): number {
  const current = resolveCurrentYearEbitdaK(inputs);
  const samples = [
    inputs.ebitda2024K,
    inputs.ebitda2025K,
    inputs.ebitda2026K ?? current,
  ].filter(isPositiveFinite);

  if (samples.length === 0) return current;
  return samples.reduce((sum, value) => sum + value, 0) / samples.length;
}

/**
 * First projected year (2027F) EBITDA — explicit user input only.
 * Returns null when missing so callers fall back to 2026.
 */
export function resolveForwardEbitda2027K(
  inputs: Pick<ValuationInputs, 'ebitda2027K'>,
): number | null {
  if (isPositiveFinite(inputs.ebitda2027K)) {
    return inputs.ebitda2027K;
  }
  return null;
}

/** Sector baseline blend weights (before backlog inflection). */
export function resolveSectorBaselineWeights(sector: ValuationInputs['sector']): {
  dcf: number;
  ebitda: number;
  rev: number;
} {
  const config = resolveSectorMethodologyConfig(sector);
  return normalizeMethodologyWeights(config);
}

/**
 * Resolves final blend weights: sector methodology baseline morphed by backlog inflection.
 */
export function resolveBlendWeights(
  sector: ValuationInputs['sector'],
  inputs: Pick<
    ValuationInputs,
    | 'hasSignificantBacklog'
    | 'backlogSignedK'
    | 'growth'
    | 'rev'
    | 'margin'
    | 'revenue2026K'
    | 'ebitda2027K'
    | 'ebitda2026K'
    | 'normalizedOwnerSalary'
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
    const forward2027 = resolveForwardEbitda2027K(inputs);
    return forward2027 ?? resolveCurrentYearEbitdaK(inputs);
  }

  return resolveHistoricalEbitdaAverage(inputs);
}
