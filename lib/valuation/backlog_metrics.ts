import type { ValuationInputs } from '../valuation';

/** Backlog / revenue ratio at or above this threshold triggers inflection (OMWise-style). */
export const BACKLOG_INFLECTION_RATIO_THRESHOLD = 0.5;

export const BACKLOG_INFLECTION_TARGETS = {
  dcf: 0.7,
  ebitda: 0.3,
  rev: 0.0,
} as const;

export interface BacklogRatioResult {
  backlogRatio: number;
  triggerInflection: boolean;
  reason: 'ratio_threshold' | 'below_threshold' | 'saas_excluded' | 'no_revenue';
}

export interface BacklogInflectionResult {
  inflectionIntensity: number;
  acceleratedGrowthPct: number;
  blendWeights: { dcf: number; ebitda: number; rev: number };
  baseEbitdaForMultiple: number;
  backlogInflectionActive: boolean;
  backlogRatio: number;
  historicalThreeYearEbitdaAvg: number;
  forwardEbitda2027K: number;
  /** WACC adjustment when contracted backlog lowers revenue risk (e.g. −1.0%). */
  waccAdjustmentPct: number;
}

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

/** (ebitda_2024 + ebitda_2025 + ebitda_2026) / 3 — user-supplied values only. */
export function resolveHistoricalThreeYearEbitdaAverage(
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
  return samples.reduce((sum, v) => sum + v, 0) / samples.length;
}

export function resolveForwardEbitda2027K(
  inputs: Pick<ValuationInputs, 'ebitda2027K'>,
): number | null {
  if (isPositiveFinite(inputs.ebitda2027K)) {
    return inputs.ebitda2027K;
  }
  return null;
}

/** 2027F EBITDA — projectedEbitdaK[0] or ebitda2027K; fallback to 2026. */
export function resolveInflectionForwardEbitda2027K(
  projectedEbitdaK: number[] | undefined,
  inputs: Pick<
    ValuationInputs,
    'ebitda2027K' | 'ebitda2026K' | 'rev' | 'margin'
  >,
): number {
  const forward2027F = projectedEbitdaK?.[0];
  if (isPositiveFinite(forward2027F)) return forward2027F;

  const explicit = resolveForwardEbitda2027K(inputs);
  if (explicit != null) return explicit;

  return resolveCurrentYearEbitdaK(inputs);
}

/** Forward EBITDA blend base: 50% historical avg + 50% user 2027F. */
export function resolveForwardBlendedMultipleBaseEbitda(
  historicalAvg: number,
  forward2027K: number,
): number {
  return 0.5 * historicalAvg + 0.5 * forward2027K;
}

export function computeBacklogRatio(
  backlogSignedK: number | undefined,
  revenue2026K: number | undefined,
): BacklogRatioResult {
  if (!isPositiveFinite(revenue2026K)) {
    return { backlogRatio: 0, triggerInflection: false, reason: 'no_revenue' };
  }

  const backlog = backlogSignedK ?? 0;
  if (!isPositiveFinite(backlog)) {
    return { backlogRatio: 0, triggerInflection: false, reason: 'below_threshold' };
  }

  const backlogRatio = backlog / revenue2026K;
  const triggerInflection = backlogRatio >= BACKLOG_INFLECTION_RATIO_THRESHOLD;

  return {
    backlogRatio,
    triggerInflection,
    reason: triggerInflection ? 'ratio_threshold' : 'below_threshold',
  };
}
