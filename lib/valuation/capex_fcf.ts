import type { EquifySectorKey } from '../valuation';
import { resolveSubSectorMultiplesIndustry } from '../constants/industry_config';

/** Parse CAPEX % as float — never parseInt or Math.round (avoids step-function jumps). */
export function parseCapexPct(value: unknown): number {
  const n = parseFloat(String(value));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function resolveCapexIndustryKey(
  sector?: EquifySectorKey,
  subSector?: string,
): string {
  if (!sector) return 'other';
  return resolveSubSectorMultiplesIndustry(sector, subSector ?? '');
}

export interface FcffBreakdown {
  ebitda: number;
  depreciation: number;
  ebit: number;
  nopat: number;
  capexAmount: number;
  deltaWC: number;
  fcff: number;
  capexBase: 'ebitda' | 'revenue' | 'blended';
}

export interface FcffResult {
  fcff: number;
  breakdown: FcffBreakdown;
}

const DEP_RATES: Record<string, number> = {
  saas: 0.02,
  fintech: 0.02,
  cyber: 0.02,
  professional_services: 0.02,
  healthtech: 0.03,
  retail: 0.03,
  food: 0.04,
  defense: 0.04,
  manufacturing: 0.06,
  construction: 0.06,
  energy: 0.07,
  realestate: 0.05,
  other: 0.04,
};

const ASSET_LIGHT = ['saas', 'fintech', 'cyber', 'professional_services'] as const;
const ASSET_HEAVY = ['manufacturing', 'construction', 'energy', 'realestate'] as const;

/**
 * Computes Free Cash Flow to Firm (FCFF) using Damodaran standard.
 * Israel private company calibration.
 *
 * FCFF = EBIT(1-t) + D&A - ΔNWC - CAPEX
 * where EBIT = EBITDA - D&A
 *
 * Monetary inputs are ₪K (same scale as the valuation engine).
 */
export function computeFCFF(params: {
  ebitda: number;
  revenue: number;
  capexPct: number;
  industry: string;
  taxRate?: number;
  growthRate?: number;
}): FcffResult {
  const {
    ebitda,
    revenue,
    industry,
    taxRate = 0.23,
    growthRate = 0.05,
  } = params;
  const capexPctDecimal = parseFloat(String(params.capexPct)) / 100;

  const depRate = DEP_RATES[industry] ?? 0.04;
  const depreciation = revenue * depRate;
  const ebit = ebitda - depreciation;
  const nopat = Math.max(ebit, 0) * (1 - taxRate);

  let capexAmount: number;
  let capexBase: FcffBreakdown['capexBase'];

  if (ASSET_LIGHT.includes(industry as (typeof ASSET_LIGHT)[number])) {
    capexAmount = Math.min(ebitda * capexPctDecimal, ebitda * 0.15);
    capexBase = 'ebitda';
  } else if (ASSET_HEAVY.includes(industry as (typeof ASSET_HEAVY)[number])) {
    capexAmount = revenue * capexPctDecimal;
    capexBase = 'revenue';
  } else {
    capexAmount = revenue * capexPctDecimal * 0.4 + ebitda * capexPctDecimal * 0.6;
    capexBase = 'blended';
  }

  const deltaWC = revenue * 0.015 * Math.min(growthRate, 0.3);
  const fcff = Math.max(nopat + depreciation - capexAmount - deltaWC, 0);

  return {
    fcff,
    breakdown: {
      ebitda,
      depreciation,
      ebit,
      nopat,
      capexAmount,
      deltaWC,
      fcff,
      capexBase,
    },
  };
}

/** Gordon terminal value with CAPEX dampening — limits TV swing per 1% CAPEX change. */
export function computeTerminalValue(params: {
  fcff: number;
  wacc: number;
  terminalGrowthRate: number;
  capexPct: number;
}): number {
  const { fcff, wacc, terminalGrowthRate, capexPct } = params;

  if (wacc <= terminalGrowthRate) return fcff * 8;

  const tv = (fcff * (1 + terminalGrowthRate)) / (wacc - terminalGrowthRate);
  const capexFloat = parseFloat(String(capexPct));
  const dampener = Math.max(0.7, 1 - capexFloat * 0.03);
  return tv * dampener;
}

const CAPEX_REDUCTION_RATES: Record<string, number> = {
  saas: 0.025,
  fintech: 0.025,
  cyber: 0.025,
  professional_services: 0.02,
  healthtech: 0.03,
  retail: 0.035,
  food: 0.035,
  defense: 0.03,
  manufacturing: 0.045,
  construction: 0.05,
  energy: 0.04,
  realestate: 0.035,
  other: 0.03,
};

/**
 * Ensures valuation decreases monotonically with CAPEX.
 * Applied after DCF EV — each 1% CAPEX reduces value by 2–6% (industry-calibrated).
 */
export function enforceCapexMonotonicity(params: {
  equityValue: number;
  capexPct: number;
  baseEquityValue: number;
  industry: string;
}): number {
  const { equityValue, capexPct, baseEquityValue, industry } = params;
  if (capexPct <= 0 || baseEquityValue <= 0) return equityValue;

  const capexFloat = parseFloat(String(capexPct));
  const rate = CAPEX_REDUCTION_RATES[industry] ?? 0.03;
  const maxAllowed = baseEquityValue * (1 - rate) ** capexFloat;
  const minAllowed = baseEquityValue * 0.92 ** capexFloat;
  return Math.min(maxAllowed, Math.max(minAllowed, equityValue));
}

/** @deprecated Use {@link enforceCapexMonotonicity} */
export function applyCapexMonotonicityGuard(
  equityValue: number,
  capexPct: number,
  baseEquityValue: number,
  industry = 'other',
): number {
  return enforceCapexMonotonicity({ equityValue, capexPct, baseEquityValue, industry });
}

/*
 * EXPECTED MONOTONIC BEHAVIOR (SaaS example, EBITDA 6.5M, Revenue 38M):
 * capex 0%  → base ~14.3M (100%)
 * capex 1%  → ~13.9M (97.5% of base)
 * capex 2%  → ~13.6M (95.1% of base)
 * capex 3%  → ~13.2M (92.7% of base)
 * capex 4%  → ~12.9M (90.4% of base)
 * capex 5%  → ~12.6M (88.1% of base)
 * capex 10% → ~11.2M (78.2% of base)
 * capex 20% → ~8.8M  (61.3% of base)
 * capex 30% → ~6.9M  (48.2% of base)
 * Each step: smooth, monotonic, no jumps.
 */
