import { computeConcentrationWaccPremium } from './adaptive_calibration';

export const SPECIFIC_RISK_PREMIUM_CAP = 0.025;

export interface SpecificRiskPremiumBreakdown {
  concentrationRisk: number;
  founderRisk: number;
  ipRisk: number;
  contractRisk: number;
}

export interface SpecificRiskPremiumResult {
  /** Fraction of 1 (e.g. 0.015 = 1.5pp) — used by regression tests. */
  totalPremium: number;
  /** Percentage points for WACC / Ke (e.g. 1.5 = 1.5%). */
  totalPremiumPp: number;
  breakdown: SpecificRiskPremiumBreakdown;
}

/**
 * Specific Risk Premium — Damodaran company-specific risk component.
 * Aggregates concentration, key-person, IP, and contract signals into one WACC addon.
 *
 * ROOT CAUSE (confirmed — wiring + calculation): the engine computed an idiosyncratic
 * alpha (`alphaPp`) for backlog mitigation but never added it to `computeCapmWacc` Ke.
 * Report/UI derived "סיכון ספציפי" as a WACC residual, which stayed at 0% because
 * the total WACC excluded this leg entirely.
 */
export function computeSpecificRiskPremium(params: {
  topCustomerPct: number;
  founderDependency: boolean;
  ipProtection: boolean;
  hasLongTermContracts: boolean;
}): SpecificRiskPremiumResult {
  const { topCustomerPct, founderDependency, ipProtection, hasLongTermContracts } =
    params;

  const concentrationRisk =
    topCustomerPct > 0
      ? Math.min(0.008 * Math.sqrt(topCustomerPct / 100) * 10, 0.012)
      : 0;

  const founderRisk = founderDependency ? 0.007 : 0;
  const ipRisk = ipProtection ? 0 : 0.005;
  const contractRisk = hasLongTermContracts ? 0 : 0.003;

  const totalPremium = Math.min(
    concentrationRisk + founderRisk + ipRisk + contractRisk,
    SPECIFIC_RISK_PREMIUM_CAP,
  );

  return {
    totalPremium,
    totalPremiumPp: totalPremium * 100,
    breakdown: { concentrationRisk, founderRisk, ipRisk, contractRisk },
  };
}

/** @deprecated Prefer {@link computeSpecificRiskPremium} — kept for concentration-only callers. */
export function computeConcentrationSpecificRiskPp(topCustomerPct: number): number {
  return computeConcentrationWaccPremium(topCustomerPct);
}
