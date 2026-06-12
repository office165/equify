import type { CanonicalReportValuation } from './canonical_report_valuation';
import type { EquityBridgeMetrics } from '../valuation/equity_bridge';
import type { VerdictMetrics } from '../valuation/verdict_metrics';

export interface DcfRow {
  revenue: number;
  ebit: number;
  fcff: number;
  pvFCFF: number;
  cumulativePV: number;
}

export interface MultipleRow {
  name: string;
  medianRatio: number;
  ratio: number;
  impliedEV: number;
}

/** Verified wizard lead fields rendered in the PDF identity block. */
export interface PdfClientIdentity {
  fullName: string;
  companyName: string;
  nationalId: string;
  corporateTaxId: string;
  userPhone: string;
  userEmail: string;
}

export interface ValuationReportData {
  reportId: string;
  companyName: string;
  clientIdentity: PdfClientIdentity;
  industrySector: string;
  lifecycleStage: string;
  revenue: number;
  ebitda: number;
  ebitdaMargin: number;
  wacc: number;
  terminalGrowth: number;
  baseEV: number;
  bullEV: number;
  bearEV: number;
  blendedEV?: number;
  evDcf?: number;
  evDcfBear?: number;
  evDcfBull?: number;
  revenueForecastY1?: number;
  weightingLabelHe?: string;
  blendWeights?: { dcf: number; multiples: number };
  evMultiplesMedian?: number;
  arbitrageGap: number;
  reinvestmentRate: number;
  confidenceScore: number;
  findings: string[];
  dcfRows: DcfRow[];
  multiplesAnalysis: MultipleRow[];
  terminalValuePV: number;
  quickRatio?: number;
  currentRatio?: number;
  debtToEquity?: number;
  assetTurnover?: number;
  firmLogoUrl?: string | null;
  netDebt?: number;
  baseEquity?: number;
  bearEquity?: number;
  bullEquity?: number;
  verdict?: VerdictMetrics | null;
  equityBridge?: EquityBridgeMetrics | null;
  /** Single source of truth for all report figures (base scenario) */
  canonical?: CanonicalReportValuation;
  omittedMetrics?: string[];
}
