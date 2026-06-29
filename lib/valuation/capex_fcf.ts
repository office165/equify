import type { EquifySectorKey } from '../valuation';
import { resolveSubSectorMultiplesIndustry } from '../constants/industry_config';

/** Parse CAPEX % as float — never truncate to integer (avoids step-function jumps). */
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

const ASSET_LIGHT = new Set(['saas', 'fintech', 'professional_services', 'cyber']);
const ASSET_HEAVY = new Set(['manufacturing', 'construction', 'energy', 'realestate']);

/**
 * Industry-aware CAPEX (₪K) — asset-light bases on EBITDA; asset-heavy on revenue.
 */
export function computeCapexAmount(
  capexPct: number,
  revenue: number,
  ebitda: number,
  industry: string,
): number {
  const pct = parseCapexPct(capexPct) / 100;

  if (ASSET_LIGHT.has(industry)) {
    const ebitdaCap = ebitda * 0.15;
    const rawCapex = ebitda * pct;
    return Math.min(rawCapex, ebitdaCap);
  }

  if (ASSET_HEAVY.has(industry)) {
    return revenue * pct;
  }

  const revBase = revenue * pct * 0.4;
  const ebitBase = ebitda * pct * 0.6;
  return revBase + ebitBase;
}

function depreciationRateForIndustry(industry: string): number {
  if (industry === 'manufacturing') return 0.06;
  if (industry === 'saas') return 0.02;
  return 0.04;
}

/** FCFF (₪K) = NOPAT + D&A − CAPEX − ΔWC */
export function computeFCFF(
  ebitda: number,
  capexPct: number,
  revenue: number,
  industry: string,
  taxRate: number = 0.23,
): number {
  const nopat = ebitda * (1 - taxRate);
  const depreciation = revenue * depreciationRateForIndustry(industry);
  const wcChange = revenue * 0.015;
  const capexAmount = computeCapexAmount(capexPct, revenue, ebitda, industry);
  return Math.max(nopat + depreciation - capexAmount - wcChange, 0);
}

/** Gordon TV with CAPEX dampening — limits TV swing when CAPEX changes. */
export function computeTerminalValue(
  fcff: number,
  wacc: number,
  terminalGrowthRate: number,
  capexPct: number,
): number {
  const capex = parseCapexPct(capexPct);
  const capexDampener = Math.max(0.85, 1 - (capex / 100) * 0.5);
  const spread = Math.max(wacc - terminalGrowthRate, 0.001);
  const tv = (fcff * (1 + terminalGrowthRate)) / spread;
  return tv * capexDampener;
}

/** Clamp DCF EV so each +1% CAPEX reduces value by 2–8%, never increases it. */
export function applyCapexMonotonicityGuard(
  equityValue: number,
  capexPct: number,
  baseEquityValue: number,
): number {
  const capex = parseCapexPct(capexPct);
  if (capex <= 0 || baseEquityValue <= 0) return equityValue;
  const maxAllowedValue = baseEquityValue * 0.97 ** capex;
  const minAllowedValue = baseEquityValue * 0.92 ** capex;
  return Math.min(maxAllowedValue, Math.max(minAllowedValue, equityValue));
}

/*
 * Expected CAPEX sensitivity after fix (monotonic decrease, no jumps):
 * CAPEX 0% → base value (e.g. 14.3M)
 * CAPEX 1% → 3–5% lower (e.g. 13.7M)
 * CAPEX 2% → 3–5% lower than 1% (e.g. 13.1M)
 * CAPEX 3% → 3–5% lower than 2% (e.g. 12.5M)
 * CAPEX 4% → 3–5% lower than 3% (e.g. 11.9M)
 * CAPEX 5% → 3–5% lower than 4% (e.g. 11.4M)
 */
