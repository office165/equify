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
  /** @deprecated Regime no longer supplies absolute weights — use composeRegimeWithSectorBase. */
  blendWeights: RegimeBlendWeights;
  /** DCF dampening factor when composing with sector base (1 = unchanged). */
  regimeDcfFactor: number;
  /** Thin-margin interpolation toward sector base (0 = full loss compose, 1 = sector). */
  thinMarginBlendT?: number;
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

const HEALTHY_RESOLUTION: RegimeResolution = {
  regime: 'healthy',
  blendWeights: { dcf: 0.5, ebitdaMultiple: 0.3, revenueMultiple: 0.2 },
  regimeDcfFactor: 1,
  waccPremium: 0,
  qualityScoreCap: 100,
  turnaroundYears: 0,
  labelHe: 'רווחיות תקינה',
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
 * Inactive until both revenue > 0 and EBITDA has been entered (non-zero).
 */
export function resolveProfitabilityRegime(params: {
  ebitdaK: number;
  revenueK: number;
}): RegimeResolution {
  const { ebitdaK, revenueK } = params;

  if (revenueK <= 0 || ebitdaK === 0) {
    return HEALTHY_RESOLUTION;
  }

  const margin = ebitdaK / revenueK;

  if (margin >= 0.05) {
    return HEALTHY_RESOLUTION;
  }

  if (margin >= -0.05) {
    const t = (margin + 0.05) / 0.1;
    const isNegative = margin < 0;
    return {
      regime: isNegative ? 'loss_making' : 'thin_margin',
      blendWeights: normalizeRegimeBlendWeights({
        dcf: 0.4 + 0.1 * t,
        ebitdaMultiple: 0.3 * t,
        revenueMultiple: 0.6 - 0.4 * t,
      }),
      regimeDcfFactor: 0.9 + 0.1 * t,
      thinMarginBlendT: t,
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
      blendWeights: normalizeRegimeBlendWeights({
        dcf: 0.4,
        ebitdaMultiple: 0,
        revenueMultiple: 0.6,
      }),
      regimeDcfFactor: 0.9 + 0.05 * depth,
      waccPremium: 0.04 - 0.015 * depth,
      qualityScoreCap: Math.round(55 + 15 * depth),
      turnaroundYears: Math.max(3, Math.round(5 - 2 * depth)),
      labelHe: 'הפסדית — הערכה לפי הכנסות ותוואי הבראה',
    };
  }

  return {
    regime: 'deep_loss',
    blendWeights: normalizeRegimeBlendWeights({
      dcf: 0.3,
      ebitdaMultiple: 0,
      revenueMultiple: 0.7,
    }),
    regimeDcfFactor: 0.85,
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

/** Override regime label when spot year is anomalous but normalized earnings recover. */
export function applyNormalizedEbitdaRegimeLabel(
  regime: RegimeResolution,
  params: {
    yearsAvailable: number;
    isCurrentYearAnomalous: boolean;
    anomalyDirection: 'downside' | 'upside' | null;
    normalizedEbitdaK: number;
    spotEbitdaK: number;
  },
): RegimeResolution {
  if (
    params.yearsAvailable > 1 &&
    params.isCurrentYearAnomalous &&
    params.anomalyDirection === 'downside' &&
    params.normalizedEbitdaK > 0 &&
    params.spotEbitdaK < 0
  ) {
    return {
      ...regime,
      labelHe: 'שנה חריגה על רקע היסטוריה רווחית — הערכה לפי EBITDA מנורמלת',
    };
  }
  return regime;
}

/**
 * Builds Hebrew methodology disclosure for loss-making / thin-margin regimes.
 * Uses composed sector weights when provided; otherwise falls back to regime targets.
 */
export function buildProfitabilityMethodologyNoteHe(
  resolution: RegimeResolution,
  composedWeights?: RegimeBlendWeights,
): string | undefined {
  if (resolution.regime === 'healthy') return undefined;

  const blendWeights = composedWeights ?? resolution.blendWeights;
  const { turnaroundYears, labelHe } = resolution;
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
