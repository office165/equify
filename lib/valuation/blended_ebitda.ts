import type { ValuationInputs } from '../valuation';
import { formatCurrencyShort } from '../utils/formatCurrency';

/** M&A-style EBITDA base weights (past / current / projected). */
export const BLENDED_EBITDA_WEIGHTS = {
  past: 0.3,
  current: 0.5,
  projected: 0.2,
} as const;

export interface EbitdaBlendBreakdown {
  past: number | null;
  current: number;
  projected: number;
  blended: number;
  weights: typeof BLENDED_EBITDA_WEIGHTS;
  /** True when 2025 revenue + EBITDA were user-supplied (historical path). */
  hasPastActual: boolean;
  /** Growth % used for projected year (user slider). */
  dcfGrowthPct: number;
  revPastK: number;
  revCurrentK: number;
  revProjectedK: number;
}

function isPositiveFinite(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

function isFiniteEbitda(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function ebitdaAtRevenueK(
  revK: number,
  marginPct: number,
  normalizedOwnerSalaryK: number,
): number {
  return revK * (marginPct / 100) + normalizedOwnerSalaryK;
}

export interface BlendedEbitdaInputs extends Pick<
  ValuationInputs,
  | 'rev'
  | 'margin'
  | 'normalizedOwnerSalary'
  | 'ebitda2024K'
  | 'ebitda2025K'
  | 'ebitda2026K'
  | 'revenue2025K'
  | 'revenue2026K'
  | 'projectedEbitdaK'
  | 'ebitda2027K'
> {
  /** User growth slider (%) — drives 2027F when explicit projected EBITDA absent. */
  growthPct?: number;
  /**
   * Explicit owner-salary add-back (₪K) for M&A blend legs only.
   * Omit default DCF normalization (250K) — pass 0 when user left field empty.
   */
  ownerSalaryAddBackK?: number;
}

function resolveOwnerSalaryAddBackK(inputs: BlendedEbitdaInputs): number {
  if (typeof inputs.ownerSalaryAddBackK === 'number' && Number.isFinite(inputs.ownerSalaryAddBackK)) {
    return Math.max(0, inputs.ownerSalaryAddBackK);
  }
  const legacy = inputs.normalizedOwnerSalary;
  return typeof legacy === 'number' && legacy > 0 ? legacy : 0;
}

function hasPastYearActuals(inputs: BlendedEbitdaInputs): boolean {
  return isPositiveFinite(inputs.revenue2025K) && isFiniteEbitda(inputs.ebitda2025K);
}

function blendWeightedAverage(
  past: number | null,
  current: number,
  projected: number,
  hasPastActual: boolean,
): number {
  const { past: wPast, current: wCurrent, projected: wProjected } = BLENDED_EBITDA_WEIGHTS;
  if (hasPastActual && past != null) {
    return wPast * past + wCurrent * current + wProjected * projected;
  }
  const activeSum = wCurrent + wProjected;
  return (wCurrent / activeSum) * current + (wProjected / activeSum) * projected;
}

/**
 * Blended EBITDA base: 30% prior year (2025) · 50% current (2026) · 20% forward (2027F).
 * Strictly uses active form-state year buckets — never legacy 2024 index for "past".
 * All values in ₪K.
 */
export function computeBlendedEbitda(
  inputs: BlendedEbitdaInputs,
  dcfGrowthPct: number,
): EbitdaBlendBreakdown {
  const { rev, margin } = inputs;
  const ownerSalaryAddBackK = resolveOwnerSalaryAddBackK(inputs);
  const growthPct = inputs.growthPct ?? dcfGrowthPct;
  const g = Math.max(-0.05, growthPct / 100);
  const revCurrentK = inputs.revenue2026K ?? rev;
  const revPastK =
    isPositiveFinite(inputs.revenue2025K) && inputs.revenue2025K > 0
      ? inputs.revenue2025K
      : g !== 0
        ? revCurrentK / (1 + g)
        : revCurrentK;
  const revProjectedK = revCurrentK * (1 + g);

  const pastEbitdaK = inputs.ebitda2025K;
  const currentEbitdaK = inputs.ebitda2026K;
  const projectedFromState =
    inputs.projectedEbitdaK?.[0] ?? inputs.ebitda2027K ?? null;
  const projectedEbitdaK =
    typeof projectedFromState === 'number' && projectedFromState > 0
      ? projectedFromState
      : isPositiveFinite(currentEbitdaK)
        ? currentEbitdaK * (1 + g)
        : 0;

  if (hasPastYearActuals(inputs)) {
    const past = pastEbitdaK!;
    const current = currentEbitdaK!;
    const projected =
      typeof projectedFromState === 'number' && Number.isFinite(projectedFromState)
        ? projectedFromState
        : isPositiveFinite(currentEbitdaK)
          ? currentEbitdaK * (1 + g)
          : projectedEbitdaK;
    const blended = blendWeightedAverage(past, current, projected, true);

    return {
      past,
      current,
      projected,
      blended,
      weights: BLENDED_EBITDA_WEIGHTS,
      hasPastActual: true,
      dcfGrowthPct: growthPct,
      revPastK,
      revCurrentK,
      revProjectedK,
    };
  }

  const revPastDerivedK = g !== 0 ? revCurrentK / (1 + g) : revCurrentK;
  const revProjectedDerivedK = revCurrentK * (1 + g);

  const past = null;
  const current = ebitdaAtRevenueK(revCurrentK, margin, ownerSalaryAddBackK);
  const projected = ebitdaAtRevenueK(revProjectedDerivedK, margin, ownerSalaryAddBackK);
  const blended = blendWeightedAverage(past, current, projected, false);

  return {
    past,
    current,
    projected,
    blended,
    weights: BLENDED_EBITDA_WEIGHTS,
    hasPastActual: false,
    dcfGrowthPct: growthPct,
    revPastK: revPastDerivedK,
    revCurrentK: revCurrentK,
    revProjectedK: revProjectedDerivedK,
  };
}

/** One-line summary for results / PDF footnotes (amounts in ₪K). */
export function summarizeBlendedEbitda(
  blend: EbitdaBlendBreakdown,
  currency: string = 'ILS',
): string {
  const fmt = (k: number) =>
    formatCurrencyShort(k * 1000, currency);
  const pastPart =
    blend.past != null && Number.isFinite(blend.past) ? fmt(blend.past) : '—';
  return `30/50/20 → ${fmt(blend.blended)} (${pastPart} · ${fmt(blend.current)} · +${blend.dcfGrowthPct.toFixed(0)}% ${fmt(blend.projected)})`;
}
