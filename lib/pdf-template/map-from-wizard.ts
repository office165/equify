import {
  computeScenarios,
  computeValuation,
  type ValuationComputed,
  type ValuationInputs,
} from '../valuation';
import {
  STUB_PERIOD_DISCOUNT_EXPONENT,
  projectDcfHorizon,
} from '../valuation/scenario_matrix';
import { parseCapexPct, resolveCapexIndustryKey } from '../valuation/capex_fcf';
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
import { formatValuationOutputSync } from '../currency-normalize';
import { buildValuationInputsFromEquifyState } from '../wizard/build_valuation_inputs';
import { applyReportingFxLayer } from '../valuation/apply_reporting_fx';
import { getCachedFxRates } from '../utils/fxService';
import {
  formatCurrencyNarrativeHe,
  formatCurrencyShort,
  resolveActiveCurrency,
} from '../utils/formatCurrency';
import {
  coercePercentNumber,
  ebitdaMarginPctFromYear,
  syncFinancialsDerived,
} from '../wizard/financial_history';
import { buildProfitabilityMethodologyNoteHe } from '../valuation/profitability_regime';
import { buildNormalizedEbitdaNoteHe } from '../valuation/normalized_ebitda';
import { resolveSectorMethodologyConfig } from '../valuation/sector_methodology_resolver';
import { resolveDisplayCompanyName } from '../wizard/resolve_company_display';
import {
  buildReportFinancialCore,
  buildWizardReportTrajectory,
  wizardFinancialAbsFromK,
} from './report-financial-core';
import type { ReportFinancialCore } from './types';

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
  currency: string,
): string {
  const w = BLENDED_EBITDA_WEIGHTS;
  const pctPast = Math.round(w.past * 100);
  const pctCur = Math.round(w.current * 100);
  const pctProj = Math.round(w.projected * 100);
  const growth = blend.dcfGrowthPct.toFixed(1);
  const fmt = (k: number) => formatCurrencyShort(k * 1000, currency);
  if (locale === 'en') {
    return `${pctPast}/${pctCur}/${pctProj} weighted · past ${fmt(blend.past)} · current ${fmt(blend.current)} · projected (+${growth}%) ${fmt(blend.projected)} · base ${fmt(blend.blended)}`;
  }
  return `שקלול ${pctPast}/${pctCur}/${pctProj} · עבר ${fmt(blend.past)} · נוכחי ${fmt(blend.current)} · תחזית (+${growth}%) ${fmt(blend.projected)} · בסיס ${fmt(blend.blended)}`;
}

function formatNetDebtNoteHe(
  netDebtK: number,
  grossDebtK: number,
  cashK: number,
  currency: string,
): string {
  const net = wizardFinancialAbsFromK(netDebtK);
  const gross = wizardFinancialAbsFromK(grossDebtK);
  const cash = wizardFinancialAbsFromK(cashK);
  return `חוב נטו ליום ההערכה: ${formatCurrencyNarrativeHe(net, currency)} (חוב ברוטו ${formatCurrencyNarrativeHe(gross, currency)} פחות מזומן ${formatCurrencyNarrativeHe(cash, currency)}).`;
}

function buildSpecificRiskSubRows(
  breakdown: ValuationComputed['waccBreakdown'],
  topCustomerPct: number,
  locale: 'he' | 'en',
): Array<{ label: string; pct: number }> {
  const b = breakdown.specificRiskBreakdown;
  const pct = (v: number) => v;
  if (locale === 'en') {
    return [
      {
        label: `Customer concentration (${topCustomerPct}%):`,
        pct: pct(b.concentrationRisk),
      },
      { label: 'Founder dependency:', pct: pct(b.founderRisk) },
      {
        label: b.ipRisk > 0 ? 'IP protection: unprotected' : 'IP protection: protected',
        pct: pct(b.ipRisk),
      },
      {
        label:
          b.contractRisk > 0
            ? 'Contract stability: no long-term contracts'
            : 'Contract stability: long-term contracts',
        pct: pct(b.contractRisk),
      },
    ];
  }
  return [
    {
      label: `ריכוזיות לקוחות (${topCustomerPct}%):`,
      pct: pct(b.concentrationRisk),
    },
    { label: 'תלות במייסד:', pct: pct(b.founderRisk) },
    {
      label: b.ipRisk > 0 ? 'הגנת קניין רוחני: לא מוגן' : 'הגנת קניין רוחני: מוגן',
      pct: pct(b.ipRisk),
    },
    {
      label:
        b.contractRisk > 0
          ? 'יציבות חוזים: ללא חוזים ארוכי טווח'
          : 'יציבות חוזים: חוזים ארוכי טווח',
      pct: pct(b.contractRisk),
    },
  ];
}

function buildWaccSegments(
  waccPct: number,
  breakdown: ValuationComputed['waccBreakdown'],
  qs: number,
  topCustomerPct: number,
  locale: 'he' | 'en' = 'he',
): WaccSegment[] {
  const rf = breakdown.rf;
  const marketRisk = breakdown.leveredBeta * breakdown.erp;
  const crp = 1.6;
  const size = breakdown.alpha;
  const spec = breakdown.specificRiskPremium;

  return [
    { label: 'ריבית חסרת סיכון', symbol: 'Rf', pct: rf, color: '#4DD6CE', source: 'Bank of Israel' },
    {
      label: 'פרמיית סיכון שוק',
      symbol: 'ERP',
      pct: marketRisk,
      color: '#00A89F',
      source: 'Damodaran 2026',
    },
    { label: 'פרמיית סיכון מדינה', symbol: 'CRP', pct: crp, color: '#C9A84C', source: 'Damodaran Israel' },
    { label: 'פרמיית גודל', symbol: 'Size', pct: size, color: '#163530', source: 'Ibbotson' },
    {
      label: locale === 'en' ? 'Specific risk' : 'סיכון ספציפי',
      symbol: 'SRP',
      pct: spec,
      color: '#7FB8B4',
      source: `Quality Score ${qs}`,
      subRows: buildSpecificRiskSubRows(breakdown, topCustomerPct, locale),
    },
    ...(breakdown.profitabilityLossPremium > 0
      ? [
          {
            label: locale === 'en' ? 'Loss-making premium' : 'פרמיית הפסדיות',
            symbol: 'Distress',
            pct: breakdown.profitabilityLossPremium,
            color: '#B85C5C',
            source: 'Damodaran distress',
          },
        ]
      : []),
  ];
}

function buildDcfRows(
  inputs: ValuationInputs,
  computed: ValuationComputed,
): { rows: DcfYearRow[]; terminalPvM: number; terminalSharePct: number } {
  const revK = inputs.revenue2026K ?? inputs.rev ?? 0;
  const capexLevelPct = parseCapexPct(inputs.capexLevelPct ?? 0);
  const headlineGrowthPct =
    coercePercentNumber(computed.dcfGrowthPct) || coercePercentNumber(inputs.growth);
  const w = computed.wacc / 100;
  const regime = computed.profitabilityRegime;
  const normalized = computed.normalizedEbitda;
  const sectorConfig = resolveSectorMethodologyConfig(inputs.sector, inputs.subSector);
  const recoveryAnchorMargin =
    normalized?.isCurrentYearAnomalous &&
    normalized.anomalyDirection === 'downside' &&
    normalized.historicalAvgMarginPct != null
      ? (normalized.historicalAvgMarginPct / 100) * 0.8
      : sectorConfig.maxHistoricalMargin;
  const turnaround =
    regime &&
    (regime.regime === 'loss_making' || regime.regime === 'deep_loss')
      ? {
          currentMargin: revK > 0 ? (inputs.ebitda2026K ?? computed.ebitda) / revK : 0,
          sectorNormalMargin: recoveryAnchorMargin,
          turnaroundYears: regime.turnaroundYears,
        }
      : undefined;
  const projection = projectDcfHorizon({
    ebitdaK: computed.ebitda,
    revK,
    capexLevelPct,
    dcfGrowthPct: headlineGrowthPct,
    wacc: computed.wacc,
    industry: resolveCapexIndustryKey(inputs.sector, inputs.subSector),
    turnaround,
  });
  const rows: DcfYearRow[] = [];
  const baseYear = new Date().getFullYear() + 1;

  for (let i = 0; i < projection.fcffByYearK.length; i += 1) {
    const yearIndex = i + 1;
    const fcffK = projection.fcffByYearK[i];
    const discountExponent =
      yearIndex === 1 ? STUB_PERIOD_DISCOUNT_EXPONENT : yearIndex - STUB_PERIOD_DISCOUNT_EXPONENT;
    const df = 1 / (1 + w) ** discountExponent;
    rows.push({
      label: String(baseYear + i),
      fcffM: fcffK / 1000,
      discountFactor: df,
      pvM: (fcffK * df) / 1000,
    });
  }

  const terminalPvM = projection.terminalPvK / 1000;
  const terminalSharePct = projection.terminalShare * 100;

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
  core: ReportFinancialCore,
  baseGrowth: number,
  baseWacc: number,
): SensitivityMatrix {
  const baseEquityK = core.equityBaseAbs / 1000;
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

function buildSensitivityEbitdaMult(
  core: ReportFinancialCore,
  currency: string,
): EbitdaSensitivityMatrix {
  const ebitdaK = core.multipleLegEbitdaBaseAbs / 1000;
  const mult = core.effectiveMultiple;
  const ebitdaKs = [ebitdaK * 0.72, ebitdaK * 0.86, ebitdaK, ebitdaK * 1.14];
  const mults = [mult * 0.73, mult * 0.87, mult, mult * 1.13, mult * 1.27];
  const baseRow = 2;
  const baseCol = 2;

  const cells = ebitdaKs.map((e) =>
    mults.map((m) => Math.max(0, (e * m) / 1000)),
  );

  return {
    ebitdaLabels: ebitdaKs.map((e) => formatCurrencyShort(e * 1000, currency)),
    multipleLabels: mults.map((m) => `×${m.toFixed(1)}`),
    cells,
    baseRow,
    baseCol,
    baseEbitdaAbs: core.multipleLegEbitdaBaseAbs,
    baseMultiple: mult,
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
  const { blendWeights, modelBlendContributions } = computed;
  const dcfWeight = Math.round(blendWeights.dcf * 100);
  const ebitdaWeight = Math.round(blendWeights.ebitda * 100);
  const revWeight = Math.round(blendWeights.rev * 100);
  const revMultDisplay =
    inputs.rev > 0 ? computed.revMult / inputs.rev : computed.effectiveMult * 0.25;

  const contributions = modelBlendContributions ?? {
    dcf: computed.dcf * blendWeights.dcf,
    ebitda: computed.ebtMult * blendWeights.ebitda,
    rev: computed.revMult * blendWeights.rev,
    backlogAdjustment: computed.backlogEquityUpliftK ?? 0,
  };

  const rows: ModelBlendRow[] = [
    {
      name: `DCF + WACC (${computed.wacc.toFixed(1)}%)`,
      ev: kToNis(computed.dcf),
      weightPct: dcfWeight,
      contribution: kToNis(contributions.dcf),
    },
    {
      name:
        locale === 'en'
          ? `EBITDA multiple × ${computed.effectiveMult.toFixed(1)}`
          : `מכפיל EBITDA × ${computed.effectiveMult.toFixed(1)}`,
      ev: kToNis(computed.ebtMult),
      weightPct: ebitdaWeight,
      contribution: kToNis(contributions.ebitda),
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
      contribution: kToNis(contributions.rev),
    });
  }

  if (contributions.backlogAdjustment > 0) {
    rows.push({
      name:
        locale === 'en'
          ? `Backlog contract uplift (+${(computed.backlogEquityUpliftPct ?? 0).toFixed(1)}%)`
          : `תוספת צבר הזמנות (+${(computed.backlogEquityUpliftPct ?? 0).toFixed(1)}%)`,
      ev: kToNis(contributions.backlogAdjustment),
      weightPct: 100,
      contribution: kToNis(contributions.backlogAdjustment),
    });
  }

  return rows;
}

/** Maps pre-computed engine output to PDF layout fields — no valuation math. */
export function mapEngineResultToValuationData(
  syncedState: EquifyWizardState,
  inputs: ValuationInputs,
  fxComputed: ValuationComputed,
  fxScenarios: ReturnType<typeof computeScenarios>,
  fxRates: ReturnType<typeof getCachedFxRates>,
  locale: ValuationLocale = 'he',
  reportId?: string,
  ilsComputed?: ValuationComputed,
): ValuationData {
  const netDebtK = computeNetDebtK(syncedState.financials);
  const { rows: dcfRows, terminalPvM, terminalSharePct } = buildDcfRows(inputs, fxComputed);
  const now = new Date();
  const dateIso = now.toISOString().slice(0, 10);
  const dateShort = now.toLocaleDateString('he-IL');

  const modelBlend: ModelBlendRow[] = buildModelBlendRows(fxComputed, inputs, locale);

  const revMultDisplay =
    inputs.rev > 0 ? fxComputed.revMult / inputs.rev : fxComputed.effectiveMult * 0.25;
  const sectorConfig = resolveSectorMethodologyConfig(
    syncedState.profile.sector,
    syncedState.profile.subSector,
  );
  const industryMult =
    (sectorConfig.minMultiple + sectorConfig.maxMultiple) / 2;
  const reportingCurrency = syncedState.profile.currency ?? 'ILS';
  const { financials } = syncedState;
  const financialCore = buildReportFinancialCore(
    syncedState,
    fxComputed,
    fxComputed,
    netDebtK,
    fxRates,
  );
  const currentYearMarginPct =
    fxComputed.calibratedYears?.y2026.marginPct ??
    ebitdaMarginPctFromYear(financials.y2026);
  const trajectory = buildWizardReportTrajectory(financials);
  const waccSegments = buildWaccSegments(
    fxComputed.wacc,
    fxComputed.waccBreakdown,
    fxComputed.qs,
    syncedState.risk.topCustomer,
    locale,
  );
  const activeCurrency = resolveActiveCurrency(reportingCurrency, locale);
  const equityIlsAbs = kToNis((ilsComputed ?? fxComputed).equity);
  const valuationOutput = formatValuationOutputSync(equityIlsAbs, fxRates);

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
    activeCurrency,
    fiscalYear: syncedState.profile.fiscalYear ? Number(syncedState.profile.fiscalYear) : undefined,

    recurringPct: syncedState.risk.recurring,
    topCustomerPct: syncedState.risk.topCustomer,
    founderDependency: syncedState.risk.founderDep,
    competition: syncedState.risk.competition,
    ip: syncedState.risk.ip,
    contracts: syncedState.risk.contracts,
    moatNotes: syncedState.profile.qualitativeDescription?.trim() || undefined,

    equity: kToNis(fxComputed.equity),
    equityIls: equityIlsAbs,
    equityUsd: valuationOutput.equity_usd,
    equityEur: valuationOutput.equity_eur,
    fxUsdRate: valuationOutput.usd_rate_used,
    fxEurRate: valuationOutput.eur_rate_used,
    fxAsOf: fxRates.asOf,
    enterpriseValue: kToNis(fxComputed.ev),
    bearEquity: kToNis(fxScenarios.bearEq),
    bullEquity: kToNis(fxScenarios.bullEq),
    netDebt: wizardFinancialAbsFromK(netDebtK),
    dcfEv: kToNis(fxComputed.dcf),
    ebitdaEv: kToNis(fxComputed.ebtMult),
    revenueEv: kToNis(fxComputed.revMult),
    waccPct: fxComputed.wacc,
    qualityScore: fxComputed.qs,
    qualityGrade: fxComputed.qsGrade,
    ebitda: financialCore.auditedEbitda2026Abs,
    blendedEbitdaBase: financialCore.blendedEbitdaBaseAbs,
    multipleLegEbitdaBase: financialCore.multipleLegEbitdaBaseAbs,
    financialCore,
    ebitdaPast: kToNis(fxComputed.ebitdaBlend.past),
    ebitdaCurrent: kToNis(fxComputed.ebitdaBlend.current),
    ebitdaProjected: kToNis(fxComputed.ebitdaBlend.projected),
    ebitdaBlendedNote: blendedEbitdaNote(fxComputed.ebitdaBlend, locale, reportingCurrency),
    effectiveMult: fxComputed.effectiveMult,
    revenueMultiple: revMultDisplay,
    multipleBase: fxComputed.multipleBase,
    multipleConcentrationPenalty: fxComputed.multipleConcentrationPenalty,
    historicalAvgMarginPct: fxComputed.historicalAvgMarginPct,
    forwardEbitda2027K: fxComputed.forwardEbitda2027K,
    waccBacklogAdjustment: fxComputed.waccBacklogAdjustment,
    calibrationWarnings: fxComputed.calibrationWarnings,
    terminalSharePct,
    terminalGrowthPct: 2.5,

    trajectory,
    waccSegments,
    dcfRows,
    terminalPvM,
    scenarios: scenarioRowsFromComputed(
      fxScenarios,
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
        impliedEv: kToNis(fxComputed.ebtMult),
        multiple: fxComputed.effectiveMult,
        rangeMin: industryMult * 0.75,
        rangeMax: industryMult * 1.45,
        marketMin: industryMult * 0.8,
        marketMax: industryMult * 1.35,
        color: '#00A89F',
      },
      {
        id: 'revenue',
        title: 'EV / Revenue',
        impliedEv: kToNis(fxComputed.revMult),
        multiple: revMultDisplay,
        rangeMin: revMultDisplay * 0.55,
        rangeMax: revMultDisplay * 1.65,
        marketMin: revMultDisplay * 0.65,
        marketMax: revMultDisplay * 1.45,
        color: '#00A89F',
      },
      {
        id: 'margin',
        title: 'שיעור EBITDA',
        impliedEv: kToNis(fxComputed.ebitda),
        multiple: currentYearMarginPct,
        rangeMin: Math.max(0, currentYearMarginPct - 12),
        rangeMax: currentYearMarginPct + 12,
        marketMin: Math.max(0, (currentYearMarginPct - 2)),
        marketMax: currentYearMarginPct + 2,
        color: '#A8842E',
      },
    ],

    industryEbitdaMedian: industryMult,
    industryRevenueMedian: revMultDisplay * 0.95,
    industryEbitdaMarginPct: currentYearMarginPct - 2,

    sensitivityGrowthWacc: buildSensitivityGrowthWacc(
      financialCore,
      financials.growth,
      fxComputed.wacc,
    ),
    sensitivityEbitdaMult: buildSensitivityEbitdaMult(financialCore, reportingCurrency),

    netDebtNote: formatNetDebtNoteHe(
      netDebtK,
      financials.grossDebtK,
      financials.cashK,
      reportingCurrency,
    ),
    keyFindings: `Quality ${fxComputed.qsGrade} · WACC ${fxComputed.wacc.toFixed(1)}% · EBITDA מדווח 2026 ${formatCurrencyShort(financialCore.auditedEbitda2026Abs, reportingCurrency)} · בסיס מכפיל ${formatCurrencyShort(financialCore.multipleLegEbitdaBaseAbs, reportingCurrency)} ×${fxComputed.effectiveMult.toFixed(1)} · TV ${terminalSharePct.toFixed(0)}% מ-DCF.`,
    profitabilityMethodologyNote: fxComputed.profitabilityRegime
      ? buildProfitabilityMethodologyNoteHe(fxComputed.profitabilityRegime)
      : undefined,
    normalizedEbitdaNote:
      fxComputed.normalizedEbitda && fxComputed.normalizedEbitda.yearsAvailable > 1
        ? buildNormalizedEbitdaNoteHe(
            fxComputed.normalizedEbitda,
            {
              ebitda2024K: inputs.ebitda2024K,
              ebitda2025K: inputs.ebitda2025K,
              ebitda2026K: inputs.ebitda2026K,
            },
            (k) => formatCurrencyShort(k * 1000, reportingCurrency),
          )
        : undefined,
    multiplesIntro: getMultiplesIntroText(syncedState.profile.sector, locale),
  };
}

/** Full wizard → PDF mapping (re-runs engine). Prefer buildExportValuationDataFromLiveSession for exports. */
export function mapWizardToValuationData(
  state: EquifyWizardState,
  reportId?: string,
  locale: ValuationLocale = 'he',
  fxRates = getCachedFxRates(),
): ValuationData {
  const syncedState: EquifyWizardState = {
    ...state,
    financials: syncFinancialsDerived(state.financials),
  };
  const inputs = buildValuationInputsFromEquifyState(syncedState, fxRates);
  const computed = computeValuation(inputs);
  const scenarios = computeScenarios(computed, inputs);
  const { computed: fxComputed, scenarios: fxScenarios } = applyReportingFxLayer(
    computed,
    scenarios,
    syncedState.profile.currency,
    fxRates,
  );

  return mapEngineResultToValuationData(
    syncedState,
    inputs,
    fxComputed,
    fxScenarios,
    fxRates,
    locale,
    reportId,
    computed,
  );
}
