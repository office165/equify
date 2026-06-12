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

export const BLEND_WEIGHTS = { dcf: 0.5, ebitda: 0.3, rev: 0.2 } as const;

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
): ScenarioMetrics {
  const evDcf = canonical.ev_dcf_by_scenario[scenario];
  const blendedEv =
    BLEND_WEIGHTS.dcf * evDcf +
    BLEND_WEIGHTS.ebitda * evEbitda +
    BLEND_WEIGHTS.rev * evRev;
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

export function buildReportViewModel(
  matrix: ForecastMatrixWithDiagnostics,
  locale: ValuationLocale,
): ReportViewModel {
  const liveScenarios = resolveLiveScenarios(matrix);
  const canonical = buildCanonicalValuation(matrix, liveScenarios);
  const reportData = mapMatrixToReportData(matrix, locale, {
    canonicalValuation: canonical,
  });
  const clientIdentity = harvestPdfClientIdentity(matrix);
  const baseWaccPct = matrix.assumptions.wacc * 100;
  const evEbitda = resolveEvEbitda(canonical, reportData);
  const evRev = resolveEvRev(canonical, reportData);
  const qualityScore = matrix.meta.confidence_score ?? reportData.confidenceScore ?? 78;

  const scenarios: Record<ValuationScenario, ScenarioMetrics> = {
    bear: buildScenarioMetrics('bear', canonical, baseWaccPct, evEbitda, evRev),
    base: buildScenarioMetrics('base', canonical, baseWaccPct, evEbitda, evRev),
    bull: buildScenarioMetrics('bull', canonical, baseWaccPct, evEbitda, evRev),
  };

  return {
    matrix,
    reportData,
    canonical,
    clientIdentity,
    currency: matrix.meta.currency ?? 'ILS',
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
    ebitdaMarginPct: reportData.ebitdaMargin,
    revenue: reportData.revenue,
    ebitda: reportData.ebitda,
  };
}
