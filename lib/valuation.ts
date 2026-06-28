import type { ValuationLocale } from '../api_client';
import type { CompactAmountUnit } from './utils/formatCurrency';
import {
  formatCurrency,
  formatCurrencyShort,
  getCurrencySymbol,
  normalizeCurrencyCode,
  splitCompactAmount,
  type ReportingCurrencyCode,
} from './utils/formatCurrency';
import type { CalibratedYearSlice } from './valuation/adaptive_calibration';
import type { EbitdaBlendBreakdown } from './valuation/blended_ebitda';
import type { ValuationStrategyKind } from './valuation/sector_methodology_matrix';

export type { EbitdaBlendBreakdown } from './valuation/blended_ebitda';
export { BLENDED_EBITDA_WEIGHTS } from './valuation/blended_ebitda';
export type { SectorMethodologyKey, ValuationStrategyKind } from './valuation/sector_methodology_matrix';
export {
  sectorConfigs,
  SECTOR_METHODOLOGY_MATRIX,
} from './valuation/sector_methodology_matrix';
export {
  EQUIFY_SECTOR_TO_METHODOLOGY,
  resolveSectorMethodologyConfig,
  resolveSectorMethodologyKey,
} from './valuation/sector_methodology_resolver';
export {
  resolveActiveEffectiveMultiple,
  resolveConfiguredDefaultMultiple,
  type ActiveMultipleResolution,
} from './valuation/multiple_override';
export {
  resolveSubSectorDefaultMultiple,
  type SubSectorMarketMultiples,
} from './valuation/sub_sector_default_multiple';
export {
  applyBacklogInflectionAccelerator,
  BACKLOG_INFLECTION_TARGETS,
} from './valuation/backlog_inflection_accelerator';
export {
  DEFAULT_VALUATION_BLEND_WEIGHTS,
  VALUATION_WEIGHTS_REGISTRY,
  assertSubSectorBlendWeightsSum,
  lookupSubSectorBlendWeights,
  resolveValuationBlendWeights,
  type EngineBlendWeights,
  type SubSectorBlendWeightEntry,
} from './valuation/valuation_weights_registry';
export { createValuationStrategy } from './valuation/strategies/valuation_strategy';
export {
  CAPM_CORPORATE_TAX_RATE,
  CAPM_DEFAULT_UNLEVERED_BETA,
  CAPM_EQUITY_RISK_PREMIUM_PCT,
  CAPM_RISK_FREE_RATE_PCT,
  CAPM_WACC_MAX_PCT,
  CAPM_WACC_MIN_PCT,
  LIFECYCLE_SIZE_ALPHA_PCT,
  computeCapmWacc,
  computeLeveredBeta,
  resolveEquityProxyK,
  resolveLifecycleStage,
  type CapmWaccParams,
  type CapmWaccResult,
  type WaccBreakdown,
} from './valuation/capm_wacc';
export {
  computeValuation,
  computeScenarios,
  runValuationEngine,
} from './valuation/valuation_engine';
export {
  applyReportingFxLayer,
  applyReportingFxToComputed,
  applyReportingFxToScenarios,
  convertEngineKToReportingK,
} from './valuation/apply_reporting_fx';
export {
  getCachedFxRates,
  prefetchFxRates,
  refreshFxRates,
  STATIC_FX_FROM_ILS,
  VALUATION_BASE_CURRENCY,
} from './utils/fxService';
export {
  computeValuation as calculateValuation,
  runValuationEngine as runValuation,
} from './valuation/valuationEngine';
export {
  buildValuationScenarios,
  computeDcfWithGrowthDecay,
  computeInitialFcffK,
  explicitGrowthRateForYear,
  projectDcfHorizon,
  resolveDcfGrowthPct,
  OMWISE_BASELINE_MULTIPLE_DELTA,
  OMWISE_BASELINE_VARIANCE_PCT,
  OMWISE_BASELINE_WACC_DELTA_PP,
  OMWISE_CALIBRATION_QS,
  OMWISE_CALIBRATION_REVENUE_NIS,
  SCENARIO_MULTIPLE_DELTA,
  SCENARIO_WACC_DELTA_PP,
  TERMINAL_GROWTH_RATE,
  applyVarianceRibbon,
  buildVarianceRibbon,
  calibrateCenterOfGravity,
  computeRelativeVariancePct,
  computeScenarioElasticity,
  computeValuationScaleFactor,
  resolveScenarioElasticity,
  resolveValuationTier,
  scenarioWaccOffsetPp,
  type ScenarioElasticity,
  type ValuationTier,
  type VarianceRibbon,
  type CenterOfGravityCalibration,
} from './valuation/scenario_matrix';
export {
  applySectorMarginGuardrails,
  computeDynamicMultiple,
  computeInflectionForwardEbitda2027K,
  type CalibrationWarning,
  type CalibratedYearSlice,
} from './valuation/adaptive_calibration';

/**
 * Equify valuation — public types, constants, and engine re-exports.
 */

export type EquifySectorKey =
  | 'hospitality'
  | 'saas'
  | 'fintech'
  | 'cyber'
  | 'health'
  | 'services'
  | 'industry'
  | 'ecom'
  | 'retail_trade'
  | 'food_service'
  | 'energy'
  | 'defense_aerospace'
  | 'real_estate'
  | 'other';

export type EquifyLifecycleKey = 'seed' | 'early' | 'growth' | 'mature';

export type EquifyGoalKey =
  | 'negotiation'
  | 'fundraise'
  | 'partner'
  | 'bank'
  | 'internal'
  | 'legal'
  | '';

export type QualityGrade = 'A' | 'A−' | 'B+' | 'B' | 'B−' | 'C+';

/** Wizard / API raw inputs — monetary values in ₪K unless noted as %. */
export interface ValuationInputs {
  rev: number;
  margin: number;
  growth: number;
  debt: number;
  sector?: EquifySectorKey;
  /** Wizard sub-sector id — drives injected engine defaults from industry_config. */
  subSector?: string;
  sectorMult: number;
  subSectorMult?: number;
  lifecycle?: EquifyLifecycleKey;
  lifecycleAdj: number;
  /** Live sector unlevered beta (βu) — CAPM levering input. */
  unleveredBeta?: number;
  recurring: number;
  topCustomer: number;
  founderDep: boolean;
  competition: boolean;
  ip: boolean;
  contracts: boolean;
  normalizedOwnerSalary?: number;
  capexLevelPct?: number;
  grossDebt?: number;
  cash?: number;
  ebitda2024K?: number;
  ebitda2025K?: number;
  ebitda2026K?: number;
  revenue2024K?: number;
  revenue2025K?: number;
  revenue2026K?: number;
  ebitda2027K?: number | null;
  /** User-entered forward EBITDA projections (₪K), index 0 = NTM year 1, 1 = year 2. */
  projectedEbitdaK?: number[];
  /** Contracted forward backlog (₪K) — ratio vs revenue_2026 triggers inflection. */
  backlogSignedK?: number;
  /** @deprecated Derived from backlogSignedK / revenue2026K >= 0.5 */
  hasSignificantBacklog?: boolean;
  /** Expert manual multiple (×) when {@link isManualMultiple} is true. */
  customMultiple?: number | null;
  /** When true, {@link customMultiple} replaces the automatic sector multiple baseline. */
  isManualMultiple?: boolean;
  /** Live EV/EBITDA (×) from wizard market context — sub-sector default baseline. */
  marketEvEbitda?: number;
  /** Live EV/Revenue (×) from wizard market context — sub-sector default baseline. */
  marketEvRevenue?: number;
}

export interface ValuationComputed {
  ebitda: number;
  ebitdaBlend: EbitdaBlendBreakdown;
  wacc: number;
  /** CAPM actuarial layer — Rf, βL, ERP, Alpha, Ke, Kd (% points). */
  waccBreakdown: {
    rf: number;
    leveredBeta: number;
    erp: number;
    alpha: number;
    ke: number;
    kd: number;
  };
  qs: number;
  qsGrade: QualityGrade;
  effectiveMult: number;
  /** Sector-calibrated multiple before expert manual override. */
  automaticEffectiveMult: number;
  /** Sub-sector default multiple from industry_config / market context (×). */
  configuredDefaultMultiple: number;
  /** True when expert manual override is active. */
  isManualMultiple: boolean;
  ebtMult: number;
  revMult: number;
  revMultiplier: number;
  dcf: number;
  ev: number;
  equity: number;
  /** Pre-calibration engine output (trailing run-rate). */
  rawEv?: number;
  rawEquity?: number;
  centerOfGravityFactor?: number;
  forwardRunRateK?: number;
  blendWeights: { dcf: number; ebitda: number; rev: number };
  dcfGrowthPct: number;
  baseEbitdaForMultiple: number;
  /** 0 or 1 — backlog inflection methodology engaged. */
  inflectionIntensity: number;
  methodologyStrategy: ValuationStrategyKind;
  /** True when backlog_signed / revenue_2026 >= 0.5 — WACC mitigation only (weights from registry). */
  backlogInflectionActive: boolean;
  backlogRatio: number;
  /** Engine winsorization / inflection diagnostics for PDF & UI sync. */
  calibrationWarnings: string[];
  calibratedYears?: {
    y2024: CalibratedYearSlice;
    y2025: CalibratedYearSlice;
    y2026: CalibratedYearSlice;
  };
  historicalAvgMarginPct: number;
  forwardEbitda2027K: number;
  waccBacklogAdjustment: number;
  multipleBase: number;
  multipleConcentrationPenalty: number;
}

export interface ScenarioRow {
  label: 'bear' | 'base' | 'bull';
  growthPct: number;
  ebitdaAdj: string;
  waccPct: number;
  multDisplay: string;
  ev: number;
  equity: number;
}

export interface ValuationScenarios {
  bearEv: number;
  bullEv: number;
  bearEq: number;
  bullEq: number;
  baseEq: number;
  rows: ScenarioRow[];
  /** QS-driven relative variance ribbon parameters. */
  elasticity?: import('./valuation/scenario_elasticity').ScenarioElasticity;
  /** Forward run-rate center-of-gravity calibration. */
  centerOfGravity?: import('./valuation/base_case_calibration').CenterOfGravityCalibration;
}

export const SECTOR_MULTIPLIERS: Record<EquifySectorKey, number> = {
  hospitality: 1.05,
  saas: 1.4,
  fintech: 1.5,
  cyber: 1.45,
  health: 1.3,
  services: 1.0,
  industry: 0.88,
  ecom: 0.95,
  retail_trade: 0.92,
  food_service: 0.82,
  energy: 1.1,
  defense_aerospace: 1.28,
  real_estate: 1.05,
  other: 1.0,
};

export const LIFECYCLE_ADJ: Record<EquifyLifecycleKey, number> = {
  seed: -0.1,
  early: 0,
  growth: 0.08,
  mature: 0.04,
};

export function qualityScoreGrade(qs: number): QualityGrade {
  if (qs >= 85) return 'A';
  if (qs >= 75) return 'A−';
  if (qs >= 65) return 'B+';
  if (qs >= 55) return 'B';
  if (qs >= 45) return 'B−';
  return 'C+';
}


export function fmtK(
  k: number,
  locale: ValuationLocale = 'he',
  currency: ReportingCurrencyCode = 'ILS',
): string {
  if (!Number.isFinite(k)) return '—';
  void locale;
  return formatCurrencyShort(k * 1000, currency);
}

/** Numeric portion for split hero displays (amount without B/M/K suffix). */
export function fmtM(k: number): string {
  return splitCompactAmount(k * 1000).amount;
}

/** Scale suffix for split hero displays paired with {@link fmtM}. */
export function fmtMScale(k: number): CompactAmountUnit {
  const unit = splitCompactAmount(k * 1000).unit;
  return unit || 'M';
}

export function fmtEquitySidebarM(
  equityK: number,
  locale: ValuationLocale = 'he',
  currency: ReportingCurrencyCode = 'ILS',
): string {
  return fmtK(equityK, locale, currency);
}

export function fmtMillionParts(
  locale: ValuationLocale,
  valueNis?: number,
  currency: ReportingCurrencyCode = 'ILS',
): { prefix: string; suffix: string; amount: string } {
  const { amount, unit } =
    valueNis != null && Number.isFinite(valueNis)
      ? splitCompactAmount(valueNis)
      : { amount: '', unit: 'M' as CompactAmountUnit };
  const scale = unit || 'M';
  const code = normalizeCurrencyCode(currency);
  const sym = getCurrencySymbol(code);

  if (code === 'ILS') {
    void locale;
    return { prefix: '', suffix: `${scale} ${sym}`, amount };
  }

  return { prefix: sym, suffix: scale, amount };
}

export function terminalValuePct(dcf: number): number {
  if (dcf <= 0) return 0;
  return Math.round(((dcf * 0.57) / dcf) * 100);
}

export type { ReportingCurrencyCode } from './utils/formatCurrency';
export {
  formatCurrency,
  formatCurrencyShort,
  formatCurrencyNarrativeHe,
  formatReportEvHeader,
  formatReportMillionsUnit,
  getCurrencyNameHebrew,
  getCurrencySymbol,
  normalizeCurrencyCode,
} from './utils/formatCurrency';

export {
  capGrowthPctForSector,
  getBlendWeights,
  getSectorValuationConfig,
  SECTOR_VALUATION_CONFIGS,
} from './valuation/sector_configs';
