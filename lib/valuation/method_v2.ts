/**
 * Methodology 2 (round 2, part C). Off unless METHOD_V2=on. Methodology 1 is unchanged.
 *
 *   T1  Gordon terminal value without a cap, on a normalized terminal year (CAPEX = D&A,
 *       working capital grows with g, 23% tax on EBIT), min spread of 3 points WACC - g.
 *       An industry exit-multiple cross-check is shown in the report and not used in value.
 *   W1  Ke with Israel's CRP and Damodaran inputs (Rf from the Bank of Israel). Weights from the
 *       Damodaran industry D/E; beta relevered with that D/E.
 *   R1  Margin-adjusted revenue multiple (decision of 17.11.2026): industry EV/Sales times the
 *       ratio of the company normalized EBITDA margin to the industry implied EBITDA margin
 *       (EV/Sales / EV/EBITDA, both Damodaran), the ratio clamped to 0.25..1.0, then the
 *       marketability and size discounts. No EBITDA bounds.
 *   enforceCapexMonotonicity is not part of methodology 2 (decision of 17.11.2026): the
 *       normalized terminal year (CAPEX = D&A) already solves what it was meant to solve.
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

/**
 * The parts of methodology 2, each of which can be turned on alone. The engine uses all of them
 * (V2_ALL) or none (V1_NONE). Single parts are only for the comparison report (part D), which
 * attributes the V1 to V2 change to each part.
 */
export interface V2Components {
  /** W1: Ke with CRP, Damodaran beta and industry D/E weights. */
  w1: boolean;
  /** T1: uncapped Gordon on a normalized terminal year. */
  t1: boolean;
  /** No enforceCapexMonotonicity on the DCF leg. */
  noCapexGuard: boolean;
  /** R1: margin-adjusted revenue multiple. */
  r1: boolean;
  /** Continuous size factor on the multiples (finding 21). */
  continuousSize: boolean;
  /** Mature row in blendTargets (finding 20). */
  matureRow: boolean;
  /** Weight of a zero EBITDA leg moves to the other legs (finding 22). */
  zeroLeg: boolean;
  /** Manual review flag (debt above EV, zero or implausible equity). */
  manualReview: boolean;
}

export const V2_ALL: Readonly<V2Components> = Object.freeze({
  w1: true,
  t1: true,
  noCapexGuard: true,
  r1: true,
  continuousSize: true,
  matureRow: true,
  zeroLeg: true,
  manualReview: true,
});

export const V1_NONE: Readonly<V2Components> = Object.freeze({
  w1: false,
  t1: false,
  noCapexGuard: false,
  r1: false,
  continuousSize: false,
  matureRow: false,
  zeroLeg: false,
  manualReview: false,
});

/**
 * Explicit components (analysis only) win; otherwise the method version decides
 * (explicit method, else METHOD_V2 from the environment).
 */
export function resolveV2Components(params: {
  method?: MethodVersion;
  components?: Partial<V2Components>;
} = {}): V2Components {
  if (params.components) return { ...V1_NONE, ...params.components };
  return resolveMethodVersion(params.method) === 'v2' ? { ...V2_ALL } : { ...V1_NONE };
}

export function isAnyV2(c: V2Components): boolean {
  return Object.values(c).some(Boolean);
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
// R1: margin-adjusted revenue multiple (decision 1 of 17.11.2026).
// ---------------------------------------------------------------------------------------------

export const V2_R1_MARGIN_RATIO_MIN = 0.25;
export const V2_R1_MARGIN_RATIO_MAX = 1.0;

export interface RevenueMultipleV2 {
  /** Final multiple on revenue (after the margin ratio, marketability and size). */
  multiple: number;
  /** Industry EV/Sales: midpoint of Damodaran Global and Emerging Markets. Null without a mapping. */
  industryEvSales: number | null;
  /** Industry EV/EBITDA: midpoint of Global and Emerging Markets. */
  industryEvEbitda: number | null;
  /** Industry implied EBITDA margin = EV/Sales / EV/EBITDA (decimal). */
  industryImpliedMargin: number | null;
  /** Company normalized EBITDA margin (decimal). */
  companyMargin: number | null;
  /** Company margin / industry margin, clamped to 0.25..1.0. */
  marginRatio: number | null;
  /** Marketability x size factor. */
  privateFactor: number;
  industry: string | null;
  /** 'manual' keeps the customer multiple; 'fallback' is used when the sub-sector has no mapping. */
  basis: 'damodaran-margin' | 'manual' | 'fallback';
}

function mid(a: number, b: number): number {
  return (a + b) / 2;
}

/** Industry midpoints (Global and Emerging Markets) for EV/Sales and EV/EBITDA. */
export function damodaranMidpoints(sector?: string, subSector?: string): {
  evSales: number;
  evEbitda: number;
  industry: string;
} | undefined {
  if (!sector || !subSector) return undefined;
  const ind = damodaranIndustryFor(sector, subSector);
  const map = damodaranMappingFor(sector, subSector);
  if (!ind || !map) return undefined;
  return {
    evSales: mid(ind.global.evSales.value, ind.emerging.evSales.value),
    evEbitda: mid(ind.global.evEbitda.value, ind.emerging.evEbitda.value),
    industry: map.industry,
  };
}

export function revenueMultipleV2(params: {
  sector?: string;
  subSector?: string;
  /** Normalized EBITDA (K) and revenue (K) of the company. */
  normalizedEbitdaK: number;
  revenueK: number;
  /** Marketability x size factor. */
  privateFactor: number;
  /** Sub-sector raw multiple, used only when there is no Damodaran mapping. */
  fallbackRawMultiple: number;
  isManual: boolean;
  manualMultiple?: number;
}): RevenueMultipleV2 {
  const base = {
    industryEvSales: null,
    industryEvEbitda: null,
    industryImpliedMargin: null,
    companyMargin: params.revenueK > 0 ? params.normalizedEbitdaK / params.revenueK : null,
    marginRatio: null,
    privateFactor: params.privateFactor,
    industry: null,
  };
  if (params.isManual && params.manualMultiple != null && params.manualMultiple > 0) {
    return { ...base, multiple: params.manualMultiple, basis: 'manual' };
  }
  const mids = damodaranMidpoints(params.sector, params.subSector);
  if (!mids || !(mids.evEbitda > 0) || !(mids.evSales > 0)) {
    const raw = Number.isFinite(params.fallbackRawMultiple) && params.fallbackRawMultiple > 0 ? params.fallbackRawMultiple : 0;
    return { ...base, multiple: raw * params.privateFactor, basis: 'fallback' };
  }
  const impliedMargin = mids.evSales / mids.evEbitda;
  const companyMargin = base.companyMargin ?? 0;
  const ratio = Math.min(
    V2_R1_MARGIN_RATIO_MAX,
    Math.max(V2_R1_MARGIN_RATIO_MIN, impliedMargin > 0 ? companyMargin / impliedMargin : V2_R1_MARGIN_RATIO_MIN),
  );
  return {
    ...base,
    multiple: mids.evSales * ratio * params.privateFactor,
    industryEvSales: mids.evSales,
    industryEvEbitda: mids.evEbitda,
    industryImpliedMargin: impliedMargin,
    marginRatio: ratio,
    industry: mids.industry,
    basis: 'damodaran-margin',
  };
}

// ---------------------------------------------------------------------------------------------
// T1 cross-check: industry exit multiple. Shown in the report, never used in value.
// ---------------------------------------------------------------------------------------------

export interface ExitMultipleCrossCheck {
  /** Terminal EBITDA (K) of the normalized terminal year. */
  terminalEbitdaK: number;
  /** Damodaran EV/EBITDA midpoint after the marketability factor. */
  multiple: number;
  /** Exit value discounted like the Gordon value (K). */
  exitPvK: number;
  /** Gordon terminal PV (K) it is compared with. */
  gordonPvK: number;
  /** Gordon PV / exit PV. */
  ratio: number | null;
  /** Exit value implied by Gordon, as an EV/EBITDA multiple on the terminal year. */
  gordonImpliedMultiple: number | null;
  industry: string;
}

export function exitMultipleCrossCheck(params: {
  sector?: string;
  subSector?: string;
  terminalEbitdaK: number;
  /** Undiscounted Gordon terminal value (K). */
  gordonTvK: number;
  gordonPvK: number;
  discountFactor: number;
  dlomFactor: number;
}): ExitMultipleCrossCheck | undefined {
  const mids = damodaranMidpoints(params.sector, params.subSector);
  if (!mids || !(params.terminalEbitdaK > 0)) return undefined;
  const multiple = mids.evEbitda * params.dlomFactor;
  const exitPvK = params.terminalEbitdaK * multiple * params.discountFactor;
  return {
    terminalEbitdaK: params.terminalEbitdaK,
    multiple,
    exitPvK,
    gordonPvK: params.gordonPvK,
    ratio: exitPvK > 0 ? params.gordonPvK / exitPvK : null,
    gordonImpliedMultiple: params.terminalEbitdaK > 0 ? params.gordonTvK / params.terminalEbitdaK : null,
    industry: mids.industry,
  };
}

// ---------------------------------------------------------------------------------------------
// Zero leg (finding 22) and manual review (finding 25, sanity check).
// ---------------------------------------------------------------------------------------------

/** Base margin at and above which the EBITDA leg keeps its full weight (same 5% band as the thin-margin regime). */
export const V2_ZERO_LEG_FULL_WEIGHT_MARGIN = 0.05;

/**
 * Finding 22: in the thin-margin regime the EBITDA leg kept its weight when its value was zero.
 * The weight now moves to the other legs (pro rata), continuously: all of it when the multiple-leg
 * EBITDA base is zero or negative, none of it from a base margin of 5%, linear in between. A step at
 * exactly zero would make value jump when EBITDA crosses zero (legacy TEST 11).
 */
export function redistributeZeroLegWeight<W extends { dcf: number; ebitda: number; rev: number }>(
  weights: W,
  ebitdaBaseK: number,
  revenueK: number,
): W {
  if (!(weights.ebitda > 0)) return weights;
  const baseMargin = revenueK > 0 ? ebitdaBaseK / revenueK : ebitdaBaseK > 0 ? 1 : 0;
  const share = Math.min(1, Math.max(0, 1 - baseMargin / V2_ZERO_LEG_FULL_WEIGHT_MARGIN));
  if (share <= 0) return weights;
  const rest = weights.dcf + weights.rev;
  if (rest <= 0) return weights;
  const moved = weights.ebitda * share;
  return {
    ...weights,
    dcf: weights.dcf + (moved * weights.dcf) / rest,
    rev: weights.rev + (moved * weights.rev) / rest,
    ebitda: weights.ebitda - moved,
  };
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

/** Sources line for the report (WACC inputs in methodology 2): value, source and date per input. */
export function waccV2SourceNoteHe(inputs: WaccV2Inputs): string {
  const s = DAMODARAN_SOURCES;
  const he = (iso: string) => {
    const [y, m, d] = iso.split('-');
    return d ? `${Number(d)}.${Number(m)}.${y}` : `${Number(m)}.${y}`;
  };
  const industry = inputs.industry ?? 'הכללי';
  return [
    `מקורות: ריבית חסרת סיכון ${inputs.rfPct.toFixed(2)}% מבנק ישראל (עקום אפס נומינלי של אג"ח ממשלתי, 10 שנים, ממוצע ${he(ISRAEL_RISK_FREE.asOf)}).`,
    `ERP ${inputs.erpPct.toFixed(2)}% משתמע מ Damodaran (${s.histimpl.file}, ${he(s.histimpl.dataDate)}).`,
    `פרמיית סיכון מדינה לישראל ${inputs.crpPct.toFixed(2)}% מ Damodaran לפי דירוג ${DAMODARAN_ISRAEL.rating} (${s.ctryprem.file}, ${he(s.ctryprem.dataDate)}).`,
    `בטא לא ממונפת ${inputs.unleveredBeta.toFixed(2)} ו D/E של ${inputs.deRatio.toFixed(2)} לענף ${industry} מ Damodaran (${s.betaGlobal.file}, ${he(s.betaGlobal.dataDate)}), ומשקלות ההון לפי ה D/E הזה.`,
    `עלות החוב לפני מס היא הריבית חסרת הסיכון ועוד ${CAPM_CORPORATE_SPREAD_PCT.toFixed(1)} נקודות (הנחת המערכת).`,
  ].join(' ');
}

/** Methodology 2 detail returned by the engine (for the report, delivery and the comparison). */
export interface ValuationV2Detail {
  components: V2Components;
  waccInputs?: WaccV2Inputs;
  revenueMultiple?: RevenueMultipleV2;
  exitCrossCheck?: ExitMultipleCrossCheck;
  manualReview?: ManualReview;
  /** Weights before the zero-leg move, when it applied. */
  weightsBeforeZeroLeg?: { dcf: number; ebitda: number; rev: number };
}
