import {
  computeScenarios,
  computeValuation,
  type ValuationComputed,
  type ValuationInputs,
} from '../valuation';
import type { ValuationLocale } from '../../api_client';
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

import {
  getMultiplesIntroText,
  getSectorDisplayLabel,
} from '../constants/industry_config';
import { getScenarioNarrative } from '../i18n/equify_report_copy';
import { isValidLogoDataUrl } from '../utils/logo_data_url';
import { computeNetDebtK } from '../wizard/map_equify_wizard';
import {
  BLENDED_EBITDA_WEIGHTS,
  type EbitdaBlendBreakdown,
} from '../valuation/blended_ebitda';
import { buildValuationInputsFromEquifyState } from '../wizard/build_valuation_inputs';
import {
  buildCalibratedFinancialTrajectory,
  ebitdaMarginPctFromYear,
  syncFinancialsDerived,
} from '../wizard/financial_history';
import { resolveSectorMethodologyConfig } from '../valuation/sector_methodology_resolver';
import { resolveDisplayCompanyName } from '../wizard/resolve_company_display';

function kToNis(k: number): number {
  return k * 1000;
}

const LIFECYCLE_LABELS: Record<string, string> = {
  seed: 'Seed',
  early: 'Early',
  growth: 'צמיחה',
  mature: 'בשלות',
};

const GOAL_LABELS_HE: Record<string, string> = {
  negotiation: 'משא ומתן אסטרטגי',
  fundraise: 'גיוס הון',
  partner: 'שותפות',
  bank: 'בנקאות',
  internal: 'דוח פנימי',
  legal: 'משפטי / מס',
  '': 'כללי',
};

const GOAL_LABELS_EN: Record<string, string> = {
  negotiation: 'Strategic negotiation',
  fundraise: 'Fundraising',
  partner: 'Partnership',
  bank: 'Bank financing',
  internal: 'Internal report',
  legal: 'Legal / tax',
  '': 'General',
};

function goalLabel(goal: string, locale: ValuationLocale): string {
  const map = locale === 'he' ? GOAL_LABELS_HE : GOAL_LABELS_EN;
  return map[goal] ?? goal;
}

function blendedEbitdaNote(
  blend: EbitdaBlendBreakdown,
  locale: ValuationLocale,
): string {
  const w = BLENDED_EBITDA_WEIGHTS;
  const pctPast = Math.round(w.past * 100);
  const pctCur = Math.round(w.current * 100);
  const pctProj = Math.round(w.projected * 100);
  const growth = blend.dcfGrowthPct.toFixed(1);
  if (locale === 'en') {
    return `${pctPast}/${pctCur}/${pctProj} weighted · past ₪${(blend.past / 1000).toFixed(1)}M · current ₪${(blend.current / 1000).toFixed(1)}M · projected (+${growth}%) ₪${(blend.projected / 1000).toFixed(1)}M · base ₪${(blend.blended / 1000).toFixed(1)}M`;
  }
  return `שקלול ${pctPast}/${pctCur}/${pctProj} · עבר ₪${(blend.past / 1000).toFixed(1)}M · נוכחי ₪${(blend.current / 1000).toFixed(1)}M · תחזית (+${growth}%) ₪${(blend.projected / 1000).toFixed(1)}M · בסיס ₪${(blend.blended / 1000).toFixed(1)}M`;
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
  sectorKey: EquifyWizardState['profile']['sector'],
  locale: ValuationLocale = 'he',
  baseMarginOverride?: number,
): ScenarioRow[] {
  const labels: Record<string, string> = { bear: 'Bear', base: 'Base', bull: 'Bull' };
  const baseMargin = baseMarginOverride ?? inputs.margin;

  return scenarios.rows.map((row) => {
    const mult = parseFloat(row.multDisplay.replace('×', '')) || 0;
    const marginAdj = row.label === 'bear' ? -2 : row.label === 'bull' ? 2 : 0;
    const ebitdaMarginPct = baseMargin + marginAdj;
    const baseRow = scenarios.rows.find((r) => r.label === 'base');
    const narrative = getScenarioNarrative(row.label as 'bear' | 'base' | 'bull', sectorKey, {
      growthPct: row.growthPct,
      baseGrowthPct: baseRow?.growthPct ?? inputs.growth,
      ebitdaMarginPct,
      baseEbitdaMarginPct: baseMargin,
    }, locale);

    return {
      key: row.label,
      label: labels[row.label],
      growthPct: row.growthPct,
      ebitdaMarginPct,
      waccPct: row.waccPct,
      multiple: mult,
      ev: kToNis(row.ev),
      equity: kToNis(row.equity),
      description: narrative.description,
      fullDescription: narrative.fullDescription,
      narrative: narrative.description,
    };
  });
}

function buildModelBlendRows(
  computed: ValuationComputed,
  inputs: ValuationInputs,
  locale: ValuationLocale,
): ModelBlendRow[] {
  const { blendWeights } = computed;
  const dcfWeight = Math.round(blendWeights.dcf * 100);
  const ebitdaWeight = Math.round(blendWeights.ebitda * 100);
  const revWeight = Math.round(blendWeights.rev * 100);
  const revMultDisplay =
    inputs.rev > 0 ? computed.revMult / inputs.rev : computed.effectiveMult * 0.25;

  const rows: ModelBlendRow[] = [
    {
      name: `DCF + WACC (${computed.wacc.toFixed(1)}%)`,
      ev: kToNis(computed.dcf),
      weightPct: dcfWeight,
      contribution: kToNis(computed.dcf * blendWeights.dcf),
    },
    {
      name:
        locale === 'en'
          ? `EBITDA multiple × ${computed.effectiveMult.toFixed(1)}`
          : `מכפיל EBITDA × ${computed.effectiveMult.toFixed(1)}`,
      ev: kToNis(computed.ebtMult),
      weightPct: ebitdaWeight,
      contribution: kToNis(computed.ebtMult * blendWeights.ebitda),
    },
  ];

  if (blendWeights.rev > 0) {
    rows.push({
      name:
        locale === 'en'
          ? `Revenue multiple × ${revMultDisplay.toFixed(1)}`
          : `מכפיל הכנסות × ${revMultDisplay.toFixed(1)}`,
      ev: kToNis(computed.revMult),
      weightPct: revWeight,
      contribution: kToNis(computed.revMult * blendWeights.rev),
    });
  }

  return rows;
}

/** ממפה מצב אשף + חישוב ל-ValuationData מלא לדוח PDF */
export function mapWizardToValuationData(
  state: EquifyWizardState,
  reportId?: string,
  locale: ValuationLocale = 'he',
): ValuationData {
  const syncedState: EquifyWizardState = {
    ...state,
    financials: syncFinancialsDerived(state.financials),
  };
  const netDebtK = computeNetDebtK(syncedState.financials);
  const inputs = buildValuationInputsFromEquifyState(syncedState);

  const computed = computeValuation(inputs);
  const scenarios = computeScenarios(computed, inputs);
  const { rows: dcfRows, terminalPvM, terminalSharePct } = buildDcfRows(inputs, computed);
  const now = new Date();
  const dateIso = now.toISOString().slice(0, 10);
  const dateShort = now.toLocaleDateString('he-IL');

  const modelBlend: ModelBlendRow[] = buildModelBlendRows(computed, inputs, locale);

  const revMultDisplay =
    inputs.rev > 0 ? computed.revMult / inputs.rev : computed.effectiveMult * 0.25;
  const sectorConfig = resolveSectorMethodologyConfig(syncedState.profile.sector);
  const industryMult =
    (sectorConfig.minMultiple + sectorConfig.maxMultiple) / 2;
  const ebitdaK = computed.ebitda;
  const { financials } = syncedState;
  const currentYearMarginPct =
    computed.calibratedYears?.y2026.marginPct ??
    ebitdaMarginPctFromYear(financials.y2026);
  const trajectory = buildCalibratedFinancialTrajectory(computed, financials);

  return {
    reportId: reportId ?? `EQ-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`,
    valuationDate: dateIso,
    valuationDateShort: dateShort,
    locale,

    fullName: syncedState.profile.fullName,
    email: syncedState.profile.userEmail,
    phone: syncedState.profile.userMobilePhone,
    companyName: resolveDisplayCompanyName(syncedState.profile.companyName, locale),
    corporateId: syncedState.profile.userCorporateTaxId || syncedState.profile.userNationalId,
    foundedYear: syncedState.profile.foundedYear ? Number(syncedState.profile.foundedYear) : undefined,
    sector: syncedState.profile.sector,
    sectorLabel: getSectorDisplayLabel(
      syncedState.profile.sector,
      syncedState.profile.subSector,
      locale,
    ),
    lifecycle: syncedState.profile.lifecycle,
    lifecycleLabel: LIFECYCLE_LABELS[syncedState.profile.lifecycle] ?? syncedState.profile.lifecycle,
    goal: syncedState.goal,
    goalLabel: goalLabel(syncedState.goal, locale),
    customLogoDataUrl: isValidLogoDataUrl(syncedState.profile.customLogoDataUrl)
      ? syncedState.profile.customLogoDataUrl
      : undefined,

    revenueK: financials.rev,
    marginPct: currentYearMarginPct,
    growthPct: financials.growth,
    debtK: netDebtK,
    currency: syncedState.profile.currency,
    fiscalYear: syncedState.profile.fiscalYear ? Number(syncedState.profile.fiscalYear) : undefined,

    recurringPct: syncedState.risk.recurring,
    topCustomerPct: syncedState.risk.topCustomer,
    founderDependency: syncedState.risk.founderDep,
    competition: syncedState.risk.competition,
    ip: syncedState.risk.ip,
    contracts: syncedState.risk.contracts,
    moatNotes: syncedState.profile.qualitativeDescription?.trim() || undefined,

    equity: kToNis(computed.equity),
    enterpriseValue: kToNis(computed.ev),
    bearEquity: kToNis(scenarios.bearEq),
    bullEquity: kToNis(scenarios.bullEq),
    netDebt: kToNis(netDebtK),
    dcfEv: kToNis(computed.dcf),
    ebitdaEv: kToNis(computed.ebtMult),
    revenueEv: kToNis(computed.revMult),
    waccPct: computed.wacc,
    qualityScore: computed.qs,
    qualityGrade: computed.qsGrade,
    ebitda: kToNis(computed.ebitda),
    ebitdaPast: kToNis(computed.ebitdaBlend.past),
    ebitdaCurrent: kToNis(computed.ebitdaBlend.current),
    ebitdaProjected: kToNis(computed.ebitdaBlend.projected),
    ebitdaBlendedNote: blendedEbitdaNote(computed.ebitdaBlend, locale),
    effectiveMult: computed.effectiveMult,
    revenueMultiple: revMultDisplay,
    multipleBase: computed.multipleBase,
    multipleConcentrationPenalty: computed.multipleConcentrationPenalty,
    historicalAvgMarginPct: computed.historicalAvgMarginPct,
    forwardEbitda2027K: computed.forwardEbitda2027K,
    waccBacklogAdjustment: computed.waccBacklogAdjustment,
    calibrationWarnings: computed.calibrationWarnings,
    terminalSharePct,
    terminalGrowthPct: 2.5,

    trajectory,
    waccSegments: buildWaccSegments(computed.wacc, computed.qs),
    dcfRows,
    terminalPvM,
    scenarios: scenarioRowsFromComputed(
      scenarios,
      inputs,
      syncedState.profile.sector,
      locale,
      currentYearMarginPct,
    ),
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
    industryEbitdaMarginPct: currentYearMarginPct - 2,

    sensitivityGrowthWacc: buildSensitivityGrowthWacc(
      computed.equity,
      financials.growth,
      computed.wacc,
      netDebtK,
    ),
    sensitivityEbitdaMult: buildSensitivityEbitdaMult(
      ebitdaK,
      computed.effectiveMult,
      netDebtK,
    ),

    netDebtNote: `חוב נטו ליום ההערכה: ₪${(netDebtK / 1000).toFixed(1)}M (חוב ברוטו ₪${(financials.grossDebtK / 1000).toFixed(1)}M פחות מזומן ₪${(financials.cashK / 1000).toFixed(1)}M).`,
    keyFindings: `Quality ${computed.qsGrade} · WACC ${computed.wacc.toFixed(1)}% · EBITDA base (30/50/20) ₪${(computed.ebitda / 1000).toFixed(1)}M · מכפיל ×${computed.effectiveMult.toFixed(1)} · TV ${terminalSharePct.toFixed(0)}% מ-DCF.`,
    multiplesIntro: getMultiplesIntroText(syncedState.profile.sector, locale),
  };
}
