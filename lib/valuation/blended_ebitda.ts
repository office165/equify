import type { ValuationInputs } from '../valuation';

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
  /** Growth % used for projected year (sector growthCap applied). */
  dcfGrowthPct: number;
  revPastK: number;
  revCurrentK: number;
  revProjectedK: number;
}

function ebitdaAtRevenueK(
  revK: number,
  marginPct: number,
  normalizedOwnerSalaryK: number,
): number {
  return revK * (marginPct / 100) + normalizedOwnerSalaryK;
}

/**
 * Blended EBITDA base: 30% prior year · 50% current · 20% forward (capped growth).
 * All values in ₪K.
 */
export function computeBlendedEbitda(
  inputs: Pick<
    ValuationInputs,
    'rev' | 'margin' | 'normalizedOwnerSalary'
  >,
  dcfGrowthPct: number,
): EbitdaBlendBreakdown {
  const { rev, margin, normalizedOwnerSalary = 0 } = inputs;
  const g = Math.max(-0.05, dcfGrowthPct / 100);

  const revPastK = g !== 0 ? rev / (1 + g) : rev;
  const revProjectedK = rev * (1 + g);

  const past = ebitdaAtRevenueK(revPastK, margin, normalizedOwnerSalary);
  const current = ebitdaAtRevenueK(rev, margin, normalizedOwnerSalary);
  const projected = ebitdaAtRevenueK(revProjectedK, margin, normalizedOwnerSalary);

  const { past: wPast, current: wCurrent, projected: wProjected } =
    BLENDED_EBITDA_WEIGHTS;
  const blended = wPast * past + wCurrent * current + wProjected * projected;

  return {
    past,
    current,
    projected,
    blended,
    weights: BLENDED_EBITDA_WEIGHTS,
    dcfGrowthPct,
    revPastK,
    revCurrentK: rev,
    revProjectedK,
  };
}

/** One-line summary for results / PDF footnotes (amounts in ₪K). */
export function summarizeBlendedEbitda(blend: EbitdaBlendBreakdown): string {
  const fmt = (k: number) => `${(k / 1000).toFixed(1)}M`;
  return `30/50/20 → ${fmt(blend.blended)} (${fmt(blend.past)} · ${fmt(blend.current)} · +${blend.dcfGrowthPct.toFixed(0)}% ${fmt(blend.projected)})`;
}
