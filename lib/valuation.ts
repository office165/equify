import type { ValuationLocale } from '../api_client';
import type { CompactAmountUnit } from './utils/formatCurrency';
import { formatCompactAmount, splitCompactAmount } from './utils/formatCurrency';
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
  applyBacklogInflectionAccelerator,
  BACKLOG_INFLECTION_TARGETS,
} from './valuation/backlog_inflection_accelerator';
export { createValuationStrategy } from './valuation/strategies/valuation_strategy';
export {
  computeValuation,
  computeScenarios,
  runValuationEngine,
} from './valuation/valuation_engine';
export {
  computeValuation as calculateValuation,
  runValuationEngine as runValuation,
} from './valuation/valuationEngine';
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
  | 'energy'
  | 'defense_aerospace'
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
  sectorMult: number;
  subSectorMult?: number;
  lifecycleAdj: number;
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
}

export interface ValuationComputed {
  ebitda: number;
  ebitdaBlend: EbitdaBlendBreakdown;
  wacc: number;
  qs: number;
  qsGrade: QualityGrade;
  effectiveMult: number;
  ebtMult: number;
  revMult: number;
  revMultiplier: number;
  dcf: number;
  ev: number;
  equity: number;
  blendWeights: { dcf: number; ebitda: number; rev: number };
  dcfGrowthPct: number;
  baseEbitdaForMultiple: number;
  /** 0 or 1 — backlog inflection methodology engaged. */
  inflectionIntensity: number;
  methodologyStrategy: ValuationStrategyKind;
  /** True when backlog_signed / revenue_2026 >= 0.5 drives 70/30 DCF/EBITDA weighting. */
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
  energy: 1.1,
  defense_aerospace: 1.28,
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

/** Compact display from internal ₪K storage (×1000 → absolute NIS thresholds). */
function formatKAmount(k: number): string {
  if (!Number.isFinite(k)) return '—';
  return formatCompactAmount(k * 1000);
}

export function fmtK(k: number, locale: ValuationLocale = 'he'): string {
  const amount = formatKAmount(k);
  const sym = '₪';
  return locale === 'he' ? `${amount} ${sym}` : `${sym}${amount}`;
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
): string {
  return fmtK(equityK, locale);
}

export function fmtMillionParts(
  locale: ValuationLocale,
  valueNis?: number,
): { prefix: string; suffix: string; amount: string } {
  const { amount, unit } =
    valueNis != null && Number.isFinite(valueNis)
      ? splitCompactAmount(valueNis)
      : { amount: '', unit: 'M' as CompactAmountUnit };
  const scale = unit || 'M';
  const sym = '₪';
  if (locale === 'he') {
    return { prefix: '', suffix: `${scale} ${sym}`, amount };
  }
  return { prefix: sym, suffix: scale, amount };
}

export function terminalValuePct(dcf: number): number {
  if (dcf <= 0) return 0;
  return Math.round(((dcf * 0.57) / dcf) * 100);
}

export {
  capGrowthPctForSector,
  getBlendWeights,
  getSectorValuationConfig,
  SECTOR_VALUATION_CONFIGS,
} from './valuation/sector_configs';
