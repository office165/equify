import { waccV2SourceNoteHe } from '../valuation/method_v2';
import { dcfMarketabilityLinesHe, sizePremiumLineHe } from '../valuation/private_company_layer';
import { CAPM_CORPORATE_TAX_RATE } from '../valuation/capm_wacc';
import { formatNetDebtLine } from '../format/currency';
import {
  computeScenarios,
  computeValuation,
  type ValuationComputed,
  type ValuationInputs,
} from '../valuation';
import {
  STUB_PERIOD_DISCOUNT_EXPONENT,
  TERMINAL_TO_EXPLICIT_PV_MAX,
  computeDcfWithGrowthDecayDetailed,
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
  WaccTableRow,
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
import { getCachedFxRates, getIlsToReportingMultiplier, isFallbackFxSnapshot } from '../utils/fxService';
import {
  DAMODARAN_SOURCES,
  damodaranIndustryFor,
  damodaranMappingFor,
} from '../market-data/damodaran_2026';
import {
  buildEbitdaMultipleSensitivity,
  buildGrowthWaccSensitivity,
  type SensitivityContext,
} from './sensitivity';
import {
  formatCurrencyNarrativeHe,
  formatCurrencyShort,
  normalizeCurrencyCode,
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

function isoToHe(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}.${m}.${y}`;
}

/** Page 5 intro: what the industry multiples are and why the company multiple is lower. */
function damodaranIntroHe(industry: string): string {
  return `מכפילי הענף הם נתוני Damodaran לענף ${industry}, של חברות ציבוריות בעולם (Global) ובשווקים מתעוררים (Emerging Markets). מכפיל החברה נמוך מהם בדרך כלל, כי הוא כולל הנחת סחירות וגודל לחברה פרטית.`;
}

function damodaranFootnoteHe(industry: string): string {
  const s = DAMODARAN_SOURCES;
  return `מקור: Damodaran, ענף ${industry}, EV/EBITDA של חברות עם EBITDA חיובי ו EV/Sales, נתונים מ ${isoToHe(s.vebitdaGlobal.dataDate)} (${s.vebitdaGlobal.file}, ${s.vebitdaEmerging.file}, ${s.psGlobal.file}, ${s.psEmerging.file}), pages.stern.nyu.edu/~adamodar.`;
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
  const fmt = (k: number) => formatCurrencyShort(k * 1000, currency);
  const fmtBlendAmount = (k: number | null | undefined): string => {
    if (k == null || !Number.isFinite(k)) return locale === 'en' ? '—' : '—';
    return fmt(k);
  };
  const pctPast = Math.round(w.past * 100);
  const pctCur = Math.round(w.current * 100);
  const pctProj = Math.round(w.projected * 100);
  const growth = blend.dcfGrowthPct.toFixed(1);
  if (locale === 'en') {
    return `${pctPast}/${pctCur}/${pctProj} weighted · past ${fmtBlendAmount(blend.past)} · current ${fmt(blend.current)} · projected (+${growth}%) ${fmt(blend.projected)} · base ${fmt(blend.blended)}`;
  }
  return `שקלול ${pctPast}/${pctCur}/${pctProj} · עבר ${fmtBlendAmount(blend.past)} · נוכחי ${fmt(blend.current)} · תחזית (+${growth}%) ${fmt(blend.projected)} · בסיס ${fmt(blend.blended)}`;
}

function formatNetDebtNoteHe(
  netDebtK: number,
  grossDebtK: number,
  cashK: number,
  currency: string,
): string {
  const line = formatNetDebtLine(netDebtK, 'he', normalizeCurrencyCode(currency));
  const net = wizardFinancialAbsFromK(netDebtK);
  const gross = wizardFinancialAbsFromK(grossDebtK);
  const cash = wizardFinancialAbsFromK(cashK);
  return `${line.labelHe} ליום ההערכה: ${formatCurrencyNarrativeHe(Math.abs(net), currency)} (חוב ברוטו ${formatCurrencyNarrativeHe(gross, currency)} פחות מזומן ${formatCurrencyNarrativeHe(cash, currency)}).`;
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

const WACC_COLORS = {
  rf: '#4DD6CE',
  erp: '#00A89F',
  crp: '#C9A84C',
  size: '#163530',
  spec: '#7FB8B4',
  loss: '#B85C5C',
  debt: '#A8842E',
  bound: '#D9DEDD',
} as const;

/**
 * Page 4 WACC (round 2, finding 2): one set of numbers for the table and the donut.
 * Table: Rf, beta x ERP, size, specific, Ke, Kd before and after tax, E/V, D/V, WACC.
 * Donut: each Ke component weighted by E/V and Kd after tax by D/V, so it sums to the WACC.
 * Display only: the engine WACC is not recomputed here.
 */
function buildWaccDisplay(
  waccPct: number,
  breakdown: ValuationComputed['waccBreakdown'],
  qs: number,
  topCustomerPct: number,
  locale: 'he' | 'en' = 'he',
): { segments: WaccSegment[]; table: WaccTableRow[]; note: string } {
  const en = locale === 'en';
  const ev = breakdown.equityWeight ?? 1;
  const dv = breakdown.debtWeight ?? 0;
  const kdPre = breakdown.kdPreTax ?? breakdown.kd / (1 - (breakdown.taxRate ?? 0.23));
  const tax = breakdown.taxRate ?? 0.23;
  const crp = breakdown.crp ?? 0;
  const marketRisk = breakdown.leveredBeta * breakdown.erp;
  const keParts: Array<{ key: keyof typeof WACC_COLORS; label: string; pct: number; source: string }> = [
    { key: 'rf', label: en ? 'Risk-free rate (Rf)' : 'ריבית חסרת סיכון (Rf)', pct: breakdown.rf, source: 'Rf' },
    {
      key: 'erp',
      label: en
        ? `Levered beta ${breakdown.leveredBeta.toFixed(2)} times ERP ${breakdown.erp.toFixed(1)}%`
        : `בטא ממונפת ${breakdown.leveredBeta.toFixed(2)} כפול ERP של ${breakdown.erp.toFixed(1)}%`,
      pct: marketRisk,
      source: 'ERP',
    },
    ...(crp > 0
      ? [{ key: 'crp' as const, label: en ? 'Country risk premium (Israel)' : 'פרמיית סיכון מדינה (ישראל)', pct: crp, source: 'CRP' }]
      : []),
    { key: 'size', label: en ? 'Size premium' : 'פרמיית גודל', pct: breakdown.alpha, source: 'Size' },
    { key: 'spec', label: en ? 'Company-specific premium' : 'פרמיה ספציפית', pct: breakdown.specificRiskPremium, source: `Quality Score ${qs}` },
    ...(breakdown.profitabilityLossPremium > 0
      ? [{ key: 'loss' as const, label: en ? 'Loss-making premium' : 'פרמיית הפסדיות', pct: breakdown.profitabilityLossPremium, source: 'Distress' }]
      : []),
  ];
  const subRows = buildSpecificRiskSubRows(breakdown, topCustomerPct, locale);

  const table: WaccTableRow[] = [];
  for (const p of keParts) {
    table.push({ label: p.label, pct: p.pct, kind: 'component', color: WACC_COLORS[p.key] });
    if (p.key === 'spec') {
      for (const sub of subRows) table.push({ label: sub.label, pct: sub.pct, kind: 'sub' });
    }
  }
  table.push({ label: en ? 'Cost of equity (Ke)' : 'עלות הון עצמי (Ke)', pct: breakdown.ke, kind: 'subtotal' });
  table.push({ label: en ? 'Cost of debt before tax (Kd)' : 'עלות חוב לפני מס (Kd)', pct: kdPre, kind: 'component' });
  table.push({
    label: en ? `Cost of debt after tax (${Math.round(tax * 100)}%)` : `עלות חוב אחרי מס (${Math.round(tax * 100)}%)`,
    pct: breakdown.kd,
    kind: 'component',
    color: WACC_COLORS.debt,
  });
  table.push({ label: en ? 'Equity weight (E/V)' : 'משקל הון עצמי (E/V)', pct: ev * 100, kind: 'weight' });
  table.push({ label: en ? 'Debt weight (D/V)' : 'משקל חוב (D/V)', pct: dv * 100, kind: 'weight' });

  const segments: WaccSegment[] = keParts.map((p) => ({
    label: p.label,
    symbol: p.source,
    pct: p.pct * ev,
    color: WACC_COLORS[p.key],
    source: p.source,
  }));
  if (dv > 0) {
    segments.push({
      label: en ? 'Cost of debt after tax' : 'עלות חוב אחרי מס',
      symbol: 'Kd',
      pct: breakdown.kd * dv,
      color: WACC_COLORS.debt,
    });
  }
  const raw = segments.reduce((sum, x) => sum + x.pct, 0);
  const boundAdj = waccPct - raw;
  if (Math.abs(boundAdj) > 0.005) {
    segments.push({
      label: en ? 'WACC bound adjustment (6% to 22%)' : 'התאמה לגבולות WACC (6% עד 22%)',
      symbol: 'Bound',
      pct: boundAdj,
      color: WACC_COLORS.bound,
    });
    table.push({
      label: en ? 'Bound adjustment (6% to 22%)' : 'התאמה לגבולות (6% עד 22%)',
      pct: boundAdj,
      kind: 'component',
      color: WACC_COLORS.bound,
    });
  }

  const note = en
    ? 'WACC = Ke x E/V + Kd after tax x D/V. In the chart each component is weighted by its share of capital.'
    : 'ה WACC הוא Ke כפול E/V, ועוד Kd אחרי מס כפול D/V. בגרף כל רכיב משוקלל לפי חלקו בהון.';
  return { segments, table, note };
}

function scaleDcfDetail(d: NonNullable<ValuationComputed['dcfDetail']>, m: number): NonNullable<ValuationComputed['dcfDetail']> {
  if (m === 1) return d;
  const p = d.projection;
  return {
    evK: d.evK * m,
    guardFactor: d.guardFactor,
    fromZeroCapexBase: d.fromZeroCapexBase,
    projection: {
      ...p,
      fcffByYearK: p.fcffByYearK.map((v) => v * m),
      explicitPvK: p.explicitPvK * m,
      terminalPvK: p.terminalPvK * m,
      totalEvK: p.totalEvK * m,
      terminal: p.terminal
        ? {
            ...p.terminal,
            revenueK: p.terminal.revenueK * m,
            ebitdaK: p.terminal.ebitdaK * m,
            depreciationK: p.terminal.depreciationK * m,
            nopatK: p.terminal.nopatK * m,
            deltaWcK: p.terminal.deltaWcK * m,
            fcffK: p.terminal.fcffK * m,
            tvK: p.terminal.tvK * m,
          }
        : undefined,
    },
  };
}

function buildDcfRows(
  inputs: ValuationInputs,
  computed: ValuationComputed,
  /** ILS K to reporting-currency K (methodology 2 builds the table from the engine projection). */
  fxMultiplier = 1,
): {
  rows: DcfYearRow[];
  terminalPvM: number;
  terminalSharePct: number;
  note: string;
  terminalFcffM?: number;
  terminalDiscountRatePct?: number;
} {
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
  const v2 = computed.methodVersion === 'v2' ? computed.v2?.components : undefined;
  // Finding 28: the table is the projection the engine valued (scaled to the reporting currency),
  // so it always adds up to the DCF leg. The recomputation below is only a fallback for results
  // without dcfDetail (older stored results).
  const engineDcf = computed.dcfDetail ? scaleDcfDetail(computed.dcfDetail, fxMultiplier) : undefined;
  const { projection, guardFactor, fromZeroCapexBase } = engineDcf ?? computeDcfWithGrowthDecayDetailed({
    ebitdaK: computed.ebitda,
    revK,
    capexLevelPct,
    dcfGrowthPct: headlineGrowthPct,
    wacc: computed.wacc,
    industry: resolveCapexIndustryKey(inputs.sector, inputs.subSector),
    turnaround,
    ...(v2 ? { terminalMethod: v2.t1 ? ('v2-gordon' as const) : ('v1-capped' as const), capexGuard: !v2.noCapexGuard } : {}),
  });
  const rows: DcfYearRow[] = [];
  const baseYear = new Date().getFullYear() + 1;

  for (let i = 0; i < projection.fcffByYearK.length; i += 1) {
    const yearIndex = i + 1;
    // FCFF after the CAPEX monotonicity guard (finding 16): rows sum to the DCF leg exactly.
    const fcffK = projection.fcffByYearK[i] * guardFactor;
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

  const terminalPvM = (projection.terminalPvK * guardFactor) / 1000;
  const terminalSharePct = projection.terminalShare * 100;
  // Methodology 1 behavior, stated explicitly (round 2, item 8). Removed when METHOD_V2 is on.
  const notes: string[] = [];
  const terminal = projection.terminal;
  if (v2?.t1 && terminal) {
    notes.push(
      `ערך טרמינלי לפי Gordon בלי תקרה, על שנה מנורמלת (CAPEX כפחת, מס ${Math.round(CAPM_CORPORATE_TAX_RATE * 100)}%, g ${(terminal.growthRate * 100).toFixed(1)}%).`,
    );
    const x = computed.v2?.exitCrossCheck;
    if (x && x.gordonImpliedMultiple != null) {
      notes.push(
        `בדיקה צולבת: מכפיל ${x.gordonImpliedMultiple.toFixed(1)} על EBITDA טרמינלי, מול ${x.multiple.toFixed(1)} למכפיל יציאה בענף (Damodaran, אחרי סחירות). לא נכנס לשווי.`,
      );
    }
  } else {
    notes.push(`הערך הטרמינלי מוגבל ל ${Math.round(TERMINAL_TO_EXPLICIT_PV_MAX * 100)}% מערך התקופה המפורשת.`);
  }
  if (fromZeroCapexBase) {
    notes.push(
      `ברמת ה CAPEX של החברה התזרים החופשי בתחזית הוא 0. שווי ה DCF נגזר מהתחזית בלי CAPEX, מוקטן ב ${Math.abs((guardFactor - 1) * 100).toFixed(1)}% לפי רמת ה CAPEX, והטבלה מציגה אותה.`,
    );
  } else if (Math.abs(guardFactor - 1) > 0.0005) {
    const pct = Math.abs((guardFactor - 1) * 100).toFixed(1);
    notes.push(
      guardFactor < 1
        ? `התזרימים כוללים הקטנה של ${pct}% לעקביות מול רמת ה CAPEX, כך שהטבלה מסתכמת לשווי ה DCF.`
        : `התזרימים כוללים הגדלה של ${pct}% לעקביות מול רמת ה CAPEX, כך שהטבלה מסתכמת לשווי ה DCF.`,
    );
  }
  return {
    rows,
    terminalPvM,
    terminalSharePct,
    note: notes.join(' '),
    terminalFcffM: terminal ? terminal.fcffK / 1000 : undefined,
    terminalDiscountRatePct: terminal ? terminal.discountRate * 100 : undefined,
  };
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

/**
 * Display weights in tenths of a percent that sum to exactly 100 (largest remainder).
 * Round 2, finding 19: 22.5% is shown as 22.5%, not 23%, and the shown weights add up.
 */
export function displayWeightsPct(weights: number[]): number[] {
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (total <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (Math.max(0, w) / total) * 1000);
  const floors = raw.map(Math.floor);
  let remaining = 1000 - floors.reduce((s, x) => s + x, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (remaining <= 0) break;
    if (weights[i] <= 0) continue;
    floors[i] += 1;
    remaining -= 1;
  }
  return floors.map((t) => t / 10);
}

function buildModelBlendRows(
  computed: ValuationComputed,
  inputs: ValuationInputs,
  locale: ValuationLocale,
): ModelBlendRow[] {
  const { blendWeights } = computed;
  const [dcfWeight, ebitdaWeight, revWeight] = displayWeightsPct([
    blendWeights.dcf,
    blendWeights.ebitda,
    blendWeights.rev,
  ]);
  const revMultDisplay =
    inputs.rev > 0 ? computed.revMult / inputs.rev : computed.effectiveMult * 0.25;
  const backlogAdjustmentK =
    computed.modelBlendContributions?.backlogAdjustment ?? computed.backlogEquityUpliftK ?? 0;
  // Contribution shown = leg EV x shown weight (finding 19). The validator checks the
  // engine sum separately with exact weights.
  const contributions = {
    dcf: (computed.dcf * dcfWeight) / 100,
    ebitda: (computed.ebtMult * ebitdaWeight) / 100,
    rev: (computed.revMult * revWeight) / 100,
    backlogAdjustment: backlogAdjustmentK,
  };
  const zeroLegNote =
    locale === 'en' ? 'Not relevant: negative EBITDA' : 'לא רלוונטית בגלל EBITDA שלילי';
  // Methodology 2: the weight of a zero EBITDA leg moved to the other legs (finding 22), and a
  // zero DCF leg (no free cash flow in any forecast year) says so.
  const isV2 = computed.methodVersion === 'v2';
  const movedNote =
    locale === 'en'
      ? 'Not relevant: negative EBITDA, its weight moved to the other methods'
      : 'לא רלוונטית בגלל EBITDA שלילי, והמשקל שלה הועבר לשיטות האחרות';
  const zeroDcfNote =
    locale === 'en' ? 'Zero: no free cash flow in the forecast' : 'אפס: אין תזרים חופשי בתחזית';

  const rows: ModelBlendRow[] = [
    {
      name: `DCF + WACC (${computed.wacc.toFixed(1)}%)`,
      ev: kToNis(computed.dcf),
      weightPct: dcfWeight,
      contribution: kToNis(contributions.dcf),
      ...(isV2 && blendWeights.dcf > 0 && computed.dcf === 0 ? { detail: zeroDcfNote } : {}),
    },
    {
      name:
        locale === 'en'
          ? `EBITDA multiple × ${computed.effectiveMult.toFixed(1)}`
          : `מכפיל EBITDA × ${computed.effectiveMult.toFixed(1)}`,
      ev: kToNis(computed.ebtMult),
      weightPct: ebitdaWeight,
      contribution: kToNis(contributions.ebitda),
      // Finding 22 (display only): a leg the engine zeroed still carries its weight in methodology 1.
      ...(blendWeights.ebitda > 0 && computed.ebtMult === 0 ? { detail: zeroLegNote } : {}),
      ...(isV2 && computed.v2?.weightsBeforeZeroLeg ? { detail: movedNote } : {}),
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
  const {
    rows: dcfRows,
    terminalPvM,
    terminalSharePct,
    note: dcfNote,
    terminalFcffM,
    terminalDiscountRatePct,
  } = buildDcfRows(
    inputs,
    fxComputed,
    getIlsToReportingMultiplier(syncedState.profile.currency ?? 'ILS', fxRates),
  );
  const isV2 = fxComputed.methodVersion === 'v2';
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
  const waccDisplay = buildWaccDisplay(
    fxComputed.wacc,
    fxComputed.waccBreakdown,
    fxComputed.qs,
    syncedState.risk.topCustomer,
    locale,
  );
  const waccSegments = waccDisplay.segments;
  // Page 5 (round 2, finding 7): Damodaran industry multiples with source, no market median
  // derived from the company. The company marker is the multiple the report uses.
  const damodaran = damodaranIndustryFor(syncedState.profile.sector, syncedState.profile.subSector);
  const damodaranMap = damodaranMappingFor(syncedState.profile.sector, syncedState.profile.subSector);
  const revenueLegUsed = fxComputed.blendWeights.rev > 0 && fxComputed.revMult > 0;
  const companyRevenueMultiple = revenueLegUsed
    ? revMultDisplay
    : inputs.rev > 0
      ? fxComputed.ev / (inputs.rev * getIlsToReportingMultiplier(reportingCurrency, fxRates))
      : 0;
  const industryMultiples: ValuationData['industryMultiples'] =
    damodaran && damodaranMap
      ? {
          industry: damodaranMap.industry,
          evEbitdaLow: Math.min(damodaran.global.evEbitda.value, damodaran.emerging.evEbitda.value),
          evEbitdaHigh: Math.max(damodaran.global.evEbitda.value, damodaran.emerging.evEbitda.value),
          evSalesLow: Math.min(damodaran.global.evSales.value, damodaran.emerging.evSales.value),
          evSalesHigh: Math.max(damodaran.global.evSales.value, damodaran.emerging.evSales.value),
          companyRevenueMultiple,
          revenueMultipleKind: revenueLegUsed ? 'leg' : 'implied',
          footnote: damodaranFootnoteHe(damodaranMap.industry),
        }
      : undefined;
  const track = (
    id: 'ebitda' | 'revenue',
    title: string,
    impliedEv: number,
    multiple: number,
    low: number,
    high: number,
  ) => ({
    id,
    title,
    impliedEv,
    multiple,
    rangeMin: Math.max(0, Math.min(multiple, low) * 0.85),
    rangeMax: Math.max(multiple, high) * 1.1,
    marketMin: low,
    marketMax: high,
    color: '#00A89F',
  });
  const pageFiveTracks = industryMultiples
    ? [
        track('ebitda', 'EV / EBITDA', kToNis(fxComputed.ebtMult), fxComputed.effectiveMult, industryMultiples.evEbitdaLow, industryMultiples.evEbitdaHigh),
        track(
          'revenue',
          'EV / Revenue',
          revenueLegUsed ? kToNis(fxComputed.revMult) : kToNis(fxComputed.ev),
          companyRevenueMultiple,
          industryMultiples.evSalesLow,
          industryMultiples.evSalesHigh,
        ),
      ]
    : [];
  const activeCurrency = resolveActiveCurrency(reportingCurrency, locale);
  const fxMultiplier = getIlsToReportingMultiplier(reportingCurrency, fxRates);
  const sensitivityCtx: SensitivityContext = {
    inputs,
    baseIls: ilsComputed ?? computeValuation(inputs, { silent: true }),
    reportedEquityAbs: kToNis(fxComputed.equity),
    fxMultiplier,
    multipleLegEbitdaAbs: financialCore.multipleLegEbitdaBaseAbs,
    currency: reportingCurrency,
  };
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
    fxSource: isFallbackFxSnapshot(fxRates) ? 'fallback' : fxRates.source,
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
    ebitdaPast:
      fxComputed.ebitdaBlend.past != null
        ? kToNis(fxComputed.ebitdaBlend.past)
        : undefined,
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
    waccTable: waccDisplay.table,
    waccNote:
      isV2 && fxComputed.v2?.waccInputs
        ? `${waccDisplay.note} ${waccV2SourceNoteHe(fxComputed.v2.waccInputs)}`
        : waccDisplay.note,
    dcfRows,
    dcfNote,
    ...(isV2
      ? {
          methodVersion: 'v2' as const,
          terminalFcffM,
          terminalDiscountRatePct,
          manualReview: fxComputed.v2?.manualReview,
          ...(fxComputed.v2?.dcfMarketability
            ? {
                dcfMarketableEv: kToNis(fxComputed.dcf) / fxComputed.v2.dcfMarketability.factor,
                dcfMarketabilityFactor: fxComputed.v2.dcfMarketability.factor,
              }
            : {}),
          privateLayerLines: [
            ...(fxComputed.v2?.dcfMarketability ? dcfMarketabilityLinesHe(fxComputed.v2.dcfMarketability.factor) : []),
            ...(fxComputed.v2?.sizePremium ? [sizePremiumLineHe(fxComputed.v2.sizePremium.pp, fxComputed.v2.sizePremium.basis)] : []),
          ],
        }
      : {}),
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
    multiplesPositions: pageFiveTracks,
    industryMultiples,

    sensitivityGrowthWacc: buildGrowthWaccSensitivity(sensitivityCtx, locale === 'en'),
    sensitivityEbitdaMult: buildEbitdaMultipleSensitivity(sensitivityCtx, locale === 'en'),

    netDebtNote: formatNetDebtNoteHe(
      netDebtK,
      financials.grossDebtK,
      financials.cashK,
      reportingCurrency,
    ),
    keyFindings: `Quality ${fxComputed.qsGrade} · WACC ${fxComputed.wacc.toFixed(1)}% · EBITDA מדווח 2026 ${formatCurrencyShort(financialCore.auditedEbitda2026Abs, reportingCurrency)} · בסיס מכפיל ${formatCurrencyShort(financialCore.multipleLegEbitdaBaseAbs, reportingCurrency)} ×${fxComputed.effectiveMult.toFixed(1)} · TV ${terminalSharePct.toFixed(0)}% מ-DCF.`,
    // Round 2: the note states the weights shown in the blend table (it used the regime's
    // pre-scale weights, e.g. 45/14/42 next to a table of 48.5/22.7/28.8).
    profitabilityMethodologyNote: fxComputed.profitabilityRegime
      ? buildProfitabilityMethodologyNoteHe(fxComputed.profitabilityRegime, (() => {
          const [d, e, r] = displayWeightsPct([
            fxComputed.blendWeights.dcf,
            fxComputed.blendWeights.ebitda,
            fxComputed.blendWeights.rev,
          ]);
          return { dcf: d / 100, ebitdaMultiple: e / 100, revenueMultiple: r / 100 };
        })())
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
    multiplesIntro: industryMultiples
      ? damodaranIntroHe(industryMultiples.industry)
      : getMultiplesIntroText(syncedState.profile.sector, locale),
    dcfEbitdaWeights: (() => {
      const w = BLENDED_EBITDA_WEIGHTS;
      if (fxComputed.ebitdaBlend.hasPastActual && fxComputed.ebitdaBlend.past != null) {
        return { past: w.past, current: w.current, projected: w.projected };
      }
      const sum = w.current + w.projected;
      return { past: 0, current: w.current / sum, projected: w.projected / sum };
    })(),
    multipleEbitdaWeights: fxComputed.normalizedEbitda
      ? {
          ...fxComputed.normalizedEbitda.weightsUsed,
          anomalous: fxComputed.normalizedEbitda.isCurrentYearAnomalous,
        }
      : undefined,
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
