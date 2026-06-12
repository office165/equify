/**
 * Israeli market multiples valuation engine (2024–2026).
 * Runs alongside the existing DCF / forecast matrix — does not replace it.
 */

import type { ValuationWizardFormValues } from '../../ValuationWizard';
import { parseFinancialInput } from '../utils/financialParser';
import { formatILS } from '../utils/formatCurrency';
import {
  calculateValuationRange,
  getMedianMultiple,
  INDUSTRY_GROWTH_RATES,
  ISRAEL_MULTIPLES_2026,
  selectPrimaryMultiple,
  type Industry,
  type LifecycleStage,
  type MultiplesRange,
  type PrimaryMultipleKey,
  type SelectedMultiple,
  type ValuationRangeResult,
} from './multiples';

export type { Industry, LifecycleStage, MultiplesRange, SelectedMultiple, ValuationRangeResult };
export { INDUSTRY_GROWTH_RATES, ISRAEL_MULTIPLES_2026 };

const VALUATION_YEAR = 2026;
const METHODOLOGY_NOTE_HE =
  'הערכה זו מבוססת על נתוני שוק ישראלי 2024–2026 ומשקפת פרמיית אי-סחירות של 20%';

export interface MultiplesAnalysisSnapshot {
  valuationRange: ValuationRangeResult;
  selectedMultiple: SelectedMultiple;
  multiplesUsed: MultiplesRange;
  industry: Industry;
  lifecycleStage: LifecycleStage;
  metricValue: number;
  medianMultiple: number;
  normalizedEbitda: number;
  forwardEbitda: number;
  comparisonGroup: string;
  sanityCheck: string;
  methodologyNote: string;
}

function parseWizardNumber(value: string, fallback = 0): number {
  if (!value.trim()) return fallback;
  const n = parseFinancialInput(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Map wizard industry codes to Israeli multiples taxonomy. */
export function mapWizardIndustry(industry: string): Industry {
  const key = industry.trim();
  const mapping: Record<string, Industry> = {
    'Software/SaaS': 'saas',
    FinTech: 'fintech',
    HealthTech: 'healthtech',
    Biotech: 'healthtech',
    Cybersecurity: 'cyber',
    'E-Commerce': 'retail',
    'Hardware & IoT': 'manufacturing',
    'Professional Services': 'professional_services',
    Industrial: 'manufacturing',
    'Defense & Military': 'defense',
    renewable_energy: 'energy',
    Other: 'other',
  };
  return mapping[key] ?? 'other';
}

/** Map wizard lifecycle stage; defaults to growth when unset. */
export function mapWizardLifecycle(stage: string): LifecycleStage {
  if (
    stage === 'seed' ||
    stage === 'early' ||
    stage === 'growth' ||
    stage === 'mature' ||
    stage === 'distressed'
  ) {
    return stage;
  }
  return 'growth';
}

function resolveYearsOfHistory(foundedYear: string): number {
  const year = parseInt(foundedYear.trim(), 10);
  if (!Number.isFinite(year) || year < 1800 || year > VALUATION_YEAR) {
    return 3;
  }
  return Math.max(1, VALUATION_YEAR - year);
}

function resolveMetricValue(
  multipleKey: PrimaryMultipleKey,
  revenue: number,
  ebitda: number,
  ebita: number,
  forwardEbitda: number,
): number {
  switch (multipleKey) {
    case 'evSales':
      return revenue;
    case 'evEbitda':
      return forwardEbitda > 0 ? forwardEbitda : ebitda;
    case 'evEbita':
      return ebita > 0 ? ebita : forwardEbitda * 0.85;
    default:
      return revenue;
  }
}

function buildComparisonGroup(industry: Industry, stage: LifecycleStage): string {
  const industryLabels: Record<Industry, string> = {
    saas: 'SaaS / תוכנה',
    fintech: 'פינטק',
    healthtech: 'HealthTech',
    cyber: 'סייבר',
    realestate: 'נדל"ן',
    construction: 'בנייה',
    manufacturing: 'ייצור',
    retail: 'קמעונאות',
    food: 'מזון',
    professional_services: 'שירותים מקצועיים',
    defense: 'ביטחון',
    energy: 'אנרגיה',
    other: 'אחר',
  };
  const stageLabels: Record<LifecycleStage, string> = {
    seed: 'Seed',
    early: 'Early',
    growth: 'Growth',
    mature: 'Mature',
    distressed: 'Distressed',
  };
  return `${industryLabels[industry]} · ${stageLabels[stage]}`;
}

function buildSanityCheck(
  range: ValuationRangeResult,
  metric: number,
  medianMultiple: number,
  label: string,
): string {
  if (metric <= 0) {
    return 'מאפיין פיננסי חלש — טווח מבוסס על אנכור שוק מינימלי.';
  }
  const implied = metric * medianMultiple;
  const spread = range.high > 0 ? ((range.high - range.low) / range.high) * 100 : 0;
  return `אימות: ${label} × ${medianMultiple.toFixed(1)}x ≈ ${formatILS(implied, { short: true })}; פיזור טווח ~${spread.toFixed(0)}%.`;
}

/**
 * Run Israeli multiples framework for wizard intake.
 * All private companies receive a 20% illiquidity discount (default).
 */
export function runIsraelMultiplesValuation(
  wizard: ValuationWizardFormValues,
  options?: { stage?: LifecycleStage; isPrivate?: boolean },
): MultiplesAnalysisSnapshot {
  const industry = mapWizardIndustry(wizard.industry);
  const lifecycleStage = options?.stage ?? mapWizardLifecycle(wizard.lifecycleStage);
  const isPrivate = options?.isPrivate ?? true;

  const revenue = parseWizardNumber(wizard.annualRevenue, 0);
  const ebitda = parseWizardNumber(wizard.ebitda, 0);
  const ebita = ebitda > 0 ? ebitda * 0.85 : 0;
  const hasRevenue = revenue > 0;
  const hasEbitda = ebitda > 0;

  const yearsHistory = resolveYearsOfHistory(wizard.foundedYear);
  const growthRate = INDUSTRY_GROWTH_RATES[industry];
  const normalizedEbitda = ebitda;
  const forwardEbitda =
    yearsHistory < 3 && normalizedEbitda > 0
      ? normalizedEbitda * (1 + growthRate)
      : normalizedEbitda;

  const selectedMultiple = selectPrimaryMultiple(
    lifecycleStage,
    hasRevenue,
    hasEbitda,
    isPrivate,
  );
  const multiplesUsed = ISRAEL_MULTIPLES_2026[industry];
  const multipleRange = multiplesUsed[selectedMultiple.multiple];
  const metricValue = resolveMetricValue(
    selectedMultiple.multiple,
    revenue,
    ebitda,
    ebita,
    forwardEbitda,
  );

  const safeMetric = metricValue > 0 ? metricValue : Math.max(revenue, 1);
  const valuationRange = calculateValuationRange(safeMetric, multipleRange, isPrivate);
  const medianMultiple = getMedianMultiple(multipleRange);

  const roundedRange: ValuationRangeResult = {
    low: Math.round(valuationRange.low * 100) / 100,
    base: Math.round(valuationRange.base * 100) / 100,
    high: Math.round(valuationRange.high * 100) / 100,
  };

  return {
    valuationRange: roundedRange,
    selectedMultiple,
    multiplesUsed,
    industry,
    lifecycleStage,
    metricValue: safeMetric,
    medianMultiple,
    normalizedEbitda,
    forwardEbitda,
    comparisonGroup: buildComparisonGroup(industry, lifecycleStage),
    sanityCheck: buildSanityCheck(
      roundedRange,
      safeMetric,
      medianMultiple,
      selectedMultiple.label,
    ),
    methodologyNote: METHODOLOGY_NOTE_HE,
  };
}
