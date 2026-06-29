import type { ValuationComputed, ValuationInputs, ValuationScenarios } from '../valuation';
import { calibrateCenterOfGravity } from './base_case_calibration';
import { computeBacklogCoverageRatio } from './backlog_metrics';
import {
  enforceCapexMonotonicity,
  computeFCFF,
  computeTerminalValue,
  parseCapexPct,
} from './capex_fcf';
import {
  type ScenarioElasticity,
  buildVarianceRibbon,
  resolveScenarioElasticity,
} from './scenario_elasticity';

export {
  OMWISE_BASELINE_MULTIPLE_DELTA,
  OMWISE_BASELINE_VARIANCE_PCT,
  OMWISE_BASELINE_WACC_DELTA_PP,
  OMWISE_CALIBRATION_QS,
  OMWISE_CALIBRATION_REVENUE_NIS,
  SCENARIO_MULTIPLE_DELTA,
  SCENARIO_WACC_DELTA_PP,
  applyVarianceRibbon,
  buildVarianceRibbon,
  computeRelativeVariancePct,
  computeScenarioElasticity,
  computeValuationScaleFactor,
  resolveScenarioElasticity,
  resolveValuationTier,
  scenarioWaccOffsetPp,
  type ScenarioElasticity,
  type ValuationTier,
  type VarianceRibbon,
} from './scenario_elasticity';

export {
  BACKLOG_TO_FORWARD_RUN_RATE,
  FORWARD_RUN_RATE_EQUITY_ELASTICITY,
  calibrateCenterOfGravity,
  resolveForwardOperationalRunRateK,
  type CenterOfGravityCalibration,
} from './base_case_calibration';

/** Long-run terminal growth (g∞) used in Gordon growth terminal value. */
export const TERMINAL_GROWTH_RATE = 0.025;

/** Mid-year stub — H2 2026 cash flows discounted at t = 0.5. */
export const STUB_PERIOD_DISCOUNT_EXPONENT = 0.5;

/** CAPEX at or below this % triggers reinvestment-constrained growth decay. */
export const REINVESTMENT_CONSTRAINED_CAPEX_PCT = 3;

/** @deprecated Use REINVESTMENT_CONSTRAINED_CAPEX_PCT */
export const LOW_CAPEX_SATURATION_THRESHOLD_PCT = REINVESTMENT_CONSTRAINED_CAPEX_PCT;

/** Max terminal value as a share of total DCF EV (SMB guardrail). */
export const MAX_TERMINAL_VALUE_SHARE = 0.36;

/** Gordon TV cannot exceed this multiple of explicit-period PV. */
export const TERMINAL_TO_EXPLICIT_PV_MAX = 0.42;

/** Minimum WACC − g spread for Gordon terminal (prevents TV blow-ups). */
export const MIN_TERMINAL_SPREAD = 0.075;

const EXPLICIT_FORECAST_YEARS = 5;

export interface DcfHorizonProjection {
  fcffByYearK: number[];
  growthByYear: number[];
  explicitPvK: number;
  terminalPvK: number;
  terminalShare: number;
  totalEvK: number;
  dcfGrowthPct: number;
}

/**
 * Headline growth capped by reinvestment capacity.
 * Ceiling rises smoothly with CAPEX — avoids step jumps at 1% / 3% thresholds.
 */
export function resolveDcfGrowthPct(headlineGrowthPct: number, capexLevelPct: number): number {
  const g = Math.max(-5, headlineGrowthPct);
  const capex = parseCapexPct(capexLevelPct);
  const maxFundableGrowth = 2.5 + Math.min(capex, 8) * 0.35;
  return Math.min(g, maxFundableGrowth);
}

/** Year-1 FCFF (₪K) — Damodaran FCFF via {@link computeFCFF}. */
export function computeInitialFcffK(
  ebitdaK: number,
  revK: number,
  capexLevelPct: number,
  headlineGrowthPct = 0,
  industry = 'other',
): number {
  return computeFCFF({
    ebitda: ebitdaK,
    revenue: revK,
    capexPct: capexLevelPct,
    industry,
    growthRate: Math.max(0, headlineGrowthPct) / 100,
  }).fcff;
}

/**
 * Explicit-period growth with conservative decay in years 3–5.
 * Single continuous path — no CAPEX regime switches that cause EV jumps.
 */
export function explicitGrowthRateForYear(
  yearIndex1Based: number,
  baseGrowthPct: number,
  capexLevelPct = 0,
): number {
  const dcfGrowthPct = resolveDcfGrowthPct(baseGrowthPct, capexLevelPct);
  const gBase = Math.max(-0.05, dcfGrowthPct / 100);
  const gTerm = TERMINAL_GROWTH_RATE;
  const path = [
    gBase,
    gBase * 0.9,
    gBase * 0.68,
    gBase * 0.46,
    Math.max(gTerm + 0.008, gBase * 0.32),
  ];
  return path[yearIndex1Based - 1] ?? gTerm;
}

function discountExponentForYear(yearIndex1Based: number): number {
  return yearIndex1Based === 1
    ? STUB_PERIOD_DISCOUNT_EXPONENT
    : yearIndex1Based - STUB_PERIOD_DISCOUNT_EXPONENT;
}

function computeCappedTerminalValue(params: {
  terminalFcffK: number;
  waccPct: number;
  explicitPvK: number;
  terminalDiscountExponent: number;
  capexLevelPct: number;
}): number {
  const w = params.waccPct / 100;
  const g = TERMINAL_GROWTH_RATE;
  const tvRaw = computeTerminalValue({
    fcff: params.terminalFcffK,
    wacc: Math.max(w, g + MIN_TERMINAL_SPREAD),
    terminalGrowthRate: g,
    capexPct: params.capexLevelPct,
  });
  return Math.min(
    tvRaw / (1 + w) ** params.terminalDiscountExponent,
    params.explicitPvK * TERMINAL_TO_EXPLICIT_PV_MAX,
  );
}

/** Projects explicit FCFF + capped terminal value (₪K EV). */
export function projectDcfHorizon(params: {
  ebitdaK: number;
  revK: number;
  capexLevelPct: number;
  dcfGrowthPct: number;
  wacc: number;
  industry?: string;
}): DcfHorizonProjection {
  const { ebitdaK, revK, dcfGrowthPct, wacc, industry = 'other' } = params;
  const capexLevelPct = parseCapexPct(params.capexLevelPct);
  const w = wacc / 100;
  const effectiveDcfGrowthPct = resolveDcfGrowthPct(dcfGrowthPct, capexLevelPct);

  let fcff = computeInitialFcffK(ebitdaK, revK, capexLevelPct, dcfGrowthPct, industry);
  const fcffByYearK: number[] = [];
  const growthByYear: number[] = [];
  let explicitPvK = 0;

  for (let i = 1; i <= EXPLICIT_FORECAST_YEARS; i += 1) {
    const g = explicitGrowthRateForYear(i, dcfGrowthPct, capexLevelPct);
    fcff *= 1 + g;
    growthByYear.push(g);
    fcffByYearK.push(fcff);
    explicitPvK += fcff / (1 + w) ** discountExponentForYear(i);
  }

  const terminalDiscountExponent =
    EXPLICIT_FORECAST_YEARS - STUB_PERIOD_DISCOUNT_EXPONENT;
  let terminalPvK = computeCappedTerminalValue({
    terminalFcffK: fcff,
    waccPct: wacc,
    explicitPvK,
    terminalDiscountExponent,
    capexLevelPct,
  });

  let totalEvK = explicitPvK + terminalPvK;
  const uncappedShare = totalEvK > 0 ? terminalPvK / totalEvK : 0;
  if (uncappedShare > MAX_TERMINAL_VALUE_SHARE) {
    terminalPvK = totalEvK * MAX_TERMINAL_VALUE_SHARE;
    totalEvK = explicitPvK + terminalPvK;
  }

  return {
    fcffByYearK,
    growthByYear,
    explicitPvK,
    terminalPvK,
    terminalShare: totalEvK > 0 ? terminalPvK / totalEvK : 0,
    totalEvK,
    dcfGrowthPct: effectiveDcfGrowthPct,
  };
}

export function computeDcfWithGrowthDecay(params: {
  ebitdaK: number;
  revK: number;
  capexLevelPct: number;
  dcfGrowthPct: number;
  wacc: number;
  industry?: string;
}): number {
  const capexPct = parseCapexPct(params.capexLevelPct);
  const projection = projectDcfHorizon({ ...params, capexLevelPct: capexPct });
  if (capexPct <= 0) return projection.totalEvK;

  const baseEv = projectDcfHorizon({ ...params, capexLevelPct: 0 }).totalEvK;
  return enforceCapexMonotonicity({
    equityValue: projection.totalEvK,
    capexPct,
    baseEquityValue: baseEv,
    industry: params.industry ?? 'other',
  });
}

export type ScenarioInputs = Pick<
  ValuationInputs,
  | 'growth'
  | 'debt'
  | 'capexLevelPct'
  | 'rev'
  | 'revenue2026K'
  | 'sector'
  | 'subSector'
  | 'backlogSignedK'
  | 'isManualMultiple'
  | 'customMultiple'
>;

function formatVarianceAdj(variancePct: number, sign: '-' | '+'): string {
  return `${sign}${(variancePct * 100).toFixed(0)}%`;
}

function impliedDisplayMetrics(
  computed: ValuationComputed,
  scenario: 'bear' | 'base' | 'bull',
  elasticity: ScenarioElasticity,
): { waccPct: number; multiple: number } {
  const sign = scenario === 'bear' ? -1 : scenario === 'bull' ? 1 : 0;
  return {
    waccPct: computed.wacc,
    multiple: Math.max(
      0.1,
      computed.effectiveMult * (1 + sign * elasticity.relativeVariancePct * 0.5),
    ),
  };
}

/** Bear / Base / Bull — QS-driven relative variance ribbon on calibrated center of gravity. */
export function buildValuationScenarios(
  computed: ValuationComputed,
  inputs: ScenarioInputs,
): ValuationScenarios {
  const revenueK = inputs.revenue2026K ?? inputs.rev ?? 0;
  const baseEquityK = computed.equity;
  const organicForwardRevenue2027K =
    revenueK * (1 + Math.max(-0.05, (inputs.growth ?? 0) / 100));
  const backlogCoverageRatio = computeBacklogCoverageRatio(
    inputs.backlogSignedK,
    organicForwardRevenue2027K,
  );

  const centerOfGravity =
    computed.rawEquity != null && computed.rawEv != null
      ? {
          trailingRunRateK: revenueK,
          forwardRunRateK: computed.forwardRunRateK ?? revenueK,
          runRateFactor:
            revenueK > 0
              ? (computed.forwardRunRateK ?? revenueK) / revenueK
              : 1,
          calibrationFactor: computed.centerOfGravityFactor ?? 1,
          rawEvK: computed.rawEv,
          rawEquityK: computed.rawEquity,
          calibratedEvK: computed.ev,
          calibratedEquityK: computed.equity,
        }
      : calibrateCenterOfGravity({
          rawEvK: computed.ev,
          rawEquityK: computed.equity,
          debtK: inputs.debt,
          revenue2026K: revenueK,
          revK: inputs.rev ?? revenueK,
          backlogSignedK: inputs.backlogSignedK,
          backlogInflectionActive: computed.backlogInflectionActive,
          organicForwardRevenue2027K,
          backlogCoverageRatio,
        });

  const ribbon = buildVarianceRibbon({
    baseEquityK,
    debtK: inputs.debt,
    qualityScore: computed.qs,
    sector: inputs.sector,
    revenueK,
  });

  const { elasticity } = ribbon;
  const bearMetrics = impliedDisplayMetrics(computed, 'bear', elasticity);
  const baseMetrics = impliedDisplayMetrics(computed, 'base', elasticity);
  const bullMetrics = impliedDisplayMetrics(computed, 'bull', elasticity);

  return {
    bearEv: ribbon.bearEvK,
    bullEv: ribbon.bullEvK,
    bearEq: ribbon.bearEquityK,
    bullEq: ribbon.bullEquityK,
    baseEq: ribbon.baseEquityK,
    elasticity,
    centerOfGravity,
    rows: [
      {
        label: 'bear',
        growthPct: inputs.growth,
        ebitdaAdj: formatVarianceAdj(elasticity.relativeVariancePct, '-'),
        waccPct: bearMetrics.waccPct,
        multDisplay: `×${bearMetrics.multiple.toFixed(1)}`,
        ev: ribbon.bearEvK,
        equity: ribbon.bearEquityK,
      },
      {
        label: 'base',
        growthPct: inputs.growth,
        ebitdaAdj: '—',
        waccPct: baseMetrics.waccPct,
        multDisplay: `×${baseMetrics.multiple.toFixed(1)}`,
        ev: ribbon.baseEvK,
        equity: ribbon.baseEquityK,
      },
      {
        label: 'bull',
        growthPct: inputs.growth,
        ebitdaAdj: formatVarianceAdj(elasticity.relativeVariancePct, '+'),
        waccPct: bullMetrics.waccPct,
        multDisplay: `×${bullMetrics.multiple.toFixed(1)}`,
        ev: ribbon.bullEvK,
        equity: ribbon.bullEquityK,
      },
    ],
  };
}
