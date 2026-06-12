import { computeFinancialDiagnostics } from '../../api_client';
import type { ValuationLocale } from '../../api_client';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import { normalizeMultiplesAnalysis } from '../valuation/normalize_multiples_analysis';
import type { CanonicalValuation } from '../valuation/canonical_valuation';
import {
  buildCanonicalMultiplesContext,
  buildCanonicalReportValuation,
} from './canonical_report_valuation';
import { buildExecutiveBullets } from './executive_bullets';
import {
  ebitdaMargin,
  formatValuationRef,
} from './formatters';
import { buildDcfProjection } from './dcf_projection';
import { harvestPdfClientIdentity } from './harvest_client_identity';
import type {
  DcfRow,
  MultipleRow,
  PdfClientIdentity,
  ValuationReportData,
} from './types';
import { getWizardContext } from './wizard_context';
import { isMeaningfulNumber } from './print/print_formatters';

function medianImpliedMultiplesEv(
  implied: CanonicalValuation['ev_multiples_implied'],
): number | undefined {
  const vals = [implied.evSales, implied.evEbitda, implied.pe].filter(
    (v): v is number => v != null && Number.isFinite(v) && v > 0,
  );
  if (!vals.length) return undefined;
  vals.sort((a, b) => a - b);
  const mid = Math.floor(vals.length / 2);
  return vals.length % 2 === 0
    ? (vals[mid - 1] + vals[mid]) / 2
    : vals[mid];
}

export interface ReportDataOverrides {
  baseEV?: number;
  bullEV?: number;
  bearEV?: number;
  evDcf?: number;
  evDcfBear?: number;
  evDcfBull?: number;
  canonicalValuation?: CanonicalValuation;
  arbitrageGap?: number;
  reinvestmentRate?: number;
  terminalValuePV?: number;
  dcfRows?: DcfRow[];
  clientIdentity?: PdfClientIdentity;
}

function resolveDcfRows(matrix: ForecastMatrixWithDiagnostics): DcfRow[] {
  const explicit = matrix.explicit_dcf ?? [];
  if (explicit.length > 0) {
    return explicit.map((row) => ({
      revenue: row.revenue,
      ebit: row.ebit ?? row.revenue * 0.2,
      fcff: row.fcff,
      pvFCFF: row.pv_fcff ?? row.fcff * 0.85,
      cumulativePV: row.cumulative_pv_fcff ?? row.fcff,
    }));
  }

  const scenarioRows = matrix.scenarios?.base;
  if (scenarioRows && 'explicit_rows' in scenarioRows) {
    const rows = (
      scenarioRows as { explicit_rows?: Array<Record<string, number>> }
    ).explicit_rows;
    if (rows?.length) {
      return rows.map((row) => ({
        revenue: row.revenue ?? 0,
        ebit: row.ebit ?? 0,
        fcff: row.fcff ?? 0,
        pvFCFF: row.pv_fcff ?? 0,
        cumulativePV: row.cumulative_pv_fcff ?? 0,
      }));
    }
  }

  return buildDcfProjection(matrix).rows.map((row) => ({
    revenue: row.revenue,
    ebit: row.ebit,
    fcff: row.fcff,
    pvFCFF: row.pvFcff,
    cumulativePV: row.cumulativePv,
  }));
}

function resolveLifecycleLabel(
  matrix: ForecastMatrixWithDiagnostics,
  locale: ValuationLocale,
): string {
  const group =
    normalizeMultiplesAnalysis(matrix.multiples_analysis)?.comparisonGroup ?? '';
  const stagePart = group.split('·')[1]?.trim();
  if (stagePart) return stagePart;
  return locale === 'he' ? 'צמיחה' : 'Growth';
}

function collectOmitted(
  data: Partial<ValuationReportData>,
): string[] {
  const omitted: string[] = [];
  if (!isMeaningfulNumber(data.netDebt)) omitted.push('חוב פיננסי נטו');
  if (!isMeaningfulNumber(data.ebitdaMargin)) omitted.push('שולי EBITDA');
  if (!isMeaningfulNumber(data.quickRatio)) omitted.push('יחס מהיר');
  if (!isMeaningfulNumber(data.currentRatio)) omitted.push('יחס שוטף');
  if (!isMeaningfulNumber(data.debtToEquity)) omitted.push('חוב להון');
  if (!isMeaningfulNumber(data.assetTurnover)) omitted.push('מחזור נכסים');
  return omitted;
}

export function mapMatrixToReportData(
  matrix: ForecastMatrixWithDiagnostics,
  locale: ValuationLocale,
  overrides: ReportDataOverrides = {},
): ValuationReportData {
  const wizard = getWizardContext(matrix);
  const canonical = buildCanonicalReportValuation(matrix, locale, {
    baseEV: overrides.baseEV,
    bearEV: overrides.bearEV,
    bullEV: overrides.bullEV,
    canonicalValuation: overrides.canonicalValuation,
  });

  const baseEV = canonical.enterpriseValue;
  const bearEV = canonical.bearEnterpriseValue;
  const bullEV = canonical.bullEnterpriseValue;
  const baseEquity = canonical.finalEquityValue;
  const bearEquity = canonical.bearEquity;
  const bullEquity = canonical.bullEquity;
  const netDebt = canonical.netDebt;

  const marketCap = matrix.capital_structure.market_cap_or_offer_price ?? 0;
  const arbitrageGap = overrides.arbitrageGap ?? baseEV - marketCap;
  const margin = ebitdaMargin(matrix);
  const ebitda =
    matrix.diagnostics_inputs?.ebitda ??
    matrix.assumptions.adjusted_ebit / 0.85;
  const cv = overrides.canonicalValuation;
  const revenue = cv?.revenue_basis.actual ?? matrix.assumptions.base_revenue;
  const revenueForecastY1 = cv?.revenue_basis.forecast_y1;
  const waccPct = matrix.assumptions.wacc * 100;
  const terminalGrowthPct = matrix.assumptions.g_terminal * 100;
  const reinvestmentRate =
    overrides.reinvestmentRate ??
    (matrix.terminal_value.reinvestment_rate_ss != null
      ? matrix.terminal_value.reinvestment_rate_ss * 100
      : 0);
  const terminalValuePV =
    overrides.terminalValuePV ??
    matrix.terminal_value.pv_terminal ??
    matrix.terminal_value.terminal_value * 0.4;

  const dcfRows = overrides.dcfRows ?? resolveDcfRows(matrix);

  const multiplesAnalysis: MultipleRow[] = [];
  const panel = buildCanonicalMultiplesContext(matrix, canonical);
  if (panel) {
    for (const card of panel.cards) {
      multiplesAnalysis.push({
        name: card.label,
        medianRatio: card.industryMedian,
        ratio: card.companyMultiple,
        impliedEV: card.impliedEv,
      });
    }
  }

  let quickRatio: number | undefined;
  let currentRatio: number | undefined;
  let debtToEquity: number | undefined;
  let assetTurnover: number | undefined;

  if (matrix.diagnostics_inputs) {
    const diag = computeFinancialDiagnostics(matrix.diagnostics_inputs);
    const qr = diag.liquidity.quickRatio.value;
    const cr = diag.liquidity.currentRatio.value;
    const de = diag.leverage.debtToEquity.value;
    const at = diag.operational.assetTurnover.value;
    if (isMeaningfulNumber(qr)) quickRatio = qr;
    if (isMeaningfulNumber(cr)) currentRatio = cr;
    if (isMeaningfulNumber(de)) debtToEquity = de;
    if (isMeaningfulNumber(at)) assetTurnover = at;
  }

  const industrySector =
    wizard.sector_label?.trim() ||
    panel?.industryName ||
    (locale === 'he' ? 'כללי' : 'General');

  const clientIdentity =
    overrides.clientIdentity ?? harvestPdfClientIdentity(matrix);
  const companyName =
    clientIdentity.companyName.trim() ||
    wizard.company_name?.trim() ||
    matrix.meta.company_name?.trim() ||
    (locale === 'he' ? 'חברה' : 'Company');

  const ebitdaMarginPct = margin > 0 ? margin * 100 : 0;

  const draft: ValuationReportData = {
    reportId: formatValuationRef(matrix),
    companyName,
    clientIdentity,
    industrySector,
    lifecycleStage: resolveLifecycleLabel(matrix, locale),
    revenue,
    ebitda,
    ebitdaMargin: ebitdaMarginPct,
    wacc: waccPct,
    terminalGrowth: terminalGrowthPct,
    baseEV,
    bullEV,
    bearEV,
    blendedEV: cv?.ev_blended ?? panel?.blendedValue,
    evDcf: cv?.ev_dcf ?? overrides.evDcf,
    evDcfBear: cv?.ev_dcf_by_scenario.bear ?? overrides.evDcfBear,
    evDcfBull: cv?.ev_dcf_by_scenario.bull ?? overrides.evDcfBull,
    revenueForecastY1,
    weightingLabelHe: cv?.weightingLabelHe,
    blendWeights: cv?.weights
      ? { dcf: cv.weights.dcf, multiples: cv.weights.multiples }
      : undefined,
    evMultiplesMedian: cv
      ? medianImpliedMultiplesEv(cv.ev_multiples_implied)
      : undefined,
    arbitrageGap,
    reinvestmentRate,
    confidenceScore: matrix.meta.confidence_score ?? 78,
    findings: [...buildExecutiveBullets(matrix, locale, canonical)],
    dcfRows,
    multiplesAnalysis,
    terminalValuePV,
    quickRatio,
    currentRatio,
    debtToEquity,
    assetTurnover,
    firmLogoUrl: wizard.custom_logo_data_url ?? null,
    netDebt,
    baseEquity,
    bearEquity,
    bullEquity,
    verdict: canonical.verdict,
    equityBridge: canonical.bridge,
    canonical,
    omittedMetrics: [],
  };

  draft.omittedMetrics = collectOmitted(draft);
  return draft;
}
