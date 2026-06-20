import type { ValuationLocale } from '../../api_client';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import { harvestPdfClientIdentity } from '../pdf/harvest_client_identity';
import { mapMatrixToReportData } from '../pdf/map_matrix_to_report_data';
import type { DcfRow, PdfClientIdentity, ValuationReportData } from '../pdf/types';
import {
  buildCanonicalValuation,
  type CanonicalValuation,
  type LiveScenarios,
  type ValuationScenario,
} from '../valuation/canonical_valuation';

import type { EquifySectorKey, ValuationComputed, ValuationScenarios } from '../valuation';
import type { EbitdaBlendBreakdown } from '../valuation/blended_ebitda';
import { getBlendWeights } from '../valuation/sector_configs';
import { syncMatrixFromEquifyState } from '../valuation/sync_matrix_from_equify';
import { resolveEquifySectorFromIndustryCode } from '../wizard/build_valuation_inputs';
import type { EquifyWizardState } from '../wizard/map_equify_wizard';
import { computeNetDebtK } from '../wizard/map_equify_wizard';

/** @deprecated Use getBlendWeights(sector) — kept for legacy imports */
export const BLEND_WEIGHTS = { dcf: 0.5, ebitda: 0.3, rev: 0.2 } as const;

export { getBlendWeights };

export const WACC_COMPONENTS = {
  riskFree: 4.3,
  erp: 5.4,
  crp: 1.6,
  size: 3.1,
} as const;

export const SCENARIO_WACC_OFFSET: Record<ValuationScenario, number> = {
  bear: 1.6,
  base: 0,
  bull: -1.4,
};

export interface TrajectoryPoint {
  year: string;
  revenue: number;
  ebitda: number;
}

export interface WaccDonutSlice {
  key: string;
  labelHe: string;
  labelEn: string;
  pct: number;
  color: string;
}

export interface WaterfallMetrics {
  ev: number;
  netDebt: number;
  equity: number;
  evPct: number;
  debtPct: number;
  equityPct: number;
}

export interface ScenarioMetrics {
  scenario: ValuationScenario;
  waccPct: number;
  equityValue: number;
  enterpriseValue: number;
  evDcf: number;
  evEbitda: number;
  evRev: number;
  blendedEv: number;
  waterfall: WaterfallMetrics;
}

export interface ReportViewModel {
  matrix: ForecastMatrixWithDiagnostics;
  reportData: ValuationReportData;
  canonical: CanonicalValuation;
  clientIdentity: PdfClientIdentity;
  currency: string;
  companyName: string;
  qualityScore: number;
  qualityGrade: string;
  trajectory: TrajectoryPoint[];
  waccDonutBase: WaccDonutSlice[];
  scenarios: Record<ValuationScenario, ScenarioMetrics>;
  findings: string[];
  reportId: string;
  industrySector: string;
  lifecycleStage: string;
  terminalGrowthPct: number;
  ebitdaMarginPct: number;
  revenue: number;
  ebitda: number;
  ebitdaBlend?: EbitdaBlendBreakdown;
}

export function confidenceToGrade(score: number): string {
  if (score >= 85) return 'A';
  if (score >= 75) return 'A−';
  if (score >= 65) return 'B+';
  if (score >= 55) return 'B';
  if (score >= 45) return 'B−';
  if (score >= 35) return 'C+';
  return 'C';
}

function resolveLiveScenarios(matrix: ForecastMatrixWithDiagnostics): LiveScenarios {
  const baseEV =
    matrix.scenarios?.base?.enterprise_value ??
    matrix.enterprise_value ??
    0;
  const bearEV =
    matrix.scenarios?.bear?.enterprise_value ??
    baseEV * 0.82;
  const bullEV =
    matrix.scenarios?.bull?.enterprise_value ??
    baseEV * 1.18;

  const explicitRows =
    matrix.explicit_dcf?.length > 0
      ? matrix.explicit_dcf.map((r) => ({ revenue: r.revenue }))
      : [{ revenue: matrix.assumptions.base_revenue }];

  return {
    bear: { enterprise_value: bearEV },
    base: { enterprise_value: baseEV, explicit_rows: explicitRows },
    bull: { enterprise_value: bullEV },
  };
}

function resolveEvEbitda(
  canonical: CanonicalValuation,
  reportData: ValuationReportData,
): number {
  if (canonical.ev_multiples_implied.evEbitda != null) {
    return canonical.ev_multiples_implied.evEbitda;
  }
  const fromPanel = reportData.multiplesAnalysis.find((m) =>
    /ebitda/i.test(m.name),
  );
  if (fromPanel?.impliedEV) return fromPanel.impliedEV;
  return canonical.ev_dcf * 0.9;
}

function resolveEvRev(
  canonical: CanonicalValuation,
  reportData: ValuationReportData,
): number {
  if (canonical.ev_multiples_implied.evSales != null) {
    return canonical.ev_multiples_implied.evSales;
  }
  const fromPanel = reportData.multiplesAnalysis.find((m) =>
    /sales|הכנסות|revenue/i.test(m.name),
  );
  if (fromPanel?.impliedEV) return fromPanel.impliedEV;
  return canonical.ev_dcf * 0.85;
}

function buildTrajectory(dcfRows: DcfRow[]): TrajectoryPoint[] {
  return dcfRows.map((row, i) => ({
    year: `Y${i + 1}`,
    revenue: row.revenue,
    ebitda: row.ebit > 0 ? row.ebit / 0.85 : row.revenue * 0.2,
  }));
}

export function buildWaccDonutSlices(waccPct: number): WaccDonutSlice[] {
  const fixed =
    WACC_COMPONENTS.riskFree +
    WACC_COMPONENTS.erp +
    WACC_COMPONENTS.crp +
    WACC_COMPONENTS.size;
  const quality = Math.max(0, waccPct - fixed);

  return [
    {
      key: 'rf',
      labelHe: 'ריבית חסרת סיכון',
      labelEn: 'Risk-free',
      pct: WACC_COMPONENTS.riskFree,
      color: '#00C2B8',
    },
    {
      key: 'erp',
      labelHe: 'פרמיית שוק (ERP)',
      labelEn: 'Equity risk premium',
      pct: WACC_COMPONENTS.erp,
      color: '#4DD6CE',
    },
    {
      key: 'crp',
      labelHe: 'פרמיית סיכון מדינה',
      labelEn: 'Country risk premium',
      pct: WACC_COMPONENTS.crp,
      color: '#C49A3C',
    },
    {
      key: 'size',
      labelHe: 'פרמיית גודל',
      labelEn: 'Size premium',
      pct: WACC_COMPONENTS.size,
      color: '#7FA8A2',
    },
    {
      key: 'quality',
      labelHe: 'התאמת איכות',
      labelEn: 'Quality adjustment',
      pct: quality,
      color: '#163530',
    },
  ];
}

function buildWaterfall(
  ev: number,
  netDebt: number,
  equity: number,
): WaterfallMetrics {
  const evBase = Math.max(ev, 1);
  return {
    ev,
    netDebt,
    equity,
    evPct: 100,
    debtPct: Math.min(100, (netDebt / evBase) * 100),
    equityPct: Math.min(100, (equity / evBase) * 100),
  };
}

function buildScenarioMetrics(
  scenario: ValuationScenario,
  canonical: CanonicalValuation,
  baseWaccPct: number,
  evEbitda: number,
  evRev: number,
  sector: EquifySectorKey,
): ScenarioMetrics {
  const evDcf = canonical.ev_dcf_by_scenario[scenario];
  const weights = getBlendWeights(sector);
  const blendedEv =
    weights.dcf * evDcf +
    weights.ebitda * evEbitda +
    weights.rev * evRev;
  const equity = canonical.equity_by_scenario[scenario];
  const ev = canonical.ev_blended_by_scenario[scenario] || blendedEv;

  return {
    scenario,
    waccPct: baseWaccPct + SCENARIO_WACC_OFFSET[scenario],
    equityValue: equity,
    enterpriseValue: ev,
    evDcf,
    evEbitda,
    evRev,
    blendedEv,
    waterfall: buildWaterfall(ev, canonical.net_debt, equity),
  };
}

function buildEquifyScenarioMetrics(
  computed: ValuationComputed,
  valScenarios: ValuationScenarios,
  netDebtK: number,
): Record<ValuationScenario, ScenarioMetrics> {
  const kToAbs = (k: number) => k * 1000;
  const evDcf = kToAbs(computed.dcf);
  const evEbitda = kToAbs(computed.ebtMult);
  const evRev = kToAbs(computed.revMult);
  const netDebtAbs = kToAbs(netDebtK);

  const defs: Array<{
    key: ValuationScenario;
    evK: number;
    eqK: number;
    waccPct: number;
  }> = [
    {
      key: 'bear',
      evK: valScenarios.bearEv,
      eqK: valScenarios.bearEq,
      waccPct: valScenarios.rows[0]?.waccPct ?? computed.wacc + SCENARIO_WACC_OFFSET.bear,
    },
    {
      key: 'base',
      evK: computed.ev,
      eqK: computed.equity,
      waccPct: valScenarios.rows[1]?.waccPct ?? computed.wacc,
    },
    {
      key: 'bull',
      evK: valScenarios.bullEv,
      eqK: valScenarios.bullEq,
      waccPct: valScenarios.rows[2]?.waccPct ?? computed.wacc + SCENARIO_WACC_OFFSET.bull,
    },
  ];

  return defs.reduce(
    (acc, { key, evK, eqK, waccPct }) => {
      const enterpriseValue = kToAbs(evK);
      const equityValue = kToAbs(eqK);
      acc[key] = {
        scenario: key,
        waccPct,
        equityValue,
        enterpriseValue,
        evDcf,
        evEbitda,
        evRev,
        blendedEv: enterpriseValue,
        waterfall: buildWaterfall(enterpriseValue, netDebtAbs, equityValue),
      };
      return acc;
    },
    {} as Record<ValuationScenario, ScenarioMetrics>,
  );
}

export function buildReportViewModel(
  matrix: ForecastMatrixWithDiagnostics,
  locale: ValuationLocale,
  equifyState?: EquifyWizardState | null,
): ReportViewModel {
  const equifySync = equifyState
    ? syncMatrixFromEquifyState(matrix, equifyState, locale)
    : null;
  const syncedMatrix = equifySync?.matrix ?? matrix;
  const equifyComputed = equifySync?.computed;
  const equifyScenarios = equifySync?.scenarios;

  const liveScenarios = resolveLiveScenarios(syncedMatrix);
  const canonical = buildCanonicalValuation(syncedMatrix, liveScenarios);
  const reportData = mapMatrixToReportData(syncedMatrix, locale, {
    canonicalValuation: canonical,
    baseEV: equifyComputed ? equifyComputed.ev * 1000 : undefined,
    bearEV: equifyScenarios ? equifyScenarios.bearEv * 1000 : undefined,
    bullEV: equifyScenarios ? equifyScenarios.bullEv * 1000 : undefined,
    evDcf: equifyComputed ? equifyComputed.dcf * 1000 : undefined,
  });
  const clientIdentity = harvestPdfClientIdentity(syncedMatrix);
  const baseWaccPct = equifyComputed?.wacc ?? syncedMatrix.assumptions.wacc * 100;
  const evEbitda = equifyComputed
    ? equifyComputed.ebtMult * 1000
    : resolveEvEbitda(canonical, reportData);
  const evRev = equifyComputed
    ? equifyComputed.revMult * 1000
    : resolveEvRev(canonical, reportData);
  const qualityScore =
    equifyComputed?.qs ??
    syncedMatrix.meta.confidence_score ??
    reportData.confidenceScore ??
    78;
  const sector = equifyState?.profile.sector ??
    resolveEquifySectorFromIndustryCode(
      syncedMatrix.wizard_context?.industry_code,
    );

  const scenarios: Record<ValuationScenario, ScenarioMetrics> =
    equifyComputed && equifyScenarios
      ? buildEquifyScenarioMetrics(
          equifyComputed,
          equifyScenarios,
          computeNetDebtK(equifyState!.financials),
        )
      : {
          bear: buildScenarioMetrics('bear', canonical, baseWaccPct, evEbitda, evRev, sector),
          base: buildScenarioMetrics('base', canonical, baseWaccPct, evEbitda, evRev, sector),
          bull: buildScenarioMetrics('bull', canonical, baseWaccPct, evEbitda, evRev, sector),
        };

  const revenue = equifyState
    ? equifyState.financials.rev * 1000
    : reportData.revenue;
  const ebitda = equifyComputed
    ? equifyComputed.ebitda * 1000
    : reportData.ebitda;
  const ebitdaMarginPct = equifyState
    ? equifyState.financials.margin
    : reportData.ebitdaMargin;

  return {
    matrix: syncedMatrix,
    reportData: equifyComputed
      ? {
          ...reportData,
          wacc: equifyComputed.wacc,
          baseEV: equifyComputed.ev * 1000,
          bearEV: equifyScenarios!.bearEv * 1000,
          bullEV: equifyScenarios!.bullEv * 1000,
          baseEquity: equifyComputed.equity * 1000,
          bearEquity: equifyScenarios!.bearEq * 1000,
          bullEquity: equifyScenarios!.bullEq * 1000,
          evDcf: equifyComputed.dcf * 1000,
          revenue,
          ebitda,
          ebitdaMargin: ebitdaMarginPct,
          confidenceScore: equifyComputed.qs,
        }
      : reportData,
    canonical,
    clientIdentity,
    currency: syncedMatrix.meta.currency ?? 'ILS',
    companyName: reportData.companyName,
    qualityScore,
    qualityGrade: confidenceToGrade(qualityScore),
    trajectory: buildTrajectory(reportData.dcfRows),
    waccDonutBase: buildWaccDonutSlices(baseWaccPct),
    scenarios,
    findings: reportData.findings,
    reportId: reportData.reportId,
    industrySector: reportData.industrySector,
    lifecycleStage: reportData.lifecycleStage,
    terminalGrowthPct: reportData.terminalGrowth,
    ebitdaMarginPct,
    revenue,
    ebitda,
    ebitdaBlend: equifyComputed?.ebitdaBlend,
  };
}
