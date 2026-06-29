import { resolveIndustryKey } from './industry_migration';
import type { Industry } from './industry_types';

/** Ibbotson / Damodaran DLOM baseline for Israeli private companies (20% discount). */
export const PRIVATE_COMPANY_DLOM_FACTOR = 0.8;

/** Industry EV/EBITDA guardrails — prevents manual outliers vs public comps. */
const INDUSTRY_MULTIPLE_BOUNDS: Record<Industry, [number, number]> = {
  saas: [3.0, 22.0],
  fintech: [2.5, 18.0],
  healthtech: [3.0, 20.0],
  cyber: [4.0, 25.0],
  realestate: [4.0, 20.0],
  construction: [2.0, 8.0],
  manufacturing: [2.0, 9.0],
  retail_unified: [2.0, 9.0],
  food_service: [2.0, 8.0],
  hospitality: [4.0, 14.0],
  professional_services: [2.5, 12.0],
  defense: [3.0, 14.0],
  energy: [3.0, 16.0],
  other: [2.0, 12.0],
};

export interface MultipleNormalizationBreakdown {
  rawMultiple: number;
  dlomAdjusted: number;
  scaleAdjusted: number;
  finalMultiple: number;
  dlomFactor: number;
  scaleFactor: number;
}

export interface NormalizeMultipleResult {
  adjustedMultiple: number;
  breakdown: MultipleNormalizationBreakdown;
}

/**
 * Revenue-based size dampener — micro-cap private companies trade at lower multiples
 * (Damodaran size premium literature; Israeli mid-market deal evidence).
 */
function resolveScaleFactor(revenueK: number): number {
  if (revenueK <= 5_000) return 0.88;
  if (revenueK <= 20_000) return 0.92;
  if (revenueK <= 120_000) return 0.96;
  return 1.0;
}

/**
 * DLOM relief for mature, larger private issuers — liquidity profile approaches mid-market.
 */
function resolveDlomFactor(lifecycleStage: string, revenueK: number): number {
  const revenueNis = revenueK * 1_000;
  if (lifecycleStage === 'mature') {
    return Math.min(PRIVATE_COMPANY_DLOM_FACTOR + (revenueNis / 200_000_000) * 0.05, 0.9);
  }
  return PRIVATE_COMPANY_DLOM_FACTOR;
}

/**
 * Normalizes any multiple (automatic or manual) through the same institutional pipeline.
 *
 * INVARIANT: identical `rawMultiple` + context → identical `adjustedMultiple`, regardless of
 * `isManualOverride`. The only difference between paths is the raw input source.
 *
 * Pipeline: raw → DLOM (illiquidity) → scale dampener → industry bounds.
 */
export function normalizeMultipleForPrivateCompany(params: {
  rawMultiple: number;
  /** Revenue run-rate in ₪K. */
  revenueK: number;
  industry: string;
  lifecycleStage: string;
  isManualOverride: boolean;
}): NormalizeMultipleResult {
  const { rawMultiple, revenueK, industry, lifecycleStage } = params;
  const safeRaw = Number.isFinite(rawMultiple) && rawMultiple > 0 ? rawMultiple : 0;
  if (safeRaw <= 0) {
    return {
      adjustedMultiple: 0,
      breakdown: {
        rawMultiple: 0,
        dlomAdjusted: 0,
        scaleAdjusted: 0,
        finalMultiple: 0,
        dlomFactor: PRIVATE_COMPANY_DLOM_FACTOR,
        scaleFactor: 1,
      },
    };
  }

  const dlomFactor = resolveDlomFactor(lifecycleStage, revenueK);
  const dlomAdjusted = safeRaw * dlomFactor;
  const scaleFactor = resolveScaleFactor(revenueK);
  const scaleAdjusted = dlomAdjusted * scaleFactor;

  const industryKey = resolveIndustryKey(industry);
  const [minM, maxM] = INDUSTRY_MULTIPLE_BOUNDS[industryKey] ?? [2.0, 15.0];
  const finalMultiple = Math.min(Math.max(scaleAdjusted, minM), maxM);

  return {
    adjustedMultiple: Math.round(finalMultiple * 1000) / 1000,
    breakdown: {
      rawMultiple: safeRaw,
      dlomAdjusted: Math.round(dlomAdjusted * 1000) / 1000,
      scaleAdjusted: Math.round(scaleAdjusted * 1000) / 1000,
      finalMultiple: Math.round(finalMultiple * 1000) / 1000,
      dlomFactor,
      scaleFactor,
    },
  };
}
