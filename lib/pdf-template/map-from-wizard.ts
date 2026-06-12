import {
  computeScenarios,
  computeValuation,
  LIFECYCLE_ADJ,
  SECTOR_MULTIPLIERS,
  type ValuationComputed,
  type ValuationInputs,
} from '../valuation';
import type { EquifyWizardState } from '../wizard/map_equify_wizard';
import type {
  DcfYearRow,
  EbitdaSensitivityMatrix,
  ModelBlendRow,
  QualityFactorRow,
  ScenarioRow,
  SensitivityMatrix,
  TrajectoryPoint,
  ValuationData,
  WaccSegment,
} from './types';

const SECTOR_LABELS: Record<string, string> = {
  saas: 'SaaS / תוכנה',
  fintech: 'FinTech',
  cyber: 'סייבר',
  health: 'HealthTech',
  services: 'שירותים מקצועיים',
  industry: 'תעשייה',
  ecom: 'מסחר אלקטרוני',
  energy: 'אנרגיה',
  other: 'אחר',
};

const LIFECYCLE_LABELS: Record<string, string> = {
  seed: 'Seed',
  early: 'Early',
  growth: 'צמיחה',
  mature: 'בשלות',
};

const GOAL_LABELS: Record<string, string> = {
  negotiation: 'משא ומתן אסטרטגי',
  fundraise: 'גיוס הון',
  partner: 'שותפות',
  bank: 'בנקאות',
  internal: 'דוח פנימי',
  legal: 'משפטי / מס',
  '': 'כללי',
};

function kToNis(k: number): number {
  return k * 1000;
}

function buildTrajectory(revK: number, marginPct: number, growthPct: number): TrajectoryPoint[] {
  const years: TrajectoryPoint[] = [];
  const baseYear = new Date().getFullYear();
  const g = 1 + growthPct / 100;

  for (let i = -2; i <= 3; i += 1) {
    const revM = (revK * g ** i) / 1000;
    const ebitdaM = revM * (marginPct / 100);
    const forecast = i > 0;
    years.push({
      label: forecast ? `${baseYear + i}F` : String(baseYear + i),
      revenueM: revM,
      ebitdaM,
      forecast,
      fcffM: forecast ? ebitdaM * 0.82 : undefined,
    });
  }
  return years;
}

function buildWaccSegments(waccPct: number, qs: number): WaccSegment[] {
  const rf = 4.3;
  const erp = 5.4;
  const crp = 1.6;
  const size = 3.1;
  const spec = Math.max(0.5, waccPct - rf - erp - crp - size);
  return [
    { label: 'ריבית חסרת סיכון', symbol: 'Rf', pct: rf, color: '#4DD6CE', source: 'Bank of Israel' },
    { label: 'פרמיית סיכון שוק', symbol: 'ERP', pct: erp, color: '#00A89F', source: 'Damodaran 2026' },
    { label: 'פרמיית סיכון מדינה', symbol: 'CRP', pct: crp, color: '#C9A84C', source: 'Damodaran Israel' },
    { label: 'פרמיית גודל', symbol: 'Size', pct: size, color: '#163530', source: 'Ibbotson' },
    {
      label: 'סיכון ספציפי',
      symbol: 'SRP',
      pct: spec,
      color: '#7FB8B4',
      source: `Quality Score ${qs}`,
    },
  ];
}

function buildDcfRows(
  inputs: ValuationInputs,
  computed: ValuationComputed,
): { rows: DcfYearRow[]; terminalPvM: number; terminalSharePct: number } {
  const g = Math.max(-0.05, inputs.growth / 100);
  const w = computed.wacc / 100;
  let fcffK = computed.ebitda * 0.85;
  const rows: DcfYearRow[] = [];
  let pvSum = 0;
  const baseYear = new Date().getFullYear() + 1;

  for (let i = 1; i <= 5; i += 1) {
    fcffK *= 1 + g;
    const df = 1 / (1 + w) ** i;
    const pvK = fcffK * df;
    pvSum += pvK;
    rows.push({
      label: String(baseYear + i - 1),
      fcffM: fcffK / 1000,
      discountFactor: df,
      pvM: pvK / 1000,
    });
  }

  const gTerm = 0.025;
  const tvK = (fcffK * (1 + gTerm)) / (w - gTerm) / (1 + w) ** 5;
  const terminalPvM = tvK / 1000;
  const totalDcfK = pvSum + tvK;
  const terminalSharePct = totalDcfK > 0 ? (tvK / totalDcfK) * 100 : 57;

  return { rows, terminalPvM, terminalSharePct };
}

function buildQualityFactors(inputs: ValuationInputs): QualityFactorRow[] {
  const { recurring, topCustomer, founderDep, competition, ip, contracts, growth } = inputs;
  return [
    {
      label: `הכנסות חוזרות (${recurring}%)`,
      finding: recurring >= 60 ? 'גבוה' : 'בינוני',
      score: Math.round(recurring * 0.28),
      maxScore: 28,
    },
    {
      label: `ריכוז לקוחות (${topCustomer}%)`,
      finding: topCustomer > 30 ? 'מרוכז' : 'מפוזר',
      score: Math.round((1 - topCustomer / 100) * 22),
      maxScore: 22,
    },
    {
      label: 'תלות במייסד',
      finding: founderDep ? 'גבוהה' : 'נמוכה',
      score: founderDep ? 0 : 14,
      maxScore: 14,
    },
    {
      label: 'תחרות בשוק',
      finding: competition ? 'גבוהה' : 'בינונית',
      score: competition ? 0 : 10,
      maxScore: 10,
    },
    {
      label: 'קניין רוחני',
      finding: ip ? 'מוגן' : 'ללא',
      score: ip ? 12 : 0,
      maxScore: 12,
    },
    {
      label: 'חוזים ארוכי טווח',
      finding: contracts ? 'קיימים' : 'חלקיים',
      score: contracts ? 10 : 0,
      maxScore: 10,
    },
    {
      label: `פרמיית צמיחה (${growth}%)`,
      finding: growth >= 10 ? 'גבוהה' : 'מתונה',
      score: Math.round(Math.min(14, growth * 0.5)),
      maxScore: 14,
    },
  ];
}

function buildSensitivityGrowthWacc(
  baseEquityK: number,
  baseGrowth: number,
  baseWacc: number,
  debtK: number,
): SensitivityMatrix {
  const growthDeltas = [15, 12, baseGrowth, 6, 3];
  const waccDeltas = [-1.7, -1.0, 0, 1.0, 1.8].map((d) => baseWacc + d);
  const baseRow = 2;
  const baseCol = 2;

  const cells = growthDeltas.map((g) =>
    waccDeltas.map((w) => {
      const growthFactor = 1 + (g - baseGrowth) * 0.012;
      const waccFactor = 1 - (w - baseWacc) * 0.045;
      const eqK = Math.max(0, baseEquityK * growthFactor * waccFactor);
      return eqK / 1000;
    }),
  );

  return {
    growthLabels: growthDeltas.map((g) => `+${g}%`),
    waccLabels: waccDeltas.map((w) => `${w.toFixed(1)}%`),
    cells,
    baseRow,
    baseCol,
  };
}

function buildSensitivityEbitdaMult(ebitdaK: number, mult: number, debtK: number): EbitdaSensitivityMatrix {
  const ebitdaKs = [ebitdaK * 0.72, ebitdaK * 0.86, ebitdaK, ebitdaK * 1.14];
  const mults = [mult * 0.73, mult * 0.87, mult, mult * 1.13, mult * 1.27];
  const baseRow = 2;
  const baseCol = 2;

  const cells = ebitdaKs.map((e) =>
    mults.map((m) => Math.max(0, (e * m - debtK) / 1000)),
  );

  return {
    ebitdaLabels: ebitdaKs.map((e) => `₪${(e / 1000).toFixed(1)}M`),
    multipleLabels: mults.map((m) => `×${m.toFixed(1)}`),
    cells,
    baseRow,
    baseCol,
  };
}

function scenarioRowsFromComputed(
  scenarios: ReturnType<typeof computeScenarios>,
  inputs: ValuationInputs,
): ScenarioRow[] {
  const labels: Record<string, string> = { bear: 'Bear', base: 'Base', bull: 'Bull' };
  const narratives: Record<string, string> = {
    bear: 'האטה ענפית · לחץ מחירים · EBITDA −2%',
    base: 'המשך מגמה נוכחית · EBITDA יציב',
    bull: 'הרחבה · גיוס לקוחות · EBITDA +2%',
  };

  return scenarios.rows.map((row) => {
    const mult = parseFloat(row.multDisplay.replace('×', '')) || 0;
    const marginAdj = row.label === 'bear' ? -2 : row.label === 'bull' ? 2 : 0;
    return {
      key: row.label,
      label: labels[row.label],
      growthPct: row.growthPct,
      ebitdaMarginPct: inputs.margin + marginAdj,
      waccPct: row.waccPct,
      multiple: mult,
      ev: kToNis(row.ev),
      equity: kToNis(row.equity),
      narrative: narratives[row.label],
    };
  });
}

/** ממפה מצב אשף + חישוב ל-ValuationData מלא לדוח PDF */
export function mapWizardToValuationData(
  state: EquifyWizardState,
  reportId?: string,
): ValuationData {
  const inputs: ValuationInputs = {
    rev: state.financials.rev,
    margin: state.financials.margin,
    growth: state.financials.growth,
    debt: state.financials.debt,
    sectorMult: SECTOR_MULTIPLIERS[state.profile.sector],
    lifecycleAdj: LIFECYCLE_ADJ[state.profile.lifecycle],
    recurring: state.risk.recurring,
    topCustomer: state.risk.topCustomer,
    founderDep: state.risk.founderDep,
    competition: state.risk.competition,
    ip: state.risk.ip,
    contracts: state.risk.contracts,
  };

  const computed = computeValuation(inputs);
  const scenarios = computeScenarios(computed, inputs);
  const { rows: dcfRows, terminalPvM, terminalSharePct } = buildDcfRows(inputs, computed);
  const now = new Date();
  const dateStr = now.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const dateShort = now.toLocaleDateString('he-IL');

  const modelBlend: ModelBlendRow[] = [
    {
      name: `DCF + WACC (${computed.wacc.toFixed(1)}%)`,
      ev: kToNis(computed.dcf),
      weightPct: 50,
      contribution: kToNis(computed.dcf * 0.5),
    },
    {
      name: `מכפיל EBITDA × ${computed.effectiveMult.toFixed(1)}`,
      ev: kToNis(computed.ebtMult),
      weightPct: 30,
      contribution: kToNis(computed.ebtMult * 0.3),
    },
    {
      name: `מכפיל הכנסות × ${(computed.revMult / computed.ebitda * computed.effectiveMult / computed.effectiveMult).toFixed(1)}`,
      ev: kToNis(computed.revMult),
      weightPct: 20,
      contribution: kToNis(computed.revMult * 0.2),
    },
  ];

  const revMultDisplay =
    inputs.rev > 0 ? computed.revMult / inputs.rev : computed.effectiveMult * 0.25;

  modelBlend[2] = {
    name: `מכפיל הכנסות × ${revMultDisplay.toFixed(1)}`,
    ev: kToNis(computed.revMult),
    weightPct: 20,
    contribution: kToNis(computed.revMult * 0.2),
  };

  const ebitdaK = computed.ebitda;
  const industryMult = computed.effectiveMult / inputs.sectorMult;

  return {
    reportId: reportId ?? `EQ-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`,
    valuationDate: dateStr,
    valuationDateShort: dateShort,
    locale: 'he',

    fullName: state.profile.fullName,
    email: state.profile.userEmail,
    phone: state.profile.userMobilePhone,
    companyName: state.profile.companyName,
    corporateId: state.profile.userCorporateTaxId || state.profile.userNationalId,
    foundedYear: state.profile.foundedYear ? Number(state.profile.foundedYear) : undefined,
    sector: state.profile.sector,
    sectorLabel: SECTOR_LABELS[state.profile.sector] ?? state.profile.sector,
    lifecycle: state.profile.lifecycle,
    lifecycleLabel: LIFECYCLE_LABELS[state.profile.lifecycle] ?? state.profile.lifecycle,
    goal: state.goal,
    goalLabel: GOAL_LABELS[state.goal] ?? state.goal,
    customLogoDataUrl: state.profile.customLogoDataUrl || undefined,

    revenueK: state.financials.rev,
    marginPct: state.financials.margin,
    growthPct: state.financials.growth,
    debtK: state.financials.debt,
    currency: state.profile.currency,
    fiscalYear: state.profile.fiscalYear ? Number(state.profile.fiscalYear) : undefined,

    recurringPct: state.risk.recurring,
    topCustomerPct: state.risk.topCustomer,
    founderDependency: state.risk.founderDep,
    competition: state.risk.competition,
    ip: state.risk.ip,
    contracts: state.risk.contracts,
    moatNotes: state.profile.qualitativeDescription || undefined,

    equity: kToNis(computed.equity),
    enterpriseValue: kToNis(computed.ev),
    bearEquity: kToNis(scenarios.bearEq),
    bullEquity: kToNis(scenarios.bullEq),
    netDebt: kToNis(state.financials.debt),
    dcfEv: kToNis(computed.dcf),
    ebitdaEv: kToNis(computed.ebtMult),
    revenueEv: kToNis(computed.revMult),
    waccPct: computed.wacc,
    qualityScore: computed.qs,
    qualityGrade: computed.qsGrade,
    ebitda: kToNis(computed.ebitda),
    effectiveMult: computed.effectiveMult,
    revenueMultiple: revMultDisplay,
    terminalSharePct,
    terminalGrowthPct: 2.5,

    trajectory: buildTrajectory(state.financials.rev, state.financials.margin, state.financials.growth),
    waccSegments: buildWaccSegments(computed.wacc, computed.qs),
    dcfRows,
    terminalPvM,
    scenarios: scenarioRowsFromComputed(scenarios, inputs),
    modelBlend,
    qualityFactors: buildQualityFactors(inputs),
    multiplesPositions: [
      {
        id: 'ebitda',
        title: 'EV / EBITDA',
        impliedEv: kToNis(computed.ebtMult),
        multiple: computed.effectiveMult,
        rangeMin: industryMult * 0.75,
        rangeMax: industryMult * 1.45,
        marketMin: industryMult * 0.8,
        marketMax: industryMult * 1.35,
        color: '#00A89F',
      },
      {
        id: 'revenue',
        title: 'EV / Revenue',
        impliedEv: kToNis(computed.revMult),
        multiple: revMultDisplay,
        rangeMin: revMultDisplay * 0.55,
        rangeMax: revMultDisplay * 1.65,
        marketMin: revMultDisplay * 0.65,
        marketMax: revMultDisplay * 1.45,
        color: '#00A89F',
      },
      {
        id: 'dcf',
        title: 'DCF (₪M)',
        impliedEv: kToNis(computed.dcf),
        multiple: computed.dcf / 1000,
        rangeMin: computed.dcf * 0.72 / 1000,
        rangeMax: computed.dcf * 1.28 / 1000,
        marketMin: computed.dcf * 0.75 / 1000,
        marketMax: computed.dcf * 1.22 / 1000,
        color: '#A8842E',
      },
    ],

    industryEbitdaMedian: industryMult,
    industryRevenueMedian: revMultDisplay * 0.95,
    industryEbitdaMarginPct: state.financials.margin - 2,

    sensitivityGrowthWacc: buildSensitivityGrowthWacc(
      computed.equity,
      state.financials.growth,
      computed.wacc,
      state.financials.debt,
    ),
    sensitivityEbitdaMult: buildSensitivityEbitdaMult(
      ebitdaK,
      computed.effectiveMult,
      state.financials.debt,
    ),

    netDebtNote: `חוב נטו ליום ההערכה: ₪${(state.financials.debt / 1000).toFixed(1)}M.`,
    keyFindings: `Quality ${computed.qsGrade} · WACC ${computed.wacc.toFixed(1)}% · מכפיל EBITDA ×${computed.effectiveMult.toFixed(1)} · TV ${terminalSharePct.toFixed(0)}% מ-DCF.`,
  };
}
