import type {
  CompTransactionRow,
  DcfYearRow,
  EbitdaSensitivityMatrix,
  ModelBlendRow,
  MultiplePositionRow,
  QualityFactorRow,
  ScenarioRow,
  SensitivityMatrix,
  TrajectoryPoint,
  ValuationData,
  WaccSegment,
} from './types';
import {
  getScenarioNarrative,
  multiplesMethodologyCopy,
  multiplesMethodologyCopyEn,
  resolveEquifySectorKey,
} from '../i18n/equify_report_copy';

const FINANCIAL_YEAR_ORDER = ['2023', '2024', '2025', '2026F', '2027F', '2028F'] as const;

const WACC_COLORS = ['#4DD6CE', '#00A89F', '#A8842E', '#0F5B55', '#C5EDE9'];

export interface EquifyReportApiFinancialYear {
  revenue: number;
  ebitda: number;
  ebitda_pct: number;
}

export interface EquifyReportApiValuation {
  equity_value_base: number;
  equity_value_bear: number;
  equity_value_bull: number;
  enterprise_value: number;
  net_debt: number;
  wacc: number;
  ebitda_multiple: number;
  revenue_multiple: number;
  dcf_ev: number;
  ebitda_ev?: number;
  revenue_ev?: number;
  quality_score: number;
  quality_grade: string;
}

export interface EquifyReportApiScenario {
  growth: number;
  wacc: number;
  multiple: number;
  ev: number;
  ebitda_margin?: number;
}

export interface EquifyReportApiWaccBreakdown {
  rf: number;
  erp: number;
  crp: number;
  size_premium: number;
  specific_risk: number;
}

export interface EquifyReportApiComp {
  name: string;
  year: number;
  ev: number;
  ev_ebitda: number;
  ev_revenue: number;
  ebitda_pct: number;
  note?: string;
}

export interface EquifyReportApiQualityFactor {
  score: number;
  max: number;
  label: string;
  finding?: string;
}

export interface EquifyReportApiIndustryBenchmarks {
  ebitda_multiple_median?: number;
  revenue_multiple_median?: number;
  ebitda_margin_pct_median?: number;
}

export interface EquifyReportApiData {
  financials: Record<string, EquifyReportApiFinancialYear>;
  valuation: EquifyReportApiValuation;
  scenarios: {
    bear: EquifyReportApiScenario;
    base: EquifyReportApiScenario;
    bull: EquifyReportApiScenario;
  };
  wacc_breakdown: EquifyReportApiWaccBreakdown;
  comps?: EquifyReportApiComp[];
  quality_factors?: Record<string, EquifyReportApiQualityFactor>;
  sensitivity_wacc?: Record<string, number[]>;
  sensitivity_ebitda?: Record<string, number[]>;
  dcf_rows?: DcfYearRow[];
  terminal_pv_m?: number;
  terminal_growth_pct?: number;
  terminal_share_pct?: number;
  /** Optional explicit sector benchmarks; otherwise derived from comps or valuation multiples. */
  industry_benchmarks?: EquifyReportApiIndustryBenchmarks;
}

/** Top-level POST body for /api/generate-pdf (nested API payload or wizard state). */
export interface EquifyReportApiPayload {
  companyName: string;
  registrationId?: string;
  valuationPurpose?: string;
  reportId?: string;
  valuationDate?: string;
  language?: 'he' | 'en';
  sector?: string;
  sectorLabel?: string;
  filename?: string;
  data: EquifyReportApiData;
}

function mToNis(m: number): number {
  return m * 1_000_000;
}

function isApiDataShape(data: unknown): data is EquifyReportApiData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.financials === 'object' &&
    d.financials !== null &&
    typeof d.valuation === 'object' &&
    d.valuation !== null
  );
}

export function isEquifyReportApiPayload(body: unknown): body is EquifyReportApiPayload {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return typeof b.companyName === 'string' && isApiDataShape(b.data);
}

function latestFinancialRow(
  financials: EquifyReportApiData['financials'],
): EquifyReportApiFinancialYear {
  for (let i = FINANCIAL_YEAR_ORDER.length - 1; i >= 0; i -= 1) {
    const y = FINANCIAL_YEAR_ORDER[i]!;
    if (financials[y]) return financials[y]!;
  }
  return { revenue: 1, ebitda: 0.2, ebitda_pct: 20 };
}

function buildTrajectory(financials: EquifyReportApiData['financials']): TrajectoryPoint[] {
  return FINANCIAL_YEAR_ORDER.filter((y) => financials[y]).map((y) => {
    const row = financials[y]!;
    const forecast = y.includes('F');
    return {
      label: y,
      revenueM: row.revenue,
      ebitdaM: row.ebitda,
      forecast,
      fcffM: forecast ? row.ebitda * 0.82 : undefined,
    };
  });
}

function buildWaccSegments(breakdown: EquifyReportApiWaccBreakdown): WaccSegment[] {
  const labels = [
    'ריבית חסרת סיכון (אג״ח ממשלתי 10Y)',
    'פרמיית סיכון שוק',
    'פרמיית סיכון מדינה · Damodaran',
    'פרמיית גודל וסחירות',
    'התאמת סיכון ספציפי (Quality)',
  ];
  const values = [
    breakdown.rf,
    breakdown.erp,
    breakdown.crp,
    breakdown.size_premium,
    breakdown.specific_risk,
  ];
  return values.map((pct, i) => ({
    label: labels[i] ?? '',
    pct,
    color: WACC_COLORS[i] ?? '#00A89F',
  }));
}

function buildDcfRowsFromApi(
  data: EquifyReportApiData,
  waccPct: number,
): { rows: DcfYearRow[]; terminalPvM: number; terminalSharePct: number } {
  if (data.dcf_rows?.length) {
    const terminalPvM = data.terminal_pv_m ?? 15.2;
    const pvSum = data.dcf_rows.reduce((s, r) => s + r.pvM, 0);
    const total = pvSum + terminalPvM;
    const terminalSharePct =
      data.terminal_share_pct ?? (total > 0 ? (terminalPvM / total) * 100 : 57);
    return { rows: data.dcf_rows, terminalPvM, terminalSharePct };
  }

  const baseScenario = data.scenarios.base;
  const g = Math.max(-0.05, baseScenario.growth / 100);
  const w = waccPct / 100;
  const latest = latestFinancialRow(data.financials);
  let fcffM = latest.ebitda * 0.82;
  const rows: DcfYearRow[] = [];
  let pvSum = 0;
  const baseYear = 2026;

  for (let i = 0; i < 5; i += 1) {
    fcffM *= 1 + g;
    const df = 1 / (1 + w) ** (i + 1);
    const pvM = fcffM * df;
    pvSum += pvM;
    rows.push({
      label: String(baseYear + i),
      fcffM,
      discountFactor: df,
      pvM,
    });
  }

  const gTerm = (data.terminal_growth_pct ?? 2.5) / 100;
  const tvM = (fcffM * (1 + gTerm)) / (w - gTerm) / (1 + w) ** 5;
  const terminalPvM = tvM;
  const total = pvSum + terminalPvM;
  const terminalSharePct = total > 0 ? (terminalPvM / total) * 100 : 57;

  return { rows, terminalPvM, terminalSharePct };
}

function buildModelBlend(
  v: EquifyReportApiValuation,
  latest: EquifyReportApiFinancialYear,
): ModelBlendRow[] {
  const ebitdaEvM = v.ebitda_ev ?? latest.ebitda * v.ebitda_multiple;
  const revenueEvM = v.revenue_ev ?? latest.revenue * v.revenue_multiple;

  return [
    {
      name: 'DCF + WACC (Damodaran CRP)',
      ev: mToNis(v.dcf_ev),
      weightPct: 50,
      contribution: mToNis(v.dcf_ev * 0.5),
    },
    {
      name: `מכפיל EBITDA — ×${v.ebitda_multiple.toFixed(1)}`,
      ev: mToNis(ebitdaEvM),
      weightPct: 30,
      contribution: mToNis(ebitdaEvM * 0.3),
    },
    {
      name: `מכפיל הכנסות — ×${v.revenue_multiple.toFixed(1)}`,
      ev: mToNis(revenueEvM),
      weightPct: 20,
      contribution: mToNis(revenueEvM * 0.2),
    },
  ];
}

function buildScenarioRows(
  data: EquifyReportApiData,
  netDebtM: number,
  sectorKey: ReturnType<typeof resolveEquifySectorKey>,
  locale: 'he' | 'en' = 'he',
): ScenarioRow[] {
  const latest = latestFinancialRow(data.financials);
  const keys: Array<'bear' | 'base' | 'bull'> = ['bear', 'base', 'bull'];
  const labels: Record<string, string> = { bear: 'Bear', base: 'Base', bull: 'Bull' };
  const baseMargin = latest.ebitda_pct;
  const baseGrowth = data.scenarios.base.growth;

  return keys.map((key) => {
    const s = data.scenarios[key];
    const margin =
      s.ebitda_margin ??
      (key === 'bear'
        ? latest.ebitda_pct - 2.8
        : key === 'bull'
          ? latest.ebitda_pct + 1.9
          : latest.ebitda_pct);
    const narrative = getScenarioNarrative(key, sectorKey, {
      growthPct: s.growth,
      baseGrowthPct: baseGrowth,
      ebitdaMarginPct: margin,
      baseEbitdaMarginPct: baseMargin,
    }, locale);

    return {
      key,
      label: labels[key]!,
      growthPct: s.growth,
      ebitdaMarginPct: margin,
      waccPct: s.wacc,
      multiple: s.multiple,
      ev: mToNis(s.ev),
      equity: mToNis(Math.max(0, s.ev - netDebtM)),
      description: narrative.description,
      fullDescription: narrative.fullDescription,
      narrative: narrative.description,
    };
  });
}

function buildQualityFactors(
  factors: EquifyReportApiData['quality_factors'],
): QualityFactorRow[] {
  if (!factors) return [];
  return Object.values(factors).map((f) => ({
    label: f.label,
    finding: f.finding ?? `${f.score} / ${f.max}`,
    score: f.score,
    maxScore: f.max,
  }));
}

function mapSensitivityWacc(
  raw: Record<string, number[]>,
  baseEquityM: number,
  baseGrowth: number,
): SensitivityMatrix {
  const waccKeys = Object.keys(raw).sort(
    (a, b) => parseFloat(a) - parseFloat(b),
  );
  const waccLabels = waccKeys.map((k) => `${parseFloat(k).toFixed(1)}%`);

  const colCount = raw[waccKeys[0]!]?.length ?? 5;
  const growthDeltas = [15, 12, baseGrowth, 6, 3].slice(0, colCount);
  const growthLabels = growthDeltas.map((g) => `+${g}%`);
  const cells = waccKeys.map((k) => raw[k] ?? []);

  let baseRow = 2;
  let baseCol = 2;
  let bestDiff = Infinity;
  cells.forEach((row, ri) => {
    row.forEach((val, ci) => {
      const diff = Math.abs(val - baseEquityM);
      if (diff < bestDiff) {
        bestDiff = diff;
        baseRow = ri;
        baseCol = ci;
      }
    });
  });

  return { growthLabels, waccLabels, cells, baseRow, baseCol };
}

function mapSensitivityEbitda(
  raw: Record<string, number[]>,
  baseEquityM: number,
): EbitdaSensitivityMatrix {
  const ebitdaKeys = Object.keys(raw).sort(
    (a, b) => parseFloat(a) - parseFloat(b),
  );
  const ebitdaLabels = ebitdaKeys.map(
    (k) => `₪${parseFloat(k).toFixed(1)}M`,
  );

  const colCount = raw[ebitdaKeys[0]!]?.length ?? 5;
  const mults = [5.8, 6.9, 7.5, 8.4, 9.5].slice(0, colCount);
  const multipleLabels = mults.map((m) => `×${m.toFixed(1)}`);
  const cells = ebitdaKeys.map((k) => raw[k] ?? []);

  let baseRow = 2;
  let baseCol = 2;
  let bestDiff = Infinity;
  cells.forEach((row, ri) => {
    row.forEach((val, ci) => {
      const diff = Math.abs(val - baseEquityM);
      if (diff < bestDiff) {
        bestDiff = diff;
        baseRow = ri;
        baseCol = ci;
      }
    });
  });

  return { ebitdaLabels, multipleLabels, cells, baseRow, baseCol };
}

function buildMultiplesPositions(
  v: EquifyReportApiValuation,
  latest: EquifyReportApiFinancialYear,
  industryEbitdaMedian: number,
  industryRevenueMedian: number,
): MultiplePositionRow[] {
  const ebitdaEvM = v.ebitda_ev ?? latest.ebitda * v.ebitda_multiple;
  const revenueEvM = v.revenue_ev ?? latest.revenue * v.revenue_multiple;
  const dcfEvM = v.dcf_ev;

  return [
    {
      id: 'ebitda',
      title: 'EV / EBITDA',
      impliedEv: mToNis(ebitdaEvM),
      multiple: v.ebitda_multiple,
      rangeMin: industryEbitdaMedian * 0.75,
      rangeMax: industryEbitdaMedian * 1.45,
      marketMin: industryEbitdaMedian * 0.8,
      marketMax: industryEbitdaMedian * 1.35,
      color: '#00A89F',
    },
    {
      id: 'revenue',
      title: 'EV / Revenue',
      impliedEv: mToNis(revenueEvM),
      multiple: v.revenue_multiple,
      rangeMin: industryRevenueMedian * 0.55,
      rangeMax: industryRevenueMedian * 1.65,
      marketMin: industryRevenueMedian * 0.65,
      marketMax: industryRevenueMedian * 1.45,
      color: '#00A89F',
    },
    {
      id: 'dcf',
      title: 'DCF (₪M)',
      impliedEv: mToNis(dcfEvM),
      multiple: dcfEvM,
      rangeMin: dcfEvM * 0.72,
      rangeMax: dcfEvM * 1.28,
      marketMin: dcfEvM * 0.75,
      marketMax: dcfEvM * 1.22,
      color: '#A8842E',
    },
  ];
}

function buildComps(comps: EquifyReportApiComp[] | undefined): CompTransactionRow[] {
  if (!comps?.length) return [];
  return comps.map((c, i) => ({
    index: i + 1,
    sector: c.name,
    year: c.year,
    evM: c.ev,
    ebitdaMultiple: c.ev_ebitda,
    revenueMultiple: c.ev_revenue,
    ebitdaMarginPct: c.ebitda_pct,
    note: c.note,
  }));
}

function avgGrowth(trajectory: TrajectoryPoint[]): number {
  if (trajectory.length < 2) return 9;
  const first = trajectory[0]!;
  const last = trajectory[trajectory.length - 1]!;
  const years = trajectory.length - 1;
  if (first.revenueM <= 0 || years <= 0) return 9;
  const cagr = ((last.revenueM / first.revenueM) ** (1 / years) - 1) * 100;
  return Math.round(cagr);
}

function median(values: number[]): number | undefined {
  const nums = values.filter((n) => Number.isFinite(n));
  if (!nums.length) return undefined;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function resolveIndustryBenchmarks(
  data: EquifyReportApiData,
  v: EquifyReportApiValuation,
  latest: EquifyReportApiFinancialYear,
): {
  industryEbitdaMedian: number;
  industryRevenueMedian: number;
  industryEbitdaMarginPct: number;
} {
  const comps = data.comps ?? [];
  const overrides = data.industry_benchmarks;
  const ebitdaFromComps = median(comps.map((c) => c.ev_ebitda));
  const revFromComps = median(comps.map((c) => c.ev_revenue));
  const marginFromComps = median(comps.map((c) => c.ebitda_pct));

  return {
    industryEbitdaMedian:
      overrides?.ebitda_multiple_median ??
      ebitdaFromComps ??
      v.ebitda_multiple * 0.95,
    industryRevenueMedian:
      overrides?.revenue_multiple_median ??
      revFromComps ??
      v.revenue_multiple * 0.95,
    industryEbitdaMarginPct:
      overrides?.ebitda_margin_pct_median ??
      marginFromComps ??
      latest.ebitda_pct - 2,
  };
}

function sectorLabelForCopy(payload: EquifyReportApiPayload, locale: 'he' | 'en'): string {
  const label = payload.sectorLabel ?? payload.sector ?? '';
  if (label) return label;
  return locale === 'en' ? 'the relevant sector' : 'השירותים';
}

/** Maps external JSON API payload → ValuationData for PDF generation. */
export function mapApiPayloadToValuationData(payload: EquifyReportApiPayload): ValuationData {
  const { data } = payload;
  const v = data.valuation;
  const locale = payload.language ?? 'he';
  const latest = latestFinancialRow(data.financials);
  const trajectory = buildTrajectory(data.financials);
  const { rows: dcfRows, terminalPvM, terminalSharePct } = buildDcfRowsFromApi(data, v.wacc);
  const netDebtM = v.net_debt;

  const growthPct = data.scenarios.base.growth;
  const marginPct = latest.ebitda_pct;

  const valuationDate = payload.valuationDate ?? new Date().toLocaleDateString('he-IL');
  const reportId =
    payload.reportId ??
    `EQ-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`;

  const ebitdaEvM = v.ebitda_ev ?? latest.ebitda * v.ebitda_multiple;
  const revenueEvM = v.revenue_ev ?? latest.revenue * v.revenue_multiple;
  const industry = resolveIndustryBenchmarks(data, v, latest);
  const sectorCopyLabel = sectorLabelForCopy(payload, locale);

  return {
    reportId,
    valuationDate,
    valuationDateShort: valuationDate,
    locale,

    fullName: '',
    email: '',
    phone: '',
    companyName: payload.companyName,
    corporateId: payload.registrationId,
    sector: payload.sector ?? 'general',
    sectorLabel: payload.sectorLabel ?? 'כללי',
    lifecycle: 'mature',
    lifecycleLabel: locale === 'he' ? 'בשלות' : 'Mature',
    goal: 'negotiation',
    goalLabel: payload.valuationPurpose ?? (locale === 'he' ? 'משא ומתן אסטרטגי' : 'Strategic negotiation'),

    revenueK: latest.revenue * 1000,
    marginPct,
    growthPct,
    debtK: netDebtM * 1000,

    recurringPct: 0,
    topCustomerPct: 0,
    founderDependency: false,
    competition: false,
    ip: false,
    contracts: false,

    equity: mToNis(v.equity_value_base),
    enterpriseValue: mToNis(v.enterprise_value),
    bearEquity: mToNis(v.equity_value_bear),
    bullEquity: mToNis(v.equity_value_bull),
    netDebt: mToNis(netDebtM),
    dcfEv: mToNis(v.dcf_ev),
    ebitdaEv: mToNis(ebitdaEvM),
    revenueEv: mToNis(revenueEvM),
    waccPct: v.wacc,
    qualityScore: v.quality_score,
    qualityGrade: v.quality_grade,
    ebitda: mToNis(latest.ebitda),
    effectiveMult: v.ebitda_multiple,
    revenueMultiple: v.revenue_multiple,
    terminalSharePct,
    terminalGrowthPct: data.terminal_growth_pct ?? 2.5,

    trajectory,
    waccSegments: buildWaccSegments(data.wacc_breakdown),
    dcfRows,
    terminalPvM,
    scenarios: buildScenarioRows(
      data,
      netDebtM,
      resolveEquifySectorKey(payload.sector),
      locale,
    ),
    modelBlend: buildModelBlend(v, latest),
    qualityFactors: buildQualityFactors(data.quality_factors),
    multiplesPositions: buildMultiplesPositions(
      v,
      latest,
      industry.industryEbitdaMedian,
      industry.industryRevenueMedian,
    ),

    industryEbitdaMedian: industry.industryEbitdaMedian,
    industryRevenueMedian: industry.industryRevenueMedian,
    industryEbitdaMarginPct: industry.industryEbitdaMarginPct,

    compsTransactions: buildComps(data.comps),
    sensitivityGrowthWacc: data.sensitivity_wacc
      ? mapSensitivityWacc(data.sensitivity_wacc, v.equity_value_base, growthPct)
      : undefined,
    sensitivityEbitdaMult: data.sensitivity_ebitda
      ? mapSensitivityEbitda(data.sensitivity_ebitda, v.equity_value_base)
      : undefined,

    netDebtNote: `חוב נטו ליום ההערכה: ₪${netDebtM.toFixed(1)}M.`,
    multiplesIntro:
      locale === 'en'
        ? multiplesMethodologyCopyEn(`in ${sectorCopyLabel}`)
        : multiplesMethodologyCopy(`בענף ${sectorCopyLabel}`),
  };
}
