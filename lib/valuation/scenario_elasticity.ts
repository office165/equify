import type { EquifySectorKey } from '../valuation';
import type { SectorMethodologyConfig } from './sector_methodology_matrix';
import { resolveSectorMethodologyConfig } from './sector_methodology_resolver';

/** Omwise-calibrated SMB revenue anchor (₪36M trailing run-rate). */
export const OMWISE_CALIBRATION_REVENUE_NIS = 36_000_000;

/** Quality Score anchor for ±14% M&A transaction variance (B+ / Omwise deck). */
export const OMWISE_CALIBRATION_QS = 67;

/** Standard implied ± equity variance at {@link OMWISE_CALIBRATION_QS} (Tier 3 mid-market). */
export const OMWISE_BASELINE_VARIANCE_PCT = 0.14;

/** @deprecated Use OMWISE_BASELINE_VARIANCE_PCT — legacy absolute WACC step reference. */
export const OMWISE_BASELINE_WACC_DELTA_PP = 0.5;

/** @deprecated Use OMWISE_BASELINE_VARIANCE_PCT — legacy absolute multiple step reference. */
export const OMWISE_BASELINE_MULTIPLE_DELTA = 0.4;

/** @deprecated Use resolveVarianceRibbon(). */
export const SCENARIO_WACC_DELTA_PP = OMWISE_BASELINE_WACC_DELTA_PP;

/** @deprecated Use resolveVarianceRibbon(). */
export const SCENARIO_MULTIPLE_DELTA = OMWISE_BASELINE_MULTIPLE_DELTA;

export type ValuationTier =
  | 'tier1_enterprise'
  | 'tier2_upper_mid'
  | 'tier3_smb_midmarket';

export interface ScenarioElasticity {
  qualityScore: number;
  /** 1 − QS/100 — execution risk driver for ribbon width. */
  multipleVolatilityFactor: number;
  /** Half-width of equity ribbon as decimal (e.g. 0.14 = ±14%). */
  relativeVariancePct: number;
  bearMultiplier: number;
  bullMultiplier: number;
  valuationTier: ValuationTier;
  /** @deprecated Implied display-only WACC step derived from ribbon. */
  waccDeltaPp: number;
  /** @deprecated Implied display-only multiple step derived from ribbon. */
  multipleDelta: number;
  /** @deprecated Legacy revenue scale factor — ribbon scales via base equity magnitude. */
  valuationScaleFactor: number;
}

export interface VarianceRibbon {
  baseEquityK: number;
  bearEquityK: number;
  bullEquityK: number;
  baseEvK: number;
  bearEvK: number;
  bullEvK: number;
  elasticity: ScenarioElasticity;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function resolveValuationTier(equityK: number): ValuationTier {
  const equityNis = Math.max(equityK, 0) * 1000;
  if (equityNis >= 500_000_000) return 'tier1_enterprise';
  if (equityNis >= 50_000_000) return 'tier2_upper_mid';
  return 'tier3_smb_midmarket';
}

/**
 * Quality Score-Driven relative variance (Elastic Ribbon).
 * At QS=67 → ±14%; higher QS tightens; lower QS widens — scales in ₪ with base equity.
 */
export function computeRelativeVariancePct(params: {
  qualityScore: number;
  sectorConfig: SectorMethodologyConfig;
  calibratedBaseEquityK: number;
}): ScenarioElasticity {
  const qs = clamp(params.qualityScore, 0, 100);
  const multipleVolatilityFactor = 1 - qs / 100;
  const anchorRisk = 1 - OMWISE_CALIBRATION_QS / 100;

  const sectorRiskMod = params.sectorConfig.maxMultipleSpread / 1.25;
  let relativeVariancePct =
    OMWISE_BASELINE_VARIANCE_PCT *
    (multipleVolatilityFactor / Math.max(anchorRisk, 0.05)) *
    sectorRiskMod;

  relativeVariancePct = clamp(relativeVariancePct, 0.06, 0.28);

  const valuationTier = resolveValuationTier(params.calibratedBaseEquityK);

  if (
    valuationTier === 'tier3_smb_midmarket' &&
    qs >= 55 &&
    qs <= 80
  ) {
    relativeVariancePct = OMWISE_BASELINE_VARIANCE_PCT;
  }

  return {
    qualityScore: qs,
    multipleVolatilityFactor,
    relativeVariancePct,
    bearMultiplier: 1 - relativeVariancePct,
    bullMultiplier: 1 + relativeVariancePct,
    valuationTier,
    waccDeltaPp: relativeVariancePct * 100 * 0.35,
    multipleDelta: relativeVariancePct * 3.2,
    valuationScaleFactor: 1,
  };
}

export function resolveScenarioElasticity(params: {
  qualityScore: number;
  sector?: EquifySectorKey;
  revenueK: number;
  calibratedBaseEquityK?: number;
}): ScenarioElasticity {
  const equityK =
    params.calibratedBaseEquityK ??
    Math.max(params.revenueK * 0.5, 1);

  return computeRelativeVariancePct({
    qualityScore: params.qualityScore,
    sectorConfig: resolveSectorMethodologyConfig(params.sector),
    calibratedBaseEquityK: equityK,
  });
}

export function applyVarianceRibbon(params: {
  baseEquityK: number;
  debtK: number;
  elasticity: ScenarioElasticity;
}): Pick<
  VarianceRibbon,
  'baseEquityK' | 'bearEquityK' | 'bullEquityK' | 'baseEvK' | 'bearEvK' | 'bullEvK'
> {
  const { elasticity, baseEquityK, debtK } = params;
  const bearEquityK = Math.max(0, baseEquityK * elasticity.bearMultiplier);
  const bullEquityK = Math.max(0, baseEquityK * elasticity.bullMultiplier);

  return {
    baseEquityK,
    bearEquityK,
    bullEquityK,
    baseEvK: baseEquityK + debtK,
    bearEvK: bearEquityK + debtK,
    bullEvK: bullEquityK + debtK,
  };
}

export function buildVarianceRibbon(params: {
  baseEquityK: number;
  debtK: number;
  qualityScore: number;
  sector?: EquifySectorKey;
  revenueK: number;
}): VarianceRibbon {
  const elasticity = computeRelativeVariancePct({
    qualityScore: params.qualityScore,
    sectorConfig: resolveSectorMethodologyConfig(params.sector),
    calibratedBaseEquityK: params.baseEquityK,
  });

  const envelope = applyVarianceRibbon({
    baseEquityK: params.baseEquityK,
    debtK: params.debtK,
    elasticity,
  });

  return { ...envelope, elasticity };
}

/** @deprecated Use relativeVariancePct from resolveScenarioElasticity(). */
export function computeValuationScaleFactor(revenueK: number): number {
  const revNis = Math.max(revenueK * 1000, 1);
  const ratio = revNis / OMWISE_CALIBRATION_REVENUE_NIS;
  const logScale = Math.log10(Math.max(ratio, 0.01));
  return clamp(1 - logScale * 0.12, 0.65, 1.35);
}

/** @deprecated Use resolveScenarioElasticity(). */
export function computeScenarioElasticity(params: {
  qualityScore: number;
  sectorConfig: SectorMethodologyConfig;
  revenueK: number;
}): ScenarioElasticity {
  return computeRelativeVariancePct({
    qualityScore: params.qualityScore,
    sectorConfig: params.sectorConfig,
    calibratedBaseEquityK: Math.max(params.revenueK * 0.5, 1),
  });
}

export function scenarioWaccOffsetPp(
  scenario: 'bear' | 'base' | 'bull',
  elasticity: ScenarioElasticity,
): number {
  if (scenario === 'bear') return elasticity.waccDeltaPp;
  if (scenario === 'bull') return -elasticity.waccDeltaPp;
  return 0;
}
