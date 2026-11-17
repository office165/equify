import type { ActiveCurrencyProfile } from '../utils/formatCurrency';

export type ScenarioKey = 'bear' | 'base' | 'bull';

export interface ReportFinancialCore {
  auditedEbitda2026Abs: number;
  blendedEbitdaBaseAbs: number;
  multipleLegEbitdaBaseAbs: number;
  effectiveMultiple: number;
  blendedEnterpriseValueAbs: number;
  netDebtAbs: number;
  equityBaseAbs: number;
  dcfEvAbs: number;
  ebitdaMultipleEvAbs: number;
  revenueMultipleEvAbs: number;
  blendWeights: { dcf: number; ebitda: number; rev: number };
  /** Backlog contract uplift applied to blended EV (absolute reporting currency). */
  backlogEvAdjustmentAbs?: number;
}

export interface TrajectoryPoint {
  label: string;
  revenueM: number;
  ebitdaM: number;
  forecast?: boolean;
  fcffM?: number;
}

export interface WaccSegment {
  label: string;
  symbol?: string;
  pct: number;
  color: string;
  source?: string;
  /** Transparent sub-breakdown for economist review (e.g. specific risk components). */
  subRows?: Array<{ label: string; pct: number }>;
}

/** One row of the page 4 WACC table (round 2: Ke, Kd and weights in one table). */
export interface WaccTableRow {
  label: string;
  /** Percent value (e.g. 4.5 for 4.5%). */
  pct: number;
  kind: 'component' | 'sub' | 'subtotal' | 'weight' | 'total';
  color?: string;
}

export interface DcfYearRow {
  label: string;
  fcffM: number;
  discountFactor: number;
  pvM: number;
}

export interface ScenarioRow {
  key: ScenarioKey;
  label: string;
  growthPct: number;
  ebitdaMarginPct: number;
  waccPct: number;
  multiple: number;
  ev: number;
  equity: number;
  /** Short tagline — e.g. האטה ענפית · לחץ מחירים · −2% EBITDA */
  description?: string;
  /** Full scenario narrative paragraph */
  fullDescription?: string;
  /** @deprecated use description */
  narrative?: string;
}

export interface ModelBlendRow {
  name: string;
  ev: number;
  weightPct: number;
  contribution: number;
  detail?: string;
}

export interface QualityFactorRow {
  label: string;
  finding: string;
  score: number;
  maxScore?: number;
}

export interface MultiplePositionRow {
  id: 'ebitda' | 'revenue' | 'dcf' | string;
  title: string;
  impliedEv: number;
  multiple: number;
  rangeMin: number;
  rangeMax: number;
  marketMin: number;
  marketMax: number;
  color?: string;
}

export interface CompTransactionRow {
  index: number;
  sector: string;
  year: number;
  evM: number;
  ebitdaMultiple: number;
  revenueMultiple: number;
  ebitdaMarginPct: number;
  note?: string;
  highlight?: 'median' | 'subject';
}

export interface SensitivityMatrix {
  /** תוויות צמיחה לשורות (למשל "+15%") */
  growthLabels: string[];
  /** עמודות WACC (למשל "16.2%") */
  waccLabels: string[];
  /** ערכי שווי לבעלים ב-₪M */
  cells: number[][];
  baseRow: number;
  baseCol: number;
  /** Note under the table (how the cells were computed). */
  note?: string;
}

export interface EbitdaSensitivityMatrix {
  ebitdaLabels: string[];
  multipleLabels: string[];
  cells: number[][];
  baseRow: number;
  baseCol: number;
  /** Canonical base EBITDA (absolute) used for the center row — must match financialCore.multipleLegEbitdaBaseAbs. */
  baseEbitdaAbs?: number;
  baseMultiple?: number;
  /** Which multiple the columns vary (revenue for revenue-strategy sub-sectors). */
  multipleKind?: 'ebitda' | 'revenue';
  note?: string;
}

/**
 * מודל נתונים מלא לדוח PDF — ממופה משדות האשף + מנוע הוולואציה.
 * כל הסכומים ב-₪ (לא אלפי ₪) אלא אם צוין אחרת בשם השדה.
 */
export interface ValuationData {
  // —— מטא-דוח ——
  reportId: string;
  valuationDate: string;
  valuationDateShort?: string;
  locale?: 'he' | 'en';

  // —— שלב 1: פרופיל ——
  fullName: string;
  email: string;
  phone: string;
  companyName: string;
  corporateId?: string;
  foundedYear?: number;
  sector: string;
  sectorLabel: string;
  lifecycle: string;
  lifecycleLabel: string;
  goal: string;
  goalLabel: string;
  customLogoDataUrl?: string;

  // —— שלב 2: פיננסיים ——
  revenueK: number;
  marginPct: number;
  growthPct: number;
  debtK: number;
  currency?: 'ILS' | 'USD' | 'EUR' | string;
  /** Reporting-currency token profile — frozen at export for PDF/UI parity. */
  activeCurrency?: ActiveCurrencyProfile;
  fiscalYear?: number;

  // —— שלב 3: סיכון ——
  recurringPct: number;
  topCustomerPct: number;
  founderDependency: boolean;
  competition: boolean;
  ip: boolean;
  contracts: boolean;
  moatNotes?: string;

  // —— תוצאות וולואציה (בסיס) ——
  equity: number;
  /** Canonical ILS equity (absolute ₪) — engine output before reporting FX. */
  equityIls?: number;
  /** Display-only USD / EUR equivalents of {@link equityIls}. */
  equityUsd?: number;
  equityEur?: number;
  fxUsdRate?: number;
  fxEurRate?: number;
  fxAsOf?: string;
  /** 'fallback' when static backup rates were used (shown as such in the report). */
  fxSource?: 'live' | 'fallback' | 'cache';
  enterpriseValue: number;
  bearEquity: number;
  bullEquity: number;
  netDebt: number;
  /** DCF leg value (after the marketability discount in methodology 2). */
  dcfEv: number;
  /** Methodology 2: DCF value before the marketability discount (the page 4 table sums to it). */
  dcfMarketableEv?: number;
  /** Methodology 2: marketability factor on the DCF leg (0.8 to 0.9). */
  dcfMarketabilityFactor?: number;
  /** Methodology 2: private company layer lines for page 4 (one line each). */
  privateLayerLines?: string[];
  ebitdaEv: number;
  revenueEv: number;
  waccPct: number;
  qualityScore: number;
  qualityGrade: string;
  ebitda: number;
  /** M&A blended EBITDA base (30/50/20) — DCF/WACC anchor */
  blendedEbitdaBase?: number;
  /** EBITDA base used by the multiples valuation leg */
  multipleLegEbitdaBase?: number;
  financialCore?: ReportFinancialCore;
  effectiveMult: number;
  revenueMultiple: number;
  /** Blended EBITDA components (₪ absolute) for report disclosure */
  ebitdaPast?: number;
  ebitdaCurrent?: number;
  ebitdaProjected?: number;
  ebitdaBlendedNote?: string;
  terminalSharePct: number;
  terminalGrowthPct?: number;

  // —— תוכן דוח ——
  executiveSummary?: string;
  netDebtNote?: string;
  keyFindings?: string;
  /** Methodology disclosure when profitability regime ≠ healthy (negative EBITDA path). */
  profitabilityMethodologyNote?: string;
  /** Big-4 normalized EBITDA disclosure when historical years exist. */
  normalizedEbitdaNote?: string;
  /** Weights the engine used for the DCF EBITDA base ("EBITDA מייצג ל DCF"). */
  dcfEbitdaWeights?: { past: number; current: number; projected: number };
  /** Weights the engine used for the multiple EBITDA base ("EBITDA מנורמל למכפיל"). */
  multipleEbitdaWeights?: { prior2: number; prior1: number; current: number; anomalous: boolean };
  disclaimer?: string;

  trajectory: TrajectoryPoint[];
  /** Donut segments: each component weighted by E/V (Kd by D/V); sums to waccPct. */
  waccSegments: WaccSegment[];
  /** Page 4 table: Rf, beta x ERP, size, specific, Ke, Kd, weights, WACC. */
  waccTable?: WaccTableRow[];
  /** Short note under the WACC table (weights, bounds). */
  waccNote?: string;
  dcfRows: DcfYearRow[];
  /** Note under the DCF table (terminal cap, CAPEX consistency factor). */
  dcfNote?: string;
  /** 'v2' when METHOD_V2 is on. Absent in methodology 1. */
  methodVersion?: 'v2';
  /** Methodology 2 (T1): FCFF of the normalized terminal year (M, report currency). */
  terminalFcffM?: number;
  /** Methodology 2 (T1): Gordon denominator rate, max(WACC, g + 3 points) (%). */
  terminalDiscountRatePct?: number;
  /** Methodology 2: the report needs a manual review before it is sent. */
  manualReview?: import('../valuation/method_v2').ManualReview;
  terminalPvM: number;
  scenarios: ScenarioRow[];
  modelBlend: ModelBlendRow[];
  qualityFactors: QualityFactorRow[];
  multiplesPositions: MultiplePositionRow[];

  /** Damodaran industry multiples for page 5 (round 2, finding 7). */
  industryMultiples?: {
    industry: string;
    evEbitdaLow: number;
    evEbitdaHigh: number;
    evSalesLow: number;
    evSalesHigh: number;
    /** Company revenue multiple shown on page 5 and whether it is the leg multiple or EV/Sales implied. */
    companyRevenueMultiple: number;
    revenueMultipleKind: 'leg' | 'implied';
    footnote: string;
  };
  industryEbitdaMedian?: number;
  industryRevenueMedian?: number;
  industryEbitdaMarginPct?: number;
  /** Calibrated multiple before concentration penalty (Page 5). */
  multipleBase?: number;
  multipleConcentrationPenalty?: number;
  historicalAvgMarginPct?: number;
  forwardEbitda2027K?: number;
  waccBacklogAdjustment?: number;
  calibrationWarnings?: string[];
  /** Page 5 intro — sector-specific M&A calibration copy */
  multiplesIntro?: string;

  compsTransactions?: CompTransactionRow[];
  sensitivityGrowthWacc?: SensitivityMatrix;
  sensitivityEbitdaMult?: EbitdaSensitivityMatrix;
}
