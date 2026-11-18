/**
 * Credit chapter of the report (round 4, part C). Off unless CREDIT_CHAPTER=on.
 *
 * Builds the page data from the engine result and the wizard answers, in whole units of the report
 * currency, with the display rounding done once here so that every amount on the page adds up
 * exactly. checkCreditChapterConsistency blocks the page (and the summary line) when it does not.
 *
 * Terms used everywhere, once each: "כושר החזר", "יחס כיסוי", "שלב ראשון".
 */
import type { ValuationComputed, ValuationInputs } from '../valuation';
import { computeFCFF, parseCapexPct, resolveCapexIndustryKey } from '../valuation/capex_fcf';
import { CAPM_CORPORATE_TAX_RATE } from '../valuation/capm_wacc';
import { marginForTurnaroundYear } from '../valuation/scenario_matrix';
import { resolveSectorMethodologyConfig } from '../valuation/sector_methodology_resolver';
import type { EquifyWizardState } from '../wizard/map_equify_wizard';
import { BOI_POLICY_RATE, primeRatePct } from '../market-data/boi_policy_rate';
import { computeCreditCapacity, type CreditStatus } from './credit_capacity';
import { SBC_STANDARD_SOURCE, resolveSectorCreditTerms } from './sector_credit_table';

/** SBC website for the closing call to action (financing advice). Verify before turning the flag on. */
export const SBC_SITE_URL = process.env.SBC_SITE_URL?.trim() || 'https://sbc-il.co.il';

export interface CreditChapterYear {
  label: string;
  ebitda: number;
  tax: number;
  maintenanceCapex: number;
  cfads: number;
  capacity: number;
}

export interface CreditChapterData {
  status: CreditStatus;
  currency: string;
  explanationHe?: string;
  today: CreditChapterYear;
  peak: CreditChapterYear;
  termYears: number;
  ratePct: number;
  rateRangePct: [number, number];
  primeRatePct: number;
  boiRatePct: number;
  boiDate: string;
  ceilingPct: number;
  ceiling: number;
  firstStage: number;
  firstStageMonthly: number;
  firstStageAnnual: number;
  existingMonthly: number;
  existingAnnual: number;
  totalAnnual: number;
  /** Coverage on today's CFADS, two decimals; null with no debt service at all. */
  dscr: number | null;
  minDscr: number;
  binding: 'ceiling' | 'coverage' | 'none';
  grossDebt: number;
  cash: number;
  ownerLoans: number;
  netDebtWithOwnerLoans: number;
  netDebtWithoutOwnerLoans: number;
  blocker: { active: boolean; reasonHe?: string };
  liens: { has: boolean; holder?: string; type?: string };
  /** Short source line for the page. */
  sourcesHe: string;
  /** One line for the executive summary, same numbers as the chapter. */
  summaryLineHe: string;
}

const r0 = (x: number) => Math.round(x);
const r2 = (x: number) => Math.round(x * 100) / 100;

/** Whole amount with the currency sign, e.g. "195,083 ₪" (bidi marks removed). */
export function formatCreditAmount(v: number, currency: string): string {
  const code = currency === 'USD' || currency === 'EUR' ? currency : 'ILS';
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: code, maximumFractionDigits: 0 })
    .format(Math.round(v))
    .replace(/[\u200e\u200f]/g, '')
    .replace(/\u00a0/g, ' ');
}

const fmtAmountHe = formatCreditAmount;

/** Display year labels: the projection starts the year after the valuation year. */
function yearLabels(): { today: string; peak: string } {
  const y = new Date().getFullYear();
  return { today: String(y), peak: String(y + 3) };
}

export function buildCreditChapterData(params: {
  state: EquifyWizardState;
  inputs: ValuationInputs;
  /** Engine result in the report currency (after the FX layer). */
  computed: ValuationComputed;
  /** Report currency per ILS (1 for ILS). */
  fxMultiplier: number;
}): CreditChapterData | undefined {
  const { state, inputs, computed, fxMultiplier } = params;
  if (!state.credit) return undefined;
  const credit = state.credit;
  const currency = state.profile.currency ?? 'ILS';
  const industry = resolveCapexIndustryKey(inputs.sector, inputs.subSector);
  const capexPct = parseCapexPct(inputs.capexLevelPct ?? 0);
  const labels = yearLabels();

  // Today: normalized EBITDA (report currency), revenue of the current year.
  const revenueToday = (inputs.revenue2026K ?? inputs.rev ?? 0) * fxMultiplier * 1000;
  const ebitdaToday = (computed.normalizedEbitda?.normalizedEbitdaK ?? computed.ebitda) * 1000;
  // Peak: third forecast year on the engine's DCF growth path.
  const growth = computed.dcfDetail?.projection.growthByYear ?? [];
  const g3 = growth.slice(0, 3).reduce((p, g) => p * (1 + g), 1);
  const revenuePeak = revenueToday * g3;
  const regime = computed.profitabilityRegime;
  let ebitdaPeak = ebitdaToday * g3;
  if (regime && regime.turnaroundYears > 0 && (regime.regime === 'loss_making' || regime.regime === 'deep_loss')) {
    const sectorConfig = resolveSectorMethodologyConfig(inputs.sector, inputs.subSector);
    const n = computed.normalizedEbitda;
    const anchor =
      n?.isCurrentYearAnomalous && n.anomalyDirection === 'downside' && n.historicalAvgMarginPct != null
        ? (n.historicalAvgMarginPct / 100) * 0.8
        : sectorConfig.maxHistoricalMargin;
    const currentMargin = revenueToday > 0 ? ((inputs.ebitda2026K ?? computed.ebitda) * fxMultiplier * 1000) / revenueToday : 0;
    ebitdaPeak = revenuePeak * marginForTurnaroundYear(3, currentMargin, anchor, regime.turnaroundYears);
  }

  // Tax and maintenance CAPEX exactly as the engine's FCFF (23% on EBITDA less depreciation).
  const yearParts = (ebitda: number, revenue: number) => {
    const b = computeFCFF({ ebitda, revenue, capexPct, industry, growthRate: 0 }).breakdown;
    const e = r0(ebitda);
    const capex = r0(Math.max(0, b.capexAmount));
    const tax = r0(Math.max(0, b.ebit) * CAPM_CORPORATE_TAX_RATE);
    return { ebitda: e, tax, maintenanceCapex: capex, depreciation: r0(b.depreciation) };
  };
  const t = yearParts(ebitdaToday, revenueToday);
  const p = yearParts(ebitdaPeak, revenuePeak);

  const terms = resolveSectorCreditTerms(inputs.sector, inputs.subSector);
  const prime = primeRatePct();
  const k = (v: number) => r0((v || 0) * 1000);
  const res = computeCreditCapacity({
    today: { ebitda: t.ebitda, tax: t.tax, maintenanceCapex: t.maintenanceCapex, label: labels.today },
    peak: { ebitda: p.ebitda, tax: p.tax, maintenanceCapex: p.maintenanceCapex, label: labels.peak },
    taxRate: CAPM_CORPORATE_TAX_RATE,
    existingMonthlyDebtService: k(credit.monthlyDebtServiceK),
    ownerLoans: credit.ownerLoans.has ? k(credit.ownerLoans.amountK) : 0,
    grossDebt: k(state.financials.grossDebtK),
    cash: k(state.financials.cashK),
    liens: {
      has: credit.liens.has,
      holder: credit.liens.holder || undefined,
      type: credit.liens.type || undefined,
    },
    terms,
    primeRatePct: prime,
  });

  // Display rounding, once: monthly payment to whole units, annual = 12 x monthly.
  const firstStageMonthly = r0(res.firstStageMonthly);
  const firstStageAnnual = firstStageMonthly * 12;
  const existingMonthly = r0(res.existingMonthlyDebtService);
  const existingAnnual = existingMonthly * 12;
  const totalAnnual = existingAnnual + firstStageAnnual;
  const dscr = totalAnnual > 0 ? r2(res.today.cfads / totalAnnual) : null;
  const capacity = r0(res.capacity);
  const ceiling = r0(capacity * res.ceilingPct);

  const termsSource = Object.values(terms.sources).every((s) => s === SBC_STANDARD_SOURCE)
    ? 'תקן SBC לבקשות אשראי (18.10.2026)'
    : Object.values(terms.sources).some((s) => s === SBC_STANDARD_SOURCE)
      ? 'תקן SBC לבקשות אשראי (18.10.2026) והערכת SBC'
      : 'הערכת SBC';
  const sourcesHe = `מקורות: תנאי הענף לפי ${termsSource}. ריבית בנק ישראל ${BOI_POLICY_RATE.valuePct}% ליום ${BOI_POLICY_RATE.dataDate.split('-').reverse().join('.')} (בנק ישראל), והפריים גבוה ממנה ב 1.5 נקודות.`;

  const summaryLineHe =
    res.status === 'ok'
      ? `כושר האשראי: שלב ראשון מוצע של ${fmtAmountHe(res.firstStage, currency)} ל ${res.termYears} שנה, החזר שנתי של ${fmtAmountHe(firstStageAnnual, currency)}, ויחס כיסוי של ${dscr?.toFixed(2)} מול רף של ${res.minDscr.toFixed(2)} בענף.`
      : res.status === 'no_room'
        ? 'כושר האשראי: אין שלב ראשון מוצע, כי ההחזר על ההלוואות הקיימות כבר מגיע לרף יחס הכיסוי של הענף.'
        : 'כושר האשראי: אין כושר החזר לחישוב, כי התזרים לשירות חוב היום אינו חיובי.';

  return {
    status: res.status,
    currency,
    explanationHe: res.explanationHe,
    today: { label: labels.today, ebitda: t.ebitda, tax: t.tax, maintenanceCapex: t.maintenanceCapex, cfads: r0(res.today.cfads), capacity },
    peak: { label: labels.peak, ebitda: p.ebitda, tax: p.tax, maintenanceCapex: p.maintenanceCapex, cfads: r0(res.peak.cfads), capacity: r0(res.capacityPeak) },
    termYears: res.termYears,
    ratePct: res.ratePct,
    rateRangePct: res.rateRangePct,
    primeRatePct: prime,
    boiRatePct: BOI_POLICY_RATE.valuePct,
    boiDate: BOI_POLICY_RATE.dataDate,
    ceilingPct: res.ceilingPct,
    ceiling,
    firstStage: res.firstStage,
    firstStageMonthly,
    firstStageAnnual,
    existingMonthly,
    existingAnnual,
    totalAnnual,
    dscr,
    minDscr: res.minDscr,
    binding: res.binding,
    grossDebt: r0(Math.max(k(state.financials.grossDebtK), res.ownerLoans)),
    cash: k(state.financials.cashK),
    ownerLoans: r0(res.ownerLoans),
    netDebtWithOwnerLoans: r0(res.netDebtWithOwnerLoans),
    netDebtWithoutOwnerLoans: r0(res.netDebtWithoutOwnerLoans),
    blocker: res.blocker,
    liens: { has: credit.liens.has, holder: credit.liens.holder || undefined, type: credit.liens.type || undefined },
    sourcesHe,
    summaryLineHe,
  };
}

/**
 * The SBC standard's writing rules, checked in code: every amount on the page adds up exactly.
 * Returns the violations; an empty list means the page may be shown.
 */
export function checkCreditChapterConsistency(d: CreditChapterData): string[] {
  const v: string[] = [];
  for (const y of [d.today, d.peak]) {
    if (y.ebitda - y.tax - y.maintenanceCapex !== y.cfads) v.push(`CFADS ${y.label}: ${y.ebitda} - ${y.tax} - ${y.maintenanceCapex} != ${y.cfads}`);
  }
  if (d.firstStageAnnual !== d.firstStageMonthly * 12) v.push('annual != 12 x monthly (first stage)');
  if (d.existingAnnual !== d.existingMonthly * 12) v.push('annual != 12 x monthly (existing)');
  if (d.totalAnnual !== d.existingAnnual + d.firstStageAnnual) v.push('total annual != existing + first stage');
  if (d.ceiling !== Math.round(d.today.capacity * d.ceilingPct)) v.push('ceiling != capacity x ceiling share');
  if (d.firstStage > d.ceiling) v.push('first stage above the ceiling');
  if (d.netDebtWithOwnerLoans - d.netDebtWithoutOwnerLoans !== d.ownerLoans) v.push('net debt with and without owner loans differ by more than the owner loans');
  if (d.netDebtWithOwnerLoans !== d.grossDebt - d.cash) v.push('net debt != gross debt - cash');
  if (d.status === 'ok') {
    if (d.dscr == null || Math.abs(d.dscr - Math.round((d.today.cfads / d.totalAnnual) * 100) / 100) > 1e-9) v.push('coverage != CFADS / total annual');
    if (d.dscr != null && d.dscr < d.minDscr) v.push('coverage below the sector floor');
    if (d.firstStage <= 0) v.push('status ok without a first stage');
  } else if (!d.explanationHe) {
    v.push('no explanation for a chapter without numbers');
  }
  if (
    d.status === 'ok' &&
    !(d.summaryLineHe.includes(formatCreditAmount(d.firstStageAnnual, d.currency)) &&
      d.summaryLineHe.includes(formatCreditAmount(d.firstStage, d.currency)) &&
      d.dscr != null &&
      d.summaryLineHe.includes(d.dscr.toFixed(2)))
  )
    v.push('summary line does not match the chapter');
  return v;
}
