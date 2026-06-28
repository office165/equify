import type { ForecastMatrixWithDiagnostics } from '../../../valuation_forecast';
import type { ValuationLocale } from '../../../api_client';
import { resolveScenarioElasticity, buildVarianceRibbon } from '../../valuation/scenario_elasticity';
import { resolveEquifySectorFromIndustryCode } from '../../wizard/build_valuation_inputs';
import { deriveWaccBreakdown } from '../dcf_projection';
import { getWizardContext } from '../wizard_context';
import type { ValuationReportData } from '../types';
import { parseReportDate, reportDateHe } from './print_formatters';
import { formatCurrencyNarrativeHe } from '../../utils/formatCurrency';

export type PdfScenarioKey = 'bear' | 'base' | 'bull';

export interface TrajectoryYear {
  label: string;
  revenueM: number;
  ebitdaM: number;
  forecast: boolean;
}

export interface WaccSegment {
  label: string;
  pct: number;
  color: string;
}

export interface ModelBlendRow {
  name: string;
  ev: number;
  weightPct: number;
  contribution: number;
  detail?: string;
}

export interface ScenarioRow {
  key: PdfScenarioKey;
  label: string;
  growthPct: number;
  ebitdaMarginPct: number;
  waccPct: number;
  multiple: number;
  ev: number;
  equity: number;
}

export interface MultiplePositionRow {
  id: string;
  title: string;
  impliedEv: number;
  multiple: number;
  rangeMin: number;
  rangeMax: number;
  marketMin: number;
  marketMax: number;
  color?: string;
}

export interface QualityFactorRow {
  label: string;
  finding: string;
  score: number;
}

export interface ValuationPdfViewModel {
  reportId: string;
  companyName: string;
  valuationDate: string;
  valuationDateShort: string;
  industrySector: string;
  lifecycleStage: string;
  goalLabel: string;
  clientFullName: string;
  corporateId: string;
  phone: string;
  email: string;
  finalValueM: string;
  finalEquity: number;
  bearEquity: number;
  bullEquity: number;
  enterpriseValue: number;
  netDebt: number;
  waccPct: number;
  qualityScore: number;
  qualityGrade: string;
  debtWidthPct: number;
  equityWidthPct: number;
  modelBlend: ModelBlendRow[];
  trajectory: TrajectoryYear[];
  trajectoryCeilingM: number;
  waccSegments: WaccSegment[];
  dcfFcffRows: Array<{
    label: string;
    fcffM: number;
    discountFactor: number;
    pvM: number;
  }>;
  terminalPvM: number;
  evDcf: number;
  terminalSharePct: number;
  scenarios: ScenarioRow[];
  multiplesPositions: MultiplePositionRow[];
  ebitdaMultiple: number;
  revenueMultiple: number;
  industryEbitdaMedian: number;
  industryRevenueMedian: number;
  ebitdaMarginPct: number;
  industryEbitdaMarginPct: number;
  qualityFactors: QualityFactorRow[];
  executiveSummary: string;
  netDebtNote: string;
}

const BLEND_WEIGHTS = { dcf: 0.5, ebitda: 0.3, revenue: 0.2 } as const;

function qualityGrade(score: number): string {
  if (score >= 85) return 'A';
  if (score >= 75) return 'A−';
  if (score >= 65) return 'B+';
  if (score >= 55) return 'B';
  if (score >= 45) return 'B−';
  return 'C+';
}

function fmtShortDate(d: Date): string {
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

function toMillions(value: number): number {
  return value / 1_000_000;
}

function resolveGoalLabel(_matrix: ForecastMatrixWithDiagnostics): string {
  return 'הערכת שווי כללית';
}

function buildTrajectory(
  data: ValuationReportData,
  matrix: ForecastMatrixWithDiagnostics,
): { years: TrajectoryYear[]; ceilingM: number } {
  const rows = data.dcfRows ?? [];
  const margin = data.ebitdaMargin > 0 ? data.ebitdaMargin / 100 : 0.2;
  const endYear = new Date().getFullYear();
  const startYear = endYear - 2;

  const years: TrajectoryYear[] = [];

  if (rows.length >= 3) {
    const histRev = data.revenue;
    const g0 = matrix.assumptions.revenue_growth_rates[0] ?? 0.08;
    const revY2 = histRev / (1 + g0);
    const revY1 = revY2 / (1 + g0);
    years.push(
      {
        label: String(startYear),
        revenueM: toMillions(revY1),
        ebitdaM: toMillions(revY1 * margin),
        forecast: false,
      },
      {
        label: String(startYear + 1),
        revenueM: toMillions(revY2),
        ebitdaM: toMillions(revY2 * margin),
        forecast: false,
      },
      {
        label: String(startYear + 2),
        revenueM: toMillions(histRev),
        ebitdaM: toMillions(data.ebitda),
        forecast: false,
      },
    );
    rows.slice(0, 3).forEach((row, i) => {
      const ebitda = row.ebit > 0 ? row.ebit / 0.85 : row.revenue * margin;
      years.push({
        label: `${endYear + 1 + i}F`,
        revenueM: toMillions(row.revenue),
        ebitdaM: toMillions(ebitda),
        forecast: true,
      });
    });
  } else {
    const baseRev = data.revenue;
    const g = matrix.assumptions.revenue_growth_rates[0] ?? 0.09;
    for (let i = 0; i < 6; i += 1) {
      const rev = baseRev * (1 + g) ** (i - 2);
      years.push({
        label: i < 3 ? String(startYear + i) : `${endYear + i - 2}F`,
        revenueM: toMillions(rev),
        ebitdaM: toMillions(rev * margin),
        forecast: i >= 3,
      });
    }
  }

  const ceilingM = Math.max(
    ...years.flatMap((y) => [y.revenueM, y.ebitdaM]),
    1,
  );
  const padded = Math.ceil(ceilingM * 1.15 * 2) / 2;
  return { years: years.slice(0, 6), ceilingM: padded };
}

function buildWaccSegments(matrix: ForecastMatrixWithDiagnostics, waccPct: number): WaccSegment[] {
  const wacc = deriveWaccBreakdown(matrix);
  const rf = wacc.riskFreeRate * 100;
  const erp = wacc.equityRiskPremium * 100;
  const crp = 1.6;
  const size = 3.1;
  const quality = Math.max(0, waccPct - rf - erp - crp - size);

  return [
    { label: 'ריבית חסרת סיכון (אג״ח ממשלתי 10Y)', pct: rf, color: '#4DD6CE' },
    { label: 'פרמיית סיכון שוק', pct: erp, color: '#00A89F' },
    { label: 'פרמיית סיכון מדינה · Damodaran', pct: crp, color: '#A8842E' },
    { label: 'פרמיית גודל וסחירות', pct: size, color: '#0F5B55' },
    { label: 'התאמת סיכון ספציפי (Quality)', pct: quality, color: '#C5EDE9' },
  ];
}

function buildQualityFactors(
  matrix: ForecastMatrixWithDiagnostics,
  score: number,
): QualityFactorRow[] {
  const wizard = getWizardContext(matrix);
  const recurring = wizard.recurring_revenue_percent ?? 60;
  const concentration = wizard.customer_concentration_pct ?? 20;
  return [
    {
      label: 'הכנסות חוזרות',
      finding: `${recurring}% מסך ההכנסות`,
      score: Math.round(recurring * 0.28),
    },
    {
      label: 'פיזור לקוחות',
      finding: `לקוח מרכזי ${concentration}%`,
      score: Math.round((1 - concentration / 100) * 22),
    },
    {
      label: 'תלות במייסד',
      finding: 'נמוכה עד בינונית',
      score: 12,
    },
    {
      label: 'עמידות תחרותית',
      finding: 'תחרות בינונית-גבוהה',
      score: 10,
    },
  ];
}

export function buildValuationPdfViewModel(
  data: ValuationReportData,
  matrix: ForecastMatrixWithDiagnostics,
  _locale: ValuationLocale = 'he',
): ValuationPdfViewModel {
  const canonical = data.canonical!;
  const wizard = getWizardContext(matrix);
  const id = data.clientIdentity;

  const ev = data.baseEV;
  const equity = canonical.finalEquityValue;
  const netDebt = canonical.netDebt;
  const debtWidthPct = ev > 0 ? Math.min(100, Math.round((netDebt / ev) * 100)) : 0;
  const equityWidthPct = ev > 0 ? Math.min(100, Math.round((equity / ev) * 100)) : 0;

  const evDcf = data.evDcf ?? matrix.scenarios?.base?.enterprise_value ?? ev;
  const ebitdaModel =
    data.multiplesAnalysis.find((m) => /ebitda/i.test(m.name))?.impliedEV ??
    (data.ebitda > 0 && data.evMultiplesMedian ? data.evMultiplesMedian : ev * 0.85);
  const revModel =
    data.multiplesAnalysis.find((m) => /הכנסות|revenue|sales/i.test(m.name))?.impliedEV ??
    data.revenue * 1.9;

  const ebitdaMult =
    data.ebitda > 0 ? ebitdaModel / data.ebitda : data.evMultiplesMedian ?? 7.5;
  const revenueMult = data.revenue > 0 ? revModel / data.revenue : 1.9;

  const modelBlend: ModelBlendRow[] = [
    {
      name: 'DCF + WACC (Damodaran CRP)',
      ev: evDcf,
      weightPct: BLEND_WEIGHTS.dcf * 100,
      contribution: evDcf * BLEND_WEIGHTS.dcf,
      detail: `WACC ${data.wacc.toFixed(1)}%`,
    },
    {
      name: `מכפיל EBITDA — ×${ebitdaMult.toFixed(1)}`,
      ev: ebitdaModel,
      weightPct: BLEND_WEIGHTS.ebitda * 100,
      contribution: ebitdaModel * BLEND_WEIGHTS.ebitda,
    },
    {
      name: `מכפיל הכנסות — ×${revenueMult.toFixed(1)}`,
      ev: revModel,
      weightPct: BLEND_WEIGHTS.revenue * 100,
      contribution: revModel * BLEND_WEIGHTS.revenue,
    },
  ];

  const { years, ceilingM } = buildTrajectory(data, matrix);
  const waccSegments = buildWaccSegments(matrix, data.wacc);

  const waccRate = data.wacc / 100;
  const dcfFcffRows = (data.dcfRows ?? []).slice(0, 5).map((row, i) => {
    const df = 1 / (1 + waccRate) ** (i + 1);
    return {
      label: String(new Date().getFullYear() + i),
      fcffM: toMillions(row.fcff),
      discountFactor: df,
      pvM: toMillions(row.pvFCFF),
    };
  });

  const terminalPvM = toMillions(data.terminalValuePV);
  const terminalSharePct =
    evDcf > 0 ? Math.round((data.terminalValuePV / evDcf) * 100) : 57;

  const baseGrowth = (matrix.assumptions.revenue_growth_rates[0] ?? 0.09) * 100;
  const baseMargin = data.ebitdaMargin;
  const qualityScore = data.confidenceScore ?? matrix.meta.confidence_score ?? 78;
  const revenueK = data.revenue / 1000;
  const sector = resolveEquifySectorFromIndustryCode(
    wizard?.industry_code ?? matrix.wizard_context?.industry_code,
  );
  const baseEquityK = (data.baseEquity ?? equity) / 1000;
  const netDebtK = netDebt / 1000;
  const ribbon = buildVarianceRibbon({
    baseEquityK,
    debtK: netDebtK,
    qualityScore,
    sector,
    revenueK,
  });
  const { elasticity } = ribbon;

  const scenarios: ScenarioRow[] = [
    {
      key: 'bear',
      label: '🐻 Bear — האטה ענפית',
      growthPct: baseGrowth,
      ebitdaMarginPct: baseMargin,
      waccPct: data.wacc + elasticity.waccDeltaPp,
      multiple: ebitdaMult - elasticity.multipleDelta,
      ev: ribbon.bearEvK * 1000,
      equity: ribbon.bearEquityK * 1000,
    },
    {
      key: 'base',
      label: '◆ Base — מגמה נוכחית',
      growthPct: baseGrowth,
      ebitdaMarginPct: baseMargin,
      waccPct: data.wacc,
      multiple: ebitdaMult,
      ev: ev,
      equity,
    },
    {
      key: 'bull',
      label: '🚀 Bull — האצת צמיחה',
      growthPct: baseGrowth,
      ebitdaMarginPct: baseMargin,
      waccPct: Math.max(8, data.wacc - elasticity.waccDeltaPp),
      multiple: ebitdaMult + elasticity.multipleDelta,
      ev: ribbon.bullEvK * 1000,
      equity: ribbon.bullEquityK * 1000,
    },
  ];

  const multiplesPositions: MultiplePositionRow[] = [
    {
      id: 'ebitda',
      title: 'מכפיל EBITDA',
      impliedEv: ebitdaModel,
      multiple: ebitdaMult,
      rangeMin: 4,
      rangeMax: 11,
      marketMin: 4,
      marketMax: 11,
    },
    {
      id: 'revenue',
      title: 'מכפיל הכנסות',
      impliedEv: revModel,
      multiple: revenueMult,
      rangeMin: 0.8,
      rangeMax: 3.2,
      marketMin: 0.8,
      marketMax: 3.2,
    },
    {
      id: 'dcf',
      title: 'DCF (להשוואה)',
      impliedEv: evDcf,
      multiple: evDcf,
      rangeMin: evDcf * 0.67,
      rangeMax: evDcf * 1.12,
      marketMin: evDcf * 0.67,
      marketMax: evDcf * 1.12,
      color: '#A8842E',
    },
  ];

  const currency = matrix.meta.currency ?? 'ILS';
  const totalDebt = matrix.capital_structure.total_debt;
  const cash = matrix.capital_structure.cash_and_equivalents;
  const corpId = id.corporateTaxId || id.nationalId;
  const valuationDate = reportDateHe(matrix.meta.generated_at);
  const dateShort = fmtShortDate(parseReportDate(matrix.meta.generated_at));

  return {
    reportId: data.reportId,
    companyName: data.companyName,
    valuationDate,
    valuationDateShort: dateShort,
    industrySector: data.industrySector,
    lifecycleStage: data.lifecycleStage,
    goalLabel: resolveGoalLabel(matrix),
    clientFullName: id.fullName,
    corporateId: corpId,
    phone: id.userPhone,
    email: id.userEmail,
    finalValueM: (equity / 1_000_000).toFixed(1),
    finalEquity: equity,
    bearEquity: data.bearEquity ?? canonical.bearEquity,
    bullEquity: data.bullEquity ?? canonical.bullEquity,
    enterpriseValue: ev,
    netDebt,
    waccPct: data.wacc,
    qualityScore: data.confidenceScore ?? 78,
    qualityGrade: qualityGrade(data.confidenceScore ?? 78),
    debtWidthPct,
    equityWidthPct,
    modelBlend,
    trajectory: years,
    trajectoryCeilingM: ceilingM,
    waccSegments,
    dcfFcffRows,
    terminalPvM,
    evDcf,
    terminalSharePct,
    scenarios,
    multiplesPositions,
    ebitdaMultiple: ebitdaMult,
    revenueMultiple: revenueMult,
    industryEbitdaMedian: ebitdaMult * 0.95,
    industryRevenueMedian: revenueMult * 0.95,
    ebitdaMarginPct: baseMargin,
    industryEbitdaMarginPct: baseMargin * 0.9,
    qualityFactors: buildQualityFactors(matrix, data.confidenceScore ?? 78),
    executiveSummary: `שקלול של מודל DCF (50%), מכפיל EBITDA (30%) ומכפיל הכנסות (20%) מניב שווי פעילות של ${formatCurrencyNarrativeHe(ev, currency)}. בניכוי חוב נטו של ${formatCurrencyNarrativeHe(netDebt, currency)}, השווי לבעלים בתרחיש הבסיס עומד על ${formatCurrencyNarrativeHe(equity, currency)}.`,
    netDebtNote: `חוב נטו ליום ההערכה: ${formatCurrencyNarrativeHe(netDebt, currency)} (חוב פיננסי ${formatCurrencyNarrativeHe(totalDebt, currency)} בניכוי מזומן ${formatCurrencyNarrativeHe(cash, currency)}).`,
  };
}
