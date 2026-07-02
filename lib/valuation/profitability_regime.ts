/**
 * Profitability Regime Resolver — determines which valuation methodology
 * applies based on the company's margin profile.
 *
 * Financial rationale (Damodaran, "The Dark Side of Valuation"):
 * EBITDA multiples are meaningless for loss-making companies. Revenue
 * multiples + turnaround DCF + asset floor become the valid toolkit.
 * The transition between regimes must be SMOOTH at the boundaries to
 * avoid valuation cliffs when EBITDA crosses zero.
 */

export type ProfitabilityRegime =
  | 'healthy'
  | 'thin_margin'
  | 'loss_making'
  | 'deep_loss';

export interface RegimeBlendWeights {
  dcf: number;
  ebitdaMultiple: number;
  revenueMultiple: number;
}

export interface RegimeResolution {
  regime: ProfitabilityRegime;
  blendWeights: RegimeBlendWeights;
  /** Added to WACC (pp) — loss-making companies carry elevated discount rates. */
  waccPremium: number;
  /** Maximum quality score for this regime — loss-making = higher risk. */
  qualityScoreCap: number;
  /** Years to reach 60% of sector-normal margin in turnaround DCF. */
  turnaroundYears: number;
  /** Hebrew label shown in report for transparency. */
  labelHe: string;
}

const WEIGHT_SUM_TOLERANCE = 1e-6;

/** Loss-making static blend — revenue-primary; weights held fixed for margin monotonicity. */
const LOSS_MAKING_WEIGHTS: RegimeBlendWeights = {
  dcf: 0.4,
  ebitdaMultiple: 0,
  revenueMultiple: 0.6,
};

/** Deep-loss static blend — conservative revenue-heavy. */
const DEEP_LOSS_WEIGHTS: RegimeBlendWeights = {
  dcf: 0.3,
  ebitdaMultiple: 0,
  revenueMultiple: 0.7,
};

/**
 * Normalizes blend weights to sum to exactly 1.0 (defensive rounding).
 * Prevents coherence drift from floating-point residue in regime interpolation.
 */
export function normalizeRegimeBlendWeights(
  weights: RegimeBlendWeights,
): RegimeBlendWeights {
  const sum = weights.dcf + weights.ebitdaMultiple + weights.revenueMultiple;
  if (!(sum > 0)) {
    return { dcf: 0.5, ebitdaMultiple: 0.3, revenueMultiple: 0.2 };
  }
  const dcf = weights.dcf / sum;
  const ebitdaMultiple = weights.ebitdaMultiple / sum;
  const revenueMultiple = weights.revenueMultiple / sum;
  const rounded = {
    dcf: Math.round(dcf * 10000) / 10000,
    ebitdaMultiple: Math.round(ebitdaMultiple * 10000) / 10000,
    revenueMultiple: Math.round(revenueMultiple * 10000) / 10000,
  };
  const roundedSum =
    rounded.dcf + rounded.ebitdaMultiple + rounded.revenueMultiple;
  if (Math.abs(roundedSum - 1) > WEIGHT_SUM_TOLERANCE) {
    rounded.revenueMultiple =
      Math.round((1 - rounded.dcf - rounded.ebitdaMultiple) * 10000) / 10000;
  }
  return rounded;
}

/**
 * Resolves profitability regime from current-year EBITDA and revenue (₪K).
 * Margin = EBITDA / Revenue — the primary regime switch.
 *
 * A unified ±5% margin band linearly interpolates weights and WACC premium
 * to prevent valuation cliffs at EBITDA = 0 (Damodaran continuity principle).
 * Loss-making weights stay fixed (40/0/60) so improving margin monotonically
 * raises equity via better DCF / lower distress premium — not weight shifts.
 */
export function resolveProfitabilityRegime(params: {
  ebitdaK: number;
  revenueK: number;
}): RegimeResolution {
  const { ebitdaK, revenueK } = params;
  const margin = revenueK > 0 ? ebitdaK / revenueK : 0;

  if (margin >= 0.05) {
    return {
      regime: 'healthy',
      blendWeights: normalizeRegimeBlendWeights({
        dcf: 0.5,
        ebitdaMultiple: 0.3,
        revenueMultiple: 0.2,
      }),
      waccPremium: 0,
      qualityScoreCap: 100,
      turnaroundYears: 0,
      labelHe: 'רווחיות תקינה',
    };
  }

  if (margin >= -0.05) {
    const t = (margin + 0.05) / 0.1;
    const blendWeights = normalizeRegimeBlendWeights({
      dcf: 0.4 + 0.1 * t,
      ebitdaMultiple: 0.3 * t,
      revenueMultiple: 0.6 - 0.4 * t,
    });
    const isNegative = margin < 0;
    return {
      regime: isNegative ? 'loss_making' : 'thin_margin',
      blendWeights,
      waccPremium: 0.025 * (1 - t),
      qualityScoreCap: isNegative ? 70 : 85,
      turnaroundYears: 0,
      labelHe: isNegative
        ? 'הפסדית — הערכה לפי הכנסות ותוואי הבראה'
        : 'רווחיות גבולית',
    };
  }

  if (margin >= -0.25) {
    const depth = (margin + 0.25) / 0.2;
    return {
      regime: 'loss_making',
      blendWeights: normalizeRegimeBlendWeights(LOSS_MAKING_WEIGHTS),
      waccPremium: 0.04 - 0.015 * depth,
      qualityScoreCap: Math.round(55 + 15 * depth),
      turnaroundYears: Math.max(3, Math.round(5 - 2 * depth)),
      labelHe: 'הפסדית — הערכה לפי הכנסות ותוואי הבראה',
    };
  }

  return {
    regime: 'deep_loss',
    blendWeights: normalizeRegimeBlendWeights(DEEP_LOSS_WEIGHTS),
    waccPremium: 0.04,
    qualityScoreCap: 55,
    turnaroundYears: 5,
    labelHe: 'הפסד עמוק — הערכה שמרנית לפי הכנסות',
  };
}

/** Maps regime blend weights to engine EV leg weights (dcf / ebitda / rev). */
export function regimeWeightsToEngineBlend(
  weights: RegimeBlendWeights,
): { dcf: number; ebitda: number; rev: number } {
  return {
    dcf: weights.dcf,
    ebitda: weights.ebitdaMultiple,
    rev: weights.revenueMultiple,
  };
}

/**
 * Builds Hebrew methodology disclosure for loss-making / thin-margin regimes.
 * Weights and turnaround horizon are taken from the active resolution.
 */
export function buildProfitabilityMethodologyNoteHe(
  resolution: RegimeResolution,
): string | undefined {
  if (resolution.regime === 'healthy') return undefined;

  const { blendWeights, turnaroundYears, labelHe } = resolution;
  const revPct = Math.round(blendWeights.revenueMultiple * 100);
  const dcfPct = Math.round(blendWeights.dcf * 100);
  const turnaroundLine =
    turnaroundYears > 0
      ? `DCF עם תוואי הבראה ל-${turnaroundYears} שנים (${dcfPct}%), `
      : `DCF (${dcfPct}%), `;

  if (blendWeights.ebitdaMultiple <= 0) {
    return (
      `מתודולוגיית הערכה: ${labelHe}\n` +
      `בשל EBITDA שלילית, ההערכה מבוססת על: מכפיל הכנסות (${revPct}%), ` +
      `${turnaroundLine}ורצפת שווי נכסי.\n` +
      `מכפיל EBITDA אינו ישים לחברה הפסדית ואינו נכלל בשקלול.`
    );
  }

  const ebitdaPct = Math.round(blendWeights.ebitdaMultiple * 100);
  return (
    `מתודולוגיית הערכה: ${labelHe}\n` +
    `שקלול מותאם: DCF (${dcfPct}%), מכפיל EBITDA (${ebitdaPct}%), מכפיל הכנסות (${revPct}%).`
  );
}
