import type { ValuationInputs } from '../valuation';
import { resolveCurrentYearEbitdaK } from './backlog_metrics';

/**
 * Normalized (Maintainable) EBITDA — Big-4 standard methodology.
 *
 * Financial rationale (PwC/Deloitte practice, Damodaran "normalized earnings"):
 * A single anomalous year (war, pandemic, one-off event) must not dominate
 * the valuation when a longer profitable track record exists. Conversely,
 * chronic losses must not be masked by one good historical year.
 */
export interface NormalizedEbitdaResult {
  normalizedEbitdaK: number;
  isCurrentYearAnomalous: boolean;
  anomalyDirection: 'downside' | 'upside' | null;
  weightsUsed: { prior2: number; prior1: number; current: number };
  yearsAvailable: number;
  spotEbitdaK: number;
  historicalAvgMarginPct: number | null;
  explanationHe: string;
}

export function computeNormalizedEbitda(params: {
  currentEbitdaK: number;
  currentRevenueK: number;
  prior1EbitdaK?: number;
  prior1RevenueK?: number;
  prior2EbitdaK?: number;
  prior2RevenueK?: number;
}): NormalizedEbitdaResult {
  const { currentEbitdaK, currentRevenueK } = params;
  const hasPrior1 =
    Number.isFinite(params.prior1EbitdaK) && (params.prior1RevenueK ?? 0) > 0;
  const hasPrior2 =
    Number.isFinite(params.prior2EbitdaK) && (params.prior2RevenueK ?? 0) > 0;

  if (!hasPrior1 && !hasPrior2) {
    return {
      normalizedEbitdaK: currentEbitdaK,
      isCurrentYearAnomalous: false,
      anomalyDirection: null,
      weightsUsed: { prior2: 0, prior1: 0, current: 1 },
      yearsAvailable: 1,
      spotEbitdaK: currentEbitdaK,
      historicalAvgMarginPct: null,
      explanationHe: 'ללא נתוני עבר — ההערכה מבוססת על השנה הנוכחית בלבד',
    };
  }

  const currentMargin =
    currentRevenueK > 0 ? currentEbitdaK / currentRevenueK : 0;
  const histMargins: number[] = [];
  if (hasPrior1) histMargins.push(params.prior1EbitdaK! / params.prior1RevenueK!);
  if (hasPrior2) histMargins.push(params.prior2EbitdaK! / params.prior2RevenueK!);
  const histAvgMargin = histMargins.reduce((a, b) => a + b, 0) / histMargins.length;

  const marginGap = Math.abs(currentMargin - histAvgMargin);
  const relativeDeviation =
    Math.abs(histAvgMargin) > 0.001
      ? marginGap / Math.abs(histAvgMargin)
      : marginGap > 0.08
        ? 1
        : 0;
  const isAnomalous = relativeDeviation > 0.6 && marginGap > 0.08;
  const anomalyDirection = !isAnomalous
    ? null
    : currentMargin < histAvgMargin
      ? 'downside'
      : 'upside';

  const weights = !isAnomalous
    ? {
        prior2: hasPrior2 ? 0.3 : 0,
        prior1: hasPrior1 ? (hasPrior2 ? 0.3 : 0.45) : 0,
        current: hasPrior2 && hasPrior1 ? 0.4 : 0.55,
      }
    : {
        prior2: hasPrior2 ? 0.35 : 0,
        prior1: hasPrior1 ? (hasPrior2 ? 0.4 : 0.55) : 0,
        current: hasPrior2 && hasPrior1 ? 0.25 : 0.45,
      };

  const wSum = weights.prior2 + weights.prior1 + weights.current;
  weights.prior2 /= wSum;
  weights.prior1 /= wSum;
  weights.current /= wSum;

  const normalizedEbitdaK =
    (params.prior2EbitdaK ?? 0) * weights.prior2 +
    (params.prior1EbitdaK ?? 0) * weights.prior1 +
    currentEbitdaK * weights.current;

  const explanationHe =
    isAnomalous && anomalyDirection === 'downside'
      ? 'השנה הנוכחית זוהתה כחריגה (ירידה חדה מהממוצע ההיסטורי) — EBITDA מנורמלת חושבה בשקלול מוגבר של שנות העבר, בהתאם למתודולוגיית Normalized EBITDA המקובלת'
      : isAnomalous
        ? 'השנה הנוכחית זוהתה כחריגה כלפי מעלה — שקלול שמרני עם שנות העבר'
        : 'EBITDA מנורמלת: ממוצע משוקלל של שלוש שנים';

  return {
    normalizedEbitdaK,
    isCurrentYearAnomalous: isAnomalous,
    anomalyDirection,
    weightsUsed: weights,
    yearsAvailable: 1 + (hasPrior1 ? 1 : 0) + (hasPrior2 ? 1 : 0),
    spotEbitdaK: currentEbitdaK,
    historicalAvgMarginPct: Math.round(histAvgMargin * 1000) / 10,
    explanationHe,
  };
}

/** Maps valuation inputs to normalized EBITDA — single SSOT for regime + multiple leg. */
export function resolveNormalizedEbitdaFromInputs(
  inputs: Pick<
    ValuationInputs,
    | 'ebitda2024K'
    | 'ebitda2025K'
    | 'ebitda2026K'
    | 'revenue2024K'
    | 'revenue2025K'
    | 'revenue2026K'
    | 'rev'
    | 'margin'
  >,
): NormalizedEbitdaResult {
  const currentRevenueK = inputs.revenue2026K ?? inputs.rev ?? 0;
  const currentEbitdaK =
    inputs.ebitda2026K ?? resolveCurrentYearEbitdaK(inputs);

  return computeNormalizedEbitda({
    currentEbitdaK,
    currentRevenueK,
    prior1EbitdaK: inputs.ebitda2025K,
    prior1RevenueK: inputs.revenue2025K,
    prior2EbitdaK: inputs.ebitda2024K,
    prior2RevenueK: inputs.revenue2024K,
  });
}

/** Hebrew disclosure line for report / live panel when history exists. */
export function buildNormalizedEbitdaNoteHe(
  normalized: NormalizedEbitdaResult,
  inputs: Pick<
    ValuationInputs,
    'ebitda2024K' | 'ebitda2025K' | 'ebitda2026K'
  >,
  fmtK: (k: number) => string,
): string | undefined {
  if (normalized.yearsAvailable <= 1) return undefined;

  const w = normalized.weightsUsed;
  const lines: string[] = ['EBITDA מנורמלת (מתודולוגיית Big-4)'];

  if (w.prior2 > 0 && inputs.ebitda2024K != null) {
    lines.push(
      `2024: ${fmtK(inputs.ebitda2024K)} (${Math.round(w.prior2 * 100)}%)`,
    );
  }
  if (w.prior1 > 0 && inputs.ebitda2025K != null) {
    lines.push(
      `2025: ${fmtK(inputs.ebitda2025K)} (${Math.round(w.prior1 * 100)}%)`,
    );
  }
  if (inputs.ebitda2026K != null) {
    lines.push(
      `2026: ${fmtK(inputs.ebitda2026K)} (${Math.round(w.current * 100)}%)`,
    );
  }

  lines.push(`→ EBITDA מנורמלת: ${fmtK(normalized.normalizedEbitdaK)}`);
  if (normalized.isCurrentYearAnomalous) {
    lines.push('⚠ השנה הנוכחית זוהתה כחריגה — שקלול מוגבר לשנות העבר');
  }

  return lines.join(' · ');
}
