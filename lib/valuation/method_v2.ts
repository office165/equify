/**
 * Methodology 2 (round 2, part C). Off unless METHOD_V2=on. Methodology 1 is unchanged.
 *
 *   T1  Gordon terminal value without a cap, on a normalized terminal year (CAPEX = D&A,
 *       working capital grows with g, 23% tax on EBIT), min spread of 3 points WACC - g.
 *       An industry exit-multiple cross-check is shown in the report and not used in value.
 *   W1  Ke with Israel's CRP and Damodaran inputs (Rf from the Bank of Israel). Weights from the
 *       Damodaran industry D/E; beta relevered with that D/E.
 *   R1  Revenue multiple inside the Damodaran EV/Sales range after marketability and size
 *       discounts, without the EBITDA bounds.
 *   Plus: continuous size factor (finding 21), mature row in blendTargets (finding 20), weight of a
 *   zero leg moves to the other legs (finding 22), debt above EV and implausible equity go to
 *   manual review (finding 25 and the active-company sanity check).
 */
import {
  DAMODARAN_ISRAEL,
  DAMODARAN_SOURCES,
  ISRAEL_RISK_FREE,
  damodaranIndustryFor,
  damodaranMappingFor,
  damodaranRange,
} from '../market-data/damodaran_2026';
import {
  CAPM_CORPORATE_SPREAD_PCT,
  CAPM_CORPORATE_TAX_RATE,
  CAPM_DEFAULT_UNLEVERED_BETA,
  CAPM_WACC_MAX_PCT,
  CAPM_WACC_MIN_PCT,
  type CapmWaccResult,
  type SpecificRiskPremiumBreakdownPp,
} from './capm_wacc';

export type MethodVersion = 'v1' | 'v2';

/** METHOD_V2=on turns methodology 2 on. Anything else (or unset) is methodology 1. */
export function isMethodV2On(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.METHOD_V2?.trim().toLowerCase() === 'on';
}

export function resolveMethodVersion(explicit?: MethodVersion): MethodVersion {
  return explicit ?? (isMethodV2On() ? 'v2' : 'v1');
}

/** Minimum WACC - g spread for the Gordon terminal value (T1). */
export const V2_MIN_TERMINAL_SPREAD = 0.03;

/** Revenue (K) above which the active-company sanity check applies. */
export const V2_SANITY_MIN_REVENUE_K = 2_000;
/** Equity below this share of revenue is implausible for an active company. */
export const V2_SANITY_MIN_EQUITY_TO_REVENUE = 0.05;

// ---------------------------------------------------------------------------------------------
// W1: WACC
// ---------------------------------------------------------------------------------------------

export interface WaccV2Params {
  sector?: string;
  subSector?: string;
  /** Size overlay (pp), as in methodology 1. */
  alphaPp: number;
  specificRiskPremiumPp: number;
  specificRiskBreakdownPp?: SpecificRiskPremiumBreakdownPp;
  profitabilityLossPremiumPp: number;
}

export interface WaccV2Inputs {
  rfPct: number;
  erpPct: number;
  crpPct: number;
  unleveredBeta: number;
  deRatio: number;
  industry: string | null;
}

export function resolveWaccV2Inputs(sector?: string, subSector?: string): WaccV2Inputs {
  const ind = sector && subSector ? damodaranIndustryFor(sector, subSector) : undefined;
  const map = sector && subSector ? damodaranMappingFor(sector, subSector) : undefined;
  return {
    rfPct: ISRAEL_RISK_FREE.value * 100,
    erpPct: DAMODARAN_ISRAEL.impliedErp.value * 100,
    crpPct: DAMODARAN_ISRAEL.crp.value * 100,
    unleveredBeta: ind ? ind.global.unleveredBetaCash.value : CAPM_DEFAULT_UNLEVERED_BETA,
    deRatio: ind ? ind.global.deRatio.value : 0,
    industry: map?.industry ?? null,
  };
}

export function computeWaccV2(params: WaccV2Params): CapmWaccResult & { inputs: WaccV2Inputs } {
  const inputs = resolveWaccV2Inputs(params.sector, params.subSector);
  const t = CAPM_CORPORATE_TAX_RATE;
  const leveredBeta = inputs.unleveredBeta * (1 + (1 - t) * inputs.deRatio);
  const alpha = Math.max(0, params.alphaPp);
  const specific = Math.max(0, params.specificRiskPremiumPp);
  const loss = Math.max(0, params.profitabilityLossPremiumPp);
  const ke = inputs.rfPct + leveredBeta * inputs.erpPct + inputs.crpPct + alpha + specific + loss;
  const kdPreTax = inputs.rfPct + CAPM_CORPORATE_SPREAD_PCT;
  const kd = kdPreTax * (1 - t);
  const equityWeight = 1 / (1 + inputs.deRatio);
  const debtWeight = 1 - equityWeight;
  const waccRaw = ke * equityWeight + kd * debtWeight;
  const wacc = Math.min(CAPM_WACC_MAX_PCT, Math.max(CAPM_WACC_MIN_PCT, waccRaw));
  return {
    wacc,
    inputs,
    waccBreakdown: {
      rf: inputs.rfPct,
      leveredBeta,
      erp: inputs.erpPct,
      alpha,
      specificRiskPremium: specific,
      specificRiskBreakdown: params.specificRiskBreakdownPp ?? {
        concentrationRisk: 0,
        founderRisk: 0,
        ipRisk: 0,
        contractRisk: 0,
      },
      profitabilityLossPremium: loss,
      ke,
      kd,
      kdPreTax,
      taxRate: t,
      equityWeight,
      debtWeight,
      waccRaw,
      crp: inputs.crpPct,
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Size factor (finding 21): continuous instead of steps at 5M, 20M and 120M revenue.
// ---------------------------------------------------------------------------------------------

/**
 * Log-linear interpolation through the same levels the step function uses:
 * 0.88 up to 5M, 0.92 at 20M, 0.96 at 120M, 1.0 from 720M (120M x 6, the 20M to 120M ratio).
 */
const SIZE_KNOTS: Array<[number, number]> = [
  [5_000, 0.88],
  [20_000, 0.92],
  [120_000, 0.96],
  [720_000, 1.0],
];

export function continuousScaleFactor(revenueK: number): number {
  if (!(revenueK > SIZE_KNOTS[0][0])) return SIZE_KNOTS[0][1];
  for (let i = 1; i < SIZE_KNOTS.length; i += 1) {
    const [x1, y1] = SIZE_KNOTS[i];
    const [x0, y0] = SIZE_KNOTS[i - 1];
    if (revenueK <= x1) {
      const t = (Math.log(revenueK) - Math.log(x0)) / (Math.log(x1) - Math.log(x0));
      return y0 + t * (y1 - y0);
    }
  }
  return SIZE_KNOTS[SIZE_KNOTS.length - 1][1];
}

// ---------------------------------------------------------------------------------------------
// R1: revenue multiple inside the Damodaran EV/Sales range.
// ---------------------------------------------------------------------------------------------

export function revenueMultipleV2(params: {
  sector?: string;
  subSector?: string;
  rawMultiple: number;
  /** DLOM x size factor applied to the raw multiple and to the range. */
  privateFactor: number;
  isManual: boolean;
}): { multiple: number; low: number | null; high: number | null } {
  const raw = Number.isFinite(params.rawMultiple) && params.rawMultiple > 0 ? params.rawMultiple : 0;
  const adjusted = raw * params.privateFactor;
  const range =
    params.sector && params.subSector ? damodaranRange(params.sector, params.subSector, 'evSales') : undefined;
  if (!range || params.isManual) return { multiple: adjusted, low: null, high: null };
  const low = range.low * params.privateFactor;
  const high = range.high * params.privateFactor;
  return { multiple: Math.min(Math.max(adjusted, low), high), low, high };
}

// ---------------------------------------------------------------------------------------------
// Zero leg (finding 22) and manual review (finding 25, sanity check).
// ---------------------------------------------------------------------------------------------

export function redistributeZeroLegWeight<W extends { dcf: number; ebitda: number; rev: number }>(
  weights: W,
  ebitdaLegEvK: number,
): W {
  if (!(weights.ebitda > 0) || ebitdaLegEvK !== 0) return weights;
  const rest = weights.dcf + weights.rev;
  if (rest <= 0) return weights;
  return { ...weights, dcf: weights.dcf / rest, rev: weights.rev / rest, ebitda: 0 };
}

export type ManualReviewReason = 'debt-exceeds-ev' | 'equity-zero' | 'equity-below-5pct-revenue';

export interface ManualReview {
  reasons: ManualReviewReason[];
  /** Short explanation for the office alert (no customer data). */
  detail: string;
}

export function resolveManualReview(params: {
  evK: number;
  debtK: number;
  equityK: number;
  revenueK: number;
}): ManualReview | undefined {
  const reasons: ManualReviewReason[] = [];
  if (params.evK - params.debtK < 0) reasons.push('debt-exceeds-ev');
  if (params.equityK <= 0) reasons.push('equity-zero');
  else if (
    params.revenueK > V2_SANITY_MIN_REVENUE_K &&
    params.equityK < params.revenueK * V2_SANITY_MIN_EQUITY_TO_REVENUE
  ) {
    reasons.push('equity-below-5pct-revenue');
  }
  if (!reasons.length) return undefined;
  const pct = params.revenueK > 0 ? ((params.equityK / params.revenueK) * 100).toFixed(1) : 'n/a';
  return {
    reasons,
    detail: `METHOD_V2 manual review: ${reasons.join(', ')} (EV ${Math.round(params.evK)}K, net debt ${Math.round(params.debtK)}K, equity ${Math.round(params.equityK)}K, equity/revenue ${pct}%)`,
  };
}

/** Sources line for the report (WACC inputs in methodology 2). */
export function waccV2SourceNoteHe(industry: string | null): string {
  const s = DAMODARAN_SOURCES;
  return `מקורות: ריבית חסרת סיכון של בנק ישראל (אג"ח ממשלתי שקלי 10 שנים, ממוצע ${ISRAEL_RISK_FREE.asOf}); ERP משתמע ו CRP לישראל (דירוג ${DAMODARAN_ISRAEL.rating}) מ Damodaran (${s.histimpl.file}, ${s.ctryprem.file}); בטא לא ממונפת ו D/E של הענף ${industry ?? 'הכללי'} (${s.betaGlobal.file}, ${s.betaGlobal.dataDate}).`;
}
