/** סוגי נתונים לתבנית PDF — כולל כל שדות האשף והתוצאות המחושבות */

export type ScenarioKey = 'bear' | 'base' | 'bull';

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
}

export interface EbitdaSensitivityMatrix {
  ebitdaLabels: string[];
  multipleLabels: string[];
  cells: number[][];
  baseRow: number;
  baseCol: number;
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
  enterpriseValue: number;
  bearEquity: number;
  bullEquity: number;
  netDebt: number;
  dcfEv: number;
  ebitdaEv: number;
  revenueEv: number;
  waccPct: number;
  qualityScore: number;
  qualityGrade: string;
  ebitda: number;
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
  disclaimer?: string;

  trajectory: TrajectoryPoint[];
  waccSegments: WaccSegment[];
  dcfRows: DcfYearRow[];
  terminalPvM: number;
  scenarios: ScenarioRow[];
  modelBlend: ModelBlendRow[];
  qualityFactors: QualityFactorRow[];
  multiplesPositions: MultiplePositionRow[];

  industryEbitdaMedian?: number;
  industryRevenueMedian?: number;
  industryEbitdaMarginPct?: number;
  /** Page 5 intro — sector-specific M&A calibration copy */
  multiplesIntro?: string;

  compsTransactions?: CompTransactionRow[];
  sensitivityGrowthWacc?: SensitivityMatrix;
  sensitivityEbitdaMult?: EbitdaSensitivityMatrix;
}
