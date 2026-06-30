import type { EquifyLifecycleKey, EquifySectorKey } from '../valuation';
import { resolveSectorUnleveredBeta } from '../wizard/sector_market_defaults';
import type { SectorMethodologyConfig } from './sector_methodology_matrix';

/** CAPM macro baselines (% points). */
export const CAPM_RISK_FREE_RATE_PCT = 4.5;
export const CAPM_EQUITY_RISK_PREMIUM_PCT = 5.5;
export const CAPM_CORPORATE_SPREAD_PCT = 2.0;
export const CAPM_CORPORATE_TAX_RATE = 0.23;
export const CAPM_WACC_MIN_PCT = 6.0;
export const CAPM_WACC_MAX_PCT = 22.0;
export const CAPM_DEFAULT_UNLEVERED_BETA = 0.9;

/** Lifecycle size premium (Alpha) — percentage points. */
export const LIFECYCLE_SIZE_ALPHA_PCT: Record<EquifyLifecycleKey, number> = {
  seed: 3.0,
  early: 1.5,
  growth: 0.5,
  mature: 0.0,
};

export interface SpecificRiskPremiumBreakdownPp {
  concentrationRisk: number;
  founderRisk: number;
  ipRisk: number;
  contractRisk: number;
}

export interface WaccBreakdown {
  rf: number;
  leveredBeta: number;
  erp: number;
  alpha: number;
  /** Company-specific risk premium (percentage points) — concentration, founder, IP, contracts. */
  specificRiskPremium: number;
  specificRiskBreakdown: SpecificRiskPremiumBreakdownPp;
  ke: number;
  kd: number;
}

export interface CapmWaccResult {
  wacc: number;
  waccBreakdown: WaccBreakdown;
}

export interface CapmWaccParams {
  sector?: EquifySectorKey;
  lifecycle?: EquifyLifecycleKey;
  /** Legacy lifecycle scalar — used when {@link lifecycle} is omitted. */
  lifecycleAdj?: number;
  unleveredBeta?: number;
  grossDebtK?: number;
  cashK?: number;
  /** Signed net debt (₪K) — grossDebt − cash when bridge fields are present. */
  netDebtK?: number;
  ebitdaK: number;
  revenueK: number;
  evEbitdaMultiple?: number;
  sectorConfig: Pick<SectorMethodologyConfig, 'minMultiple' | 'maxMultiple'>;
  /** Backlog-specific-risk mitigation (pp) — reduces Alpha only. */
  backlogAlphaReductionPp?: number;
  /** Scale-tier WACC size premium overlay (pp) — SMB +3..+5, enterprise ≤ 0. */
  scalePremiumOverlayPp?: number;
  /** Idiosyncratic risk premium (pp) — added to Ke alongside lifecycle Alpha. */
  specificRiskPremiumPp?: number;
  specificRiskBreakdownPp?: SpecificRiskPremiumBreakdownPp;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function resolveLifecycleStage(
  lifecycle?: EquifyLifecycleKey,
  lifecycleAdj?: number,
): EquifyLifecycleKey {
  if (lifecycle) return lifecycle;
  const adj = lifecycleAdj ?? 0;
  if (adj <= -0.05) return 'seed';
  if (adj <= 0.02) return 'early';
  if (adj <= 0.06) return 'growth';
  return 'mature';
}

function resolveLifecycleAlphaPct(
  lifecycle?: EquifyLifecycleKey,
  lifecycleAdj?: number,
  backlogAlphaReductionPp = 0,
): number {
  const stage = resolveLifecycleStage(lifecycle, lifecycleAdj);
  const base = LIFECYCLE_SIZE_ALPHA_PCT[stage];
  return Math.max(0, base - Math.max(0, backlogAlphaReductionPp));
}

function resolveGrossDebtK(params: CapmWaccParams): number {
  if (typeof params.grossDebtK === 'number' && Number.isFinite(params.grossDebtK)) {
    return Math.max(0, params.grossDebtK);
  }
  const net = params.netDebtK ?? 0;
  return Math.max(0, net);
}

/** Implied equity (₪K) from typed operating metrics — pre-DCF proxy for D/E and WACC weights. */
export function resolveEquityProxyK(params: {
  ebitdaK: number;
  revenueK: number;
  netDebtK: number;
  evEbitdaMultiple: number;
}): number {
  const { ebitdaK, revenueK, netDebtK, evEbitdaMultiple } = params;
  const evProxyK =
    ebitdaK > 0
      ? ebitdaK * evEbitdaMultiple
      : revenueK > 0
        ? revenueK * Math.max(0.5, evEbitdaMultiple * 0.12)
        : 0;
  return Math.max(0, evProxyK - netDebtK);
}

function resolveEvEbitdaMultiple(params: CapmWaccParams): number {
  if (typeof params.evEbitdaMultiple === 'number' && params.evEbitdaMultiple > 0) {
    return params.evEbitdaMultiple;
  }
  const { minMultiple, maxMultiple } = params.sectorConfig;
  return (minMultiple + maxMultiple) / 2;
}

function resolveUnleveredBeta(params: CapmWaccParams): number {
  if (typeof params.unleveredBeta === 'number' && params.unleveredBeta > 0) {
    return params.unleveredBeta;
  }
  if (params.sector) {
    return resolveSectorUnleveredBeta(params.sector);
  }
  return CAPM_DEFAULT_UNLEVERED_BETA;
}

/** Hamada (1969): βL = βU × [1 + (1 − T) × D/E]. */
export function computeLeveredBeta(
  unleveredBeta: number,
  debtK: number,
  equityK: number,
): number {
  if (!(equityK > 0)) return unleveredBeta;
  const debtToEquity = debtK / equityK;
  return unleveredBeta * (1 + (1 - CAPM_CORPORATE_TAX_RATE) * debtToEquity);
}

/**
 * Dynamic CAPM WACC — Ke = Rf + (βL × ERP) + Alpha; Kd = (Rf + spread) × (1 − T);
 * WACC = Ke × E/(E+D) + Kd × D/(E+D), bounded [6%, 22%].
 */
export function computeCapmWacc(params: CapmWaccParams): CapmWaccResult {
  const rf = CAPM_RISK_FREE_RATE_PCT;
  const erp = CAPM_EQUITY_RISK_PREMIUM_PCT;
  const backlogReduction = Math.max(0, params.backlogAlphaReductionPp ?? 0);
  const baseAlpha =
    params.scalePremiumOverlayPp != null
      ? params.scalePremiumOverlayPp
      : resolveLifecycleAlphaPct(params.lifecycle, params.lifecycleAdj, 0);
  const alpha = Math.max(0, baseAlpha - backlogReduction);
  const specificRiskPremium = Math.max(0, params.specificRiskPremiumPp ?? 0);
  const specificRiskBreakdown: SpecificRiskPremiumBreakdownPp =
    params.specificRiskBreakdownPp ?? {
      concentrationRisk: 0,
      founderRisk: 0,
      ipRisk: 0,
      contractRisk: 0,
    };

  const grossDebtK = resolveGrossDebtK(params);
  const netDebtK =
    typeof params.netDebtK === 'number' && Number.isFinite(params.netDebtK)
      ? params.netDebtK
      : grossDebtK - Math.max(0, params.cashK ?? 0);

  const evMultiple = resolveEvEbitdaMultiple(params);
  const equityProxyK = resolveEquityProxyK({
    ebitdaK: params.ebitdaK,
    revenueK: params.revenueK,
    netDebtK,
    evEbitdaMultiple: evMultiple,
  });

  const unleveredBeta = resolveUnleveredBeta(params);
  const leveredBeta = computeLeveredBeta(unleveredBeta, grossDebtK, equityProxyK);

  const ke = rf + leveredBeta * erp + alpha + specificRiskPremium;
  const kd = (rf + CAPM_CORPORATE_SPREAD_PCT) * (1 - CAPM_CORPORATE_TAX_RATE);

  const debtWeightCapital = grossDebtK;
  const equityWeightCapital =
    equityProxyK > 0 ? equityProxyK : Math.max(params.revenueK * 0.15, 100);
  const totalCapital = debtWeightCapital + equityWeightCapital;

  const equityWeight = totalCapital > 0 ? equityWeightCapital / totalCapital : 1;
  const debtWeight = totalCapital > 0 ? debtWeightCapital / totalCapital : 0;

  const waccRaw = ke * equityWeight + kd * debtWeight;
  const wacc = clamp(waccRaw, CAPM_WACC_MIN_PCT, CAPM_WACC_MAX_PCT);

  return {
    wacc,
    waccBreakdown: {
      rf,
      leveredBeta,
      erp,
      alpha,
      specificRiskPremium,
      specificRiskBreakdown,
      ke,
      kd,
    },
  };
}
