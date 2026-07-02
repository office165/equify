import type { ValuationInputs } from '../valuation';
import { formatCurrencyShort } from '../utils/formatCurrency';

/** M&A-style EBITDA base weights (past / current / projected). */
export const BLENDED_EBITDA_WEIGHTS = {
  past: 0.3,
  current: 0.5,
  projected: 0.2,
} as const;

export interface EbitdaBlendBreakdown {
  past: number;
  current: number;
  projected: number;
  blended: number;
  weights: typeof BLENDED_EBITDA_WEIGHTS;
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
  const { rev, margin, normalizedOwnerSalary = 0 } = inputs;
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

  if (
    isFiniteEbitda(pastEbitdaK) &&
    isFiniteEbitda(currentEbitdaK) &&
    isPositiveFinite(inputs.revenue2025K)
  ) {
    const past = pastEbitdaK;
    const current = currentEbitdaK;
    const projected =
      typeof projectedFromState === 'number' && Number.isFinite(projectedFromState)
        ? projectedFromState
        : isPositiveFinite(currentEbitdaK)
          ? currentEbitdaK * (1 + g)
          : projectedEbitdaK;
    const { past: wPast, current: wCurrent, projected: wProjected } =
      BLENDED_EBITDA_WEIGHTS;
    const blended = wPast * past + wCurrent * current + wProjected * projected;

    return {
      past,
      current,
      projected,
      blended,
      weights: BLENDED_EBITDA_WEIGHTS,
      dcfGrowthPct: growthPct,
      revPastK,
      revCurrentK,
      revProjectedK,
    };
  }

  const revPastDerivedK = g !== 0 ? rev / (1 + g) : rev;
  const revProjectedDerivedK = rev * (1 + g);

  const past = ebitdaAtRevenueK(revPastDerivedK, margin, normalizedOwnerSalary);
  const current = ebitdaAtRevenueK(rev, margin, normalizedOwnerSalary);
  const projected = ebitdaAtRevenueK(revProjectedDerivedK, margin, normalizedOwnerSalary);

  const { past: wPast, current: wCurrent, projected: wProjected } =
    BLENDED_EBITDA_WEIGHTS;
  const blended = wPast * past + wCurrent * current + wProjected * projected;

  return {
    past,
    current,
    projected,
    blended,
    weights: BLENDED_EBITDA_WEIGHTS,
    dcfGrowthPct: growthPct,
    revPastK: revPastDerivedK,
    revCurrentK: rev,
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
  return `30/50/20 → ${fmt(blend.blended)} (${fmt(blend.past)} · ${fmt(blend.current)} · +${blend.dcfGrowthPct.toFixed(0)}% ${fmt(blend.projected)})`;
}
