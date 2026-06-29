import type { ValuationInputs } from '../valuation';
import type { SectorMethodologyConfig } from './sector_methodology_matrix';

export interface CalibrationWarning {
  code: 'margin_winsorized' | 'owner_salary_normalized';
  year?: '2024' | '2025' | '2026';
  inputMarginPct?: number;
  clampedMarginPct?: number;
  message: string;
}

export interface CalibratedYearSlice {
  revenueK: number;
  ebitdaK: number;
  /** Reported margin (EBITDA / Revenue) × 100 after any winsorization. */
  marginPct: number;
}

export interface CalibratedFinancialInputs {
  inputs: ValuationInputs;
  warnings: CalibrationWarning[];
  calibratedYears: {
    y2024: CalibratedYearSlice;
    y2025: CalibratedYearSlice;
    y2026: CalibratedYearSlice;
  };
  /** Mean of per-year margins (post-guardrail) where revenue > 0. */
  historicalAvgMarginPct: number;
}

export interface DynamicMultipleResult {
  multiple: number;
  baseMultiple: number;
  concentrationPenalty: number;
  customerConcentrationRatio: number;
}

function isPositiveFinite(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

function safeK(n: number | undefined | null): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

/**
 * Soft margin cap — excess above institutional max preserved at 30% weight.
 * Damodaran-style: extreme margins are damped, not discarded.
 */
export function winsorizeEbitdaMargin(
  rawMarginDecimal: number,
  maxHistoricalMargin: number,
): number {
  if (rawMarginDecimal <= maxHistoricalMargin) return rawMarginDecimal;
  const excess = rawMarginDecimal - maxHistoricalMargin;
  return maxHistoricalMargin + excess * 0.3;
}

function winsorizeYear(
  year: '2024' | '2025' | '2026',
  revenueK: number,
  ebitdaK: number,
  maxHistoricalMargin: number,
): { slice: CalibratedYearSlice; warning?: CalibrationWarning } {
  const rev = safeK(revenueK);
  const ebitda = safeK(ebitdaK);

  if (rev <= 0) {
    return {
      slice: { revenueK: rev, ebitdaK: ebitda, marginPct: 0 },
    };
  }

  const inputMarginDecimal = ebitda / rev;
  const inputMarginPct = inputMarginDecimal * 100;

  if (inputMarginDecimal <= maxHistoricalMargin) {
    return {
      slice: { revenueK: rev, ebitdaK: ebitda, marginPct: inputMarginPct },
    };
  }

  const winsorizedMarginDecimal = winsorizeEbitdaMargin(
    inputMarginDecimal,
    maxHistoricalMargin,
  );
  const clampedEbitda = rev * winsorizedMarginDecimal;
  const clampedMarginPct = winsorizedMarginDecimal * 100;

  return {
    slice: {
      revenueK: rev,
      ebitdaK: clampedEbitda,
      marginPct: clampedMarginPct,
    },
    warning: {
      code: 'margin_winsorized',
      year,
      inputMarginPct,
      clampedMarginPct,
      message: `[equify-calibration] ${year} EBITDA margin ${inputMarginPct.toFixed(1)}% exceeds sector cap ${(maxHistoricalMargin * 100).toFixed(1)}% — soft-winsorized to ${clampedMarginPct.toFixed(1)}%.`,
    },
  };
}

function meanMarginPct(years: CalibratedYearSlice[]): number {
  const margins = years
    .filter((y) => y.revenueK > 0)
    .map((y) => y.marginPct);
  if (!margins.length) return 0;
  return margins.reduce((sum, m) => sum + m, 0) / margins.length;
}

/**
 * Sector Margin Guardrails — winsorize per-year EBITDA when margin exceeds
 * sectorConfigs.maxHistoricalMargin before any DCF / multiple math runs.
 */
export function applySectorMarginGuardrails(
  inputs: ValuationInputs,
  config: SectorMethodologyConfig,
): CalibratedFinancialInputs {
  const maxMargin = config.maxHistoricalMargin;
  const rev2024 = safeK(inputs.revenue2024K);
  const rev2025 = safeK(inputs.revenue2025K);
  const rev2026 = safeK(inputs.revenue2026K ?? inputs.rev);

  const y2024 = winsorizeYear('2024', rev2024, safeK(inputs.ebitda2024K), maxMargin);
  const y2025 = winsorizeYear('2025', rev2025, safeK(inputs.ebitda2025K), maxMargin);
  const y2026 = winsorizeYear(
    '2026',
    rev2026,
    safeK(inputs.ebitda2026K ?? (rev2026 > 0 ? rev2026 * (inputs.margin / 100) : 0)),
    maxMargin,
  );

  const warnings = [y2024.warning, y2025.warning, y2026.warning].filter(
    (w): w is CalibrationWarning => Boolean(w),
  );

  const calibratedYears = {
    y2024: y2024.slice,
    y2025: y2025.slice,
    y2026: y2026.slice,
  };
  const historicalAvgMarginPct = meanMarginPct([
    calibratedYears.y2024,
    calibratedYears.y2025,
    calibratedYears.y2026,
  ]);

  const revK = calibratedYears.y2026.revenueK || safeK(inputs.rev);
  const marginPct =
    calibratedYears.y2026.revenueK > 0
      ? calibratedYears.y2026.marginPct
      : historicalAvgMarginPct || inputs.margin;

  const calibratedInputs: ValuationInputs = {
    ...inputs,
    rev: revK,
    margin: marginPct,
    revenue2026K: revK,
    revenue2024K: calibratedYears.y2024.revenueK,
    revenue2025K: calibratedYears.y2025.revenueK,
    ebitda2024K: calibratedYears.y2024.ebitdaK || inputs.ebitda2024K,
    ebitda2025K: calibratedYears.y2025.ebitdaK || inputs.ebitda2025K,
    ebitda2026K: calibratedYears.y2026.ebitdaK || inputs.ebitda2026K,
  };

  for (const warning of warnings) {
    console.warn(warning.message);
  }

  return {
    inputs: calibratedInputs,
    warnings,
    calibratedYears,
    historicalAvgMarginPct,
  };
}

/**
 * Smooth customer-concentration multiple penalty — sqrt curve (Damodaran specific-risk).
 * 20% top customer → ~8.9% of base multiple; capped at 22% of base.
 */
export function computeConcentrationPenalty(
  topCustomerPct: number,
  baseMultiple: number,
): number {
  if (topCustomerPct <= 0) return 0;
  const penaltyPct = 0.02 * Math.sqrt(topCustomerPct);
  return baseMultiple * Math.min(penaltyPct, 0.22);
}

/**
 * Smooth WACC concentration premium (pp) — replaces discrete 20%/40% steps.
 */
export function computeConcentrationWaccPremium(topCustomerPct: number): number {
  if (topCustomerPct <= 0) return 0;
  return Math.min(0.008 * Math.sqrt(topCustomerPct), 0.012);
}

/**
 * Dynamic Multiple Linear Interpolation — Quality Score maps linearly between
 * sector min/max; customer concentration applies a smooth sqrt penalty.
 */
export function computeDynamicMultiple(params: {
  config: SectorMethodologyConfig;
  qualityScore: number;
  /** Top customer share 0–100 (%). */
  topCustomerPct: number;
  /** Tier-1 defense / anchor contracts — softens concentration penalty. */
  tier1Contracts?: boolean;
  backlogInflectionActive?: boolean;
}): DynamicMultipleResult {
  const { config, qualityScore, topCustomerPct, tier1Contracts = false } = params;
  const qs = Math.max(0, Math.min(100, qualityScore));
  const customerConcentrationRatio = Math.max(0, topCustomerPct) / 100;

  const baseMultiple =
    config.minMultiple +
    (qs / 100) * (config.maxMultiple - config.minMultiple);

  let concentrationPenalty = computeConcentrationPenalty(topCustomerPct, baseMultiple);
  if (tier1Contracts) {
    concentrationPenalty *= 0.35;
  }

  const multiple = Math.max(
    config.minMultiple * 0.78,
    baseMultiple - concentrationPenalty,
  );

  return {
    multiple,
    baseMultiple,
    concentrationPenalty,
    customerConcentrationRatio,
  };
}

/**
 * @deprecated Backlog no longer drives 2027F EBITDA — use computeOrganicForwardEbitda2027K.
 * Kept for legacy callers; returns organic forward EBITDA from margin only.
 */
export function computeInflectionForwardEbitda2027K(
  historicalAvgMarginPct: number,
  backlogSignedK: number,
): number {
  if (!isPositiveFinite(backlogSignedK)) return 0;
  const marginDecimal = historicalAvgMarginPct / 100;
  return backlogSignedK * marginDecimal;
}
