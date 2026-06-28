import type { ValuationInputs } from '../valuation';

/** Backlog / revenue ratio at or above this threshold triggers inflection (OMWise-style). */
export const BACKLOG_INFLECTION_RATIO_THRESHOLD = 0.5;

/** Max WACC specific-risk reduction when backlog covers forward revenue (percentage points). */
export const BACKLOG_WACC_RISK_REDUCTION_MAX_PP = 1.5;

/** Tier-1 contracted backlog — full idiosyncratic (Alpha) risk elimination at ≥100% coverage. */
export const BACKLOG_FULL_ALPHA_MITIGATION_COVERAGE = 1.0;

export const BACKLOG_INFLECTION_TARGETS = {
  dcf: 0.7,
  ebitda: 0.3,
  rev: 0.0,
} as const;

/** Locked institutional EV blend — never overridden by variance or backlog. */
export const INSTITUTIONAL_BLEND_WEIGHTS = {
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

/** 2027F EBITDA — organic growth on current-year EBITDA (no backlog top-line). */
export function computeProjectedEbitda2027FromGrowth(
  ebitda2026K: number,
  growthPct: number,
): number {
  if (!isPositiveFinite(ebitda2026K)) return 0;
  const g = Math.max(-0.05, growthPct / 100);
  return ebitda2026K * (1 + g);
}

/** 2027F revenue — organic only: 2026 run-rate × (1 + user growth). */
export function computeOrganicForwardRevenue2027K(
  revenue2026K: number,
  growthPct: number,
): number {
  if (!isPositiveFinite(revenue2026K)) return 0;
  const g = Math.max(-0.05, growthPct / 100);
  return revenue2026K * (1 + g);
}

/** 2027F EBITDA — margin applied to organic forward revenue (no backlog top-line). */
export function computeOrganicForwardEbitda2027K(
  revenue2026K: number,
  growthPct: number,
  marginPct: number,
): number {
  const rev = computeOrganicForwardRevenue2027K(revenue2026K, growthPct);
  if (!isPositiveFinite(rev) || !Number.isFinite(marginPct)) return 0;
  return rev * (marginPct / 100);
}

/** Backlog ÷ organic 2027F revenue — drives WACC risk mitigation only. */
export function computeBacklogCoverageRatio(
  backlogSignedK: number | undefined,
  forwardRevenue2027K: number,
): number {
  const backlog = backlogSignedK ?? 0;
  if (!isPositiveFinite(backlog) || !isPositiveFinite(forwardRevenue2027K)) return 0;
  return backlog / forwardRevenue2027K;
}

/**
 * Maps backlog coverage into a WACC idiosyncratic-Alpha reduction (negative pp).
 * Size premium is retained; Alpha (quality/recurrence/concentration) → 0% at ≥100% coverage.
 */
export function computeBacklogWaccRiskReduction(
  coverageRatio: number,
  inflectionActive: boolean,
  idiosyncraticAlphaPp = BACKLOG_WACC_RISK_REDUCTION_MAX_PP,
): number {
  if (!inflectionActive || coverageRatio <= 0) return 0;
  if (coverageRatio >= BACKLOG_FULL_ALPHA_MITIGATION_COVERAGE) {
    return -Math.max(0, idiosyncraticAlphaPp);
  }
  const span = 1 - BACKLOG_INFLECTION_RATIO_THRESHOLD;
  const t = Math.min(
    1,
    Math.max(0, (coverageRatio - BACKLOG_INFLECTION_RATIO_THRESHOLD) / span),
  );
  return -BACKLOG_WACC_RISK_REDUCTION_MAX_PP * t;
}

/**
 * @deprecated Backlog no longer inflates equity — always returns 1.
 */
export function computeBacklogValuationHealthFactor(
  _coverageRatio: number,
  _inflectionActive: boolean,
): number {
  return 1;
}

/** Forward EBITDA blend base: 50% historical avg + 50% organic 2027F. */
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
