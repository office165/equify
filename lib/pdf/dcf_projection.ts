import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
const EXPLICIT_YEARS = 5;
const MID_YEAR_OFFSET = 0.5;
const DEFAULT_TAX = 0.23;

export interface DcfProjectionRow {
  year: number;
  revenue: number;
  ebitda: number;
  ebit: number;
  fcff: number;
  pvFcff: number;
  cumulativePv: number;
  discountFactor: number;
}

export interface DcfProjectionResult {
  rows: DcfProjectionRow[];
  sumPvExplicit: number;
  terminalPv: number;
  enterpriseValue: number;
}

export interface WaccBreakdown {
  riskFreeRate: number;
  beta: number;
  equityRiskPremium: number;
  costOfEquity: number;
  costOfDebt: number;
  taxRate: number;
  afterTaxCostOfDebt: number;
  equityWeight: number;
  debtWeight: number;
  wacc: number;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function padRates(rates: number[], years: number): number[] {
  const out = rates.slice(0, years);
  while (out.length < years) {
    out.push(out[out.length - 1] ?? 0.08);
  }
  return out;
}

function computeTerminalPv(
  nopatY5: number,
  wacc: number,
  gTerminal: number,
  industryTronic: number,
): number {
  const ronic = Math.max(industryTronic, wacc);
  let g = gTerminal;
  if (g >= wacc - 0.005) g = wacc - 0.0051;
  const reinvest = clamp(g / ronic, 0, 1);
  const fcfT = nopatY5 * (1 - reinvest);
  const denom = wacc - reinvest * ronic;
  if (denom <= 0) return 0;
  const tv = fcfT / denom;
  return tv / (1 + wacc) ** (EXPLICIT_YEARS - MID_YEAR_OFFSET);
}

function projectDcfRows(
  assumptions: ForecastMatrixWithDiagnostics['assumptions'],
  wacc: number,
  gTerminal: number,
  industryTronic: number,
): DcfProjectionResult {
  const tax = assumptions.effective_tax_rate ?? DEFAULT_TAX;
  const rev0 = Math.max(assumptions.base_revenue, 1);
  const daPct = assumptions.da_pct_of_ebit ?? 0.1;
  const capexPct = assumptions.capex_pct_of_revenue ?? 0.05;
  const nwcPct = assumptions.nwc_pct_of_revenue_change ?? 0.1;
  const gRates = padRates(assumptions.revenue_growth_rates, EXPLICIT_YEARS);
  const margins = padRates(assumptions.ebit_margin_targets, EXPLICIT_YEARS);

  const rows: DcfProjectionRow[] = [];
  let priorRevenue = rev0;
  let cumulativePv = 0;
  let nopatY5 = 0;

  for (let t = 1; t <= EXPLICIT_YEARS; t++) {
    const revenue = priorRevenue * (1 + gRates[t - 1]);
    const ebit = revenue * margins[t - 1];
    const ebitda = ebit / 0.85;
    const da = Math.abs(ebit) * daPct;
    const nopat = ebit * (1 - tax);
    const capex = revenue * capexPct;
    const deltaNwc = (revenue - priorRevenue) * nwcPct;
    const fcff = nopat + da - capex - deltaNwc;
    const discountFactor = 1 / (1 + wacc) ** (t - MID_YEAR_OFFSET);
    const pvFcff = fcff * discountFactor;
    cumulativePv += pvFcff;
    if (t === EXPLICIT_YEARS) nopatY5 = nopat;

    rows.push({
      year: t,
      revenue,
      ebitda,
      ebit,
      fcff,
      pvFcff,
      cumulativePv,
      discountFactor,
    });
    priorRevenue = revenue;
  }

  const terminalPv = computeTerminalPv(nopatY5, wacc, gTerminal, industryTronic);
  const sumPvExplicit = rows.reduce((s, r) => s + r.pvFcff, 0);

  return {
    rows,
    sumPvExplicit,
    terminalPv,
    enterpriseValue: sumPvExplicit + terminalPv,
  };
}

export function computeEnterpriseValue(
  matrix: ForecastMatrixWithDiagnostics,
  waccOverride?: number,
  gTerminalOverride?: number,
): number {
  const wacc = waccOverride ?? matrix.assumptions.wacc;
  const gTerminal = gTerminalOverride ?? matrix.assumptions.g_terminal;
  return projectDcfRows(
    matrix.assumptions,
    wacc,
    gTerminal,
    matrix.assumptions.industry_tronic,
  ).enterpriseValue;
}

export function buildDcfProjection(
  matrix: ForecastMatrixWithDiagnostics,
): DcfProjectionResult {
  if (matrix.explicit_dcf?.length >= EXPLICIT_YEARS) {
    const rows: DcfProjectionRow[] = matrix.explicit_dcf.slice(0, EXPLICIT_YEARS).map((r) => ({
      year: r.year,
      revenue: r.revenue,
      ebitda: (r.ebit ?? 0) / 0.85,
      ebit: r.ebit ?? 0,
      fcff: r.fcff,
      pvFcff: r.pv_fcff ?? 0,
      cumulativePv: r.cumulative_pv_fcff ?? 0,
      discountFactor: r.discount_factor ?? 1,
    }));
    const sumPvExplicit = rows.reduce((s, r) => s + r.pvFcff, 0);
    const terminalPv = matrix.terminal_value.pv_terminal ?? 0;
    return {
      rows,
      sumPvExplicit,
      terminalPv,
      enterpriseValue: sumPvExplicit + terminalPv,
    };
  }

  const a = matrix.assumptions;
  return projectDcfRows(a, a.wacc, a.g_terminal, a.industry_tronic);
}

export function deriveWaccBreakdown(
  matrix: ForecastMatrixWithDiagnostics,
): WaccBreakdown {
  const wacc = matrix.assumptions.wacc;
  const tax = matrix.assumptions.effective_tax_rate ?? DEFAULT_TAX;
  const debt = matrix.capital_structure.total_debt;
  const cash = matrix.capital_structure.cash_and_equivalents;
  const baseEv =
    matrix.scenarios?.base?.enterprise_value ??
    matrix.enterprise_value ??
    matrix.assumptions.base_revenue * 4;
  const equityValue = Math.max(baseEv - debt + cash, baseEv * 0.55);
  const totalCap = equityValue + debt;
  const debtWeight = totalCap > 0 ? debt / totalCap : 0.22;
  const equityWeight = 1 - debtWeight;

  const riskFreeRate = 0.045;
  const equityRiskPremium = 0.058;
  const interest = matrix.diagnostics_inputs?.interest_expense ?? debt * 0.065;
  const costOfDebt = debt > 0 ? clamp(interest / debt, 0.03, 0.14) : 0.065;
  const afterTaxCostOfDebt = costOfDebt * (1 - tax);

  const costOfEquityImplied =
    (wacc - debtWeight * afterTaxCostOfDebt) / Math.max(equityWeight, 0.01);
  const beta = clamp(
    (costOfEquityImplied - riskFreeRate) / equityRiskPremium,
    0.6,
    2.4,
  );
  const costOfEquity = riskFreeRate + beta * equityRiskPremium;

  return {
    riskFreeRate,
    beta,
    equityRiskPremium,
    costOfEquity,
    costOfDebt,
    taxRate: tax,
    afterTaxCostOfDebt,
    equityWeight,
    debtWeight,
    wacc,
  };
}
