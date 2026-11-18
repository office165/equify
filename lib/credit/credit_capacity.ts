/**
 * Credit capacity of the business (round 4, SBC credit standard). Pure function, no I/O.
 * Off in the product unless CREDIT_CHAPTER=on; the function itself has no flag.
 *
 * Amounts are in one currency unit (whole shekels in the report path). Terms:
 *   CFADS (cash flow available for debt service) = normalized EBITDA - tax - maintenance CAPEX.
 *     Today (last year) and at the peak (third forecast year, or the representative year).
 *     Tax = tax rate x max(0, EBITDA - depreciation); depreciation defaults to the maintenance CAPEX.
 *   Repayment capacity ("כושר החזר") = present value of today's annual CFADS over the loan term at
 *     the sector rate. Discounting is annual, as in the standard's example (510,000 a year, 24
 *     years, 4.5%: about 7,393,000). Loan payments are monthly (annuity), as in the same example.
 *   Ceiling = sector share of the repayment capacity.
 *   First stage ("שלב ראשון") = the largest amount (rounded down) for which coverage on today's
 *     CFADS, including the existing debt service, does not fall below the sector floor, and that
 *     does not pass the ceiling.
 *   Coverage ("יחס כיסוי") = annual CFADS / (existing annual service + first stage annual service).
 *   Net debt two ways: owner loans as debt, and without them (assuming a subordination letter).
 *   Blocker: a floating lien or a lien on all assets in favor of another bank.
 *   Rate range: prime + the sector spread range. A range, never a promise.
 */
import type { SectorCreditTerms } from './sector_credit_table';

export type LienHolder = 'bank' | 'non_bank' | 'other';
export type LienType = 'floating' | 'specific' | 'all_assets';

export interface CreditLiens {
  has: boolean;
  holder?: LienHolder;
  type?: LienType;
}

export interface CfadsYearInput {
  ebitda: number;
  maintenanceCapex: number;
  /** Tax base deduction; default: the maintenance CAPEX. */
  depreciation?: number;
  /** Explicit tax amount (overrides taxRate). */
  tax?: number;
  label?: string;
}

export interface CreditCapacityInput {
  /** Last year (normalized EBITDA from the engine). */
  today: CfadsYearInput;
  /** Third forecast year, or the representative year. Default: today. */
  peak?: CfadsYearInput;
  taxRate: number;
  /** What the business pays today on loans, per month. */
  existingMonthlyDebtService: number;
  /** Owner and related company loans (included in grossDebt). */
  ownerLoans: number;
  grossDebt: number;
  cash: number;
  liens: CreditLiens;
  terms: SectorCreditTerms;
  primeRatePct: number;
  /** Rate for capacity and the first stage (percent). Default: middle of the sector range. */
  annualRatePct?: number;
  /** Default: the sector term. */
  termYears?: number;
  /** The first stage is rounded down to this step. Default 10,000. */
  roundTo?: number;
}

export interface CfadsParts {
  ebitda: number;
  tax: number;
  maintenanceCapex: number;
  cfads: number;
  label?: string;
}

export type CreditStatus = 'ok' | 'no_capacity' | 'no_room';

export interface CreditCapacityResult {
  status: CreditStatus;
  /** Paragraph shown instead of numbers when status is not ok. */
  explanationHe?: string;
  today: CfadsParts;
  peak: CfadsParts;
  ratePct: number;
  rateRangePct: [number, number];
  primeRatePct: number;
  termYears: number;
  /** Repayment capacity on today's CFADS. */
  capacity: number;
  /** Repayment capacity on the peak CFADS (shown, not used for the first stage). */
  capacityPeak: number;
  ceilingPct: number;
  ceiling: number;
  minDscr: number;
  existingMonthlyDebtService: number;
  existingAnnualDebtService: number;
  firstStage: number;
  firstStageMonthly: number;
  firstStageAnnual: number;
  totalAnnualDebtService: number;
  /** null when there is no debt service at all. */
  dscr: number | null;
  /** What limits the first stage. */
  binding: 'ceiling' | 'coverage' | 'none';
  netDebtWithOwnerLoans: number;
  netDebtWithoutOwnerLoans: number;
  ownerLoans: number;
  blocker: { active: boolean; reasonHe?: string };
}

/** Monthly payment of an annuity loan. */
export function monthlyPayment(principal: number, annualRatePct: number, years: number): number {
  const n = Math.round(years * 12);
  if (principal <= 0 || n <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - (1 + r) ** -n);
}

/** Present value of a level annual flow (annual discounting, end of year). */
export function presentValueAnnual(annualFlow: number, annualRatePct: number, years: number): number {
  if (annualFlow <= 0 || years <= 0) return 0;
  const r = annualRatePct / 100;
  if (r === 0) return annualFlow * years;
  return (annualFlow * (1 - (1 + r) ** -years)) / r;
}

/** Principal whose monthly payment is the given amount. */
export function principalForMonthlyPayment(payment: number, annualRatePct: number, years: number): number {
  const n = Math.round(years * 12);
  if (payment <= 0 || n <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return payment * n;
  return (payment * (1 - (1 + r) ** -n)) / r;
}

function cfadsOf(y: CfadsYearInput, taxRate: number): CfadsParts {
  const ebitda = Number.isFinite(y.ebitda) ? y.ebitda : 0;
  const capex = Math.max(0, Number.isFinite(y.maintenanceCapex) ? y.maintenanceCapex : 0);
  const dep = Math.max(0, y.depreciation ?? capex);
  const tax = y.tax != null ? Math.max(0, y.tax) : Math.max(0, ebitda - dep) * Math.max(0, taxRate);
  return { ebitda, tax, maintenanceCapex: capex, cfads: ebitda - tax - capex, label: y.label };
}

const round2 = (x: number) => Math.round(x * 100) / 100;

export const NO_CAPACITY_EXPLANATION_HE =
  'התזרים לשירות חוב של העסק היום (EBITDA מנורמל פחות מס והשקעות שוטפות) אינו חיובי, ולכן אין כושר החזר לחישוב ואין שלב ראשון מוצע. מימון בשלב הזה ייבחן בעיקר לפי ביטחונות, הון עצמי ותוכנית עסקית, ואפשר לחזור לחישוב כשהתזרים יהיה חיובי.';

export const NO_ROOM_EXPLANATION_HE =
  'ההחזר החודשי על ההלוואות הקיימות כבר מנצל את התזרים לשירות חוב עד רף יחס הכיסוי של הענף, ולכן אין שלב ראשון מוצע בלי מחזור של החוב הקיים או גידול בתזרים.';

export function computeCreditCapacity(input: CreditCapacityInput): CreditCapacityResult {
  const { terms } = input;
  const termYears = input.termYears ?? terms.termYears;
  const rateRangePct: [number, number] = [
    round2(input.primeRatePct + terms.spreadOverPrimePp[0]),
    round2(input.primeRatePct + terms.spreadOverPrimePp[1]),
  ];
  const ratePct = input.annualRatePct ?? round2((rateRangePct[0] + rateRangePct[1]) / 2);
  const roundTo = input.roundTo ?? 10_000;

  const today = cfadsOf(input.today, input.taxRate);
  const peak = cfadsOf(input.peak ?? input.today, input.taxRate);

  const existingMonthly = Math.max(0, input.existingMonthlyDebtService || 0);
  const existingAnnual = existingMonthly * 12;

  const ownerLoans = Math.max(0, input.ownerLoans || 0);
  // Owner loans are part of the gross debt; if the gross debt entered is smaller, it did not include them.
  const grossDebt = Math.max(input.grossDebt || 0, ownerLoans);
  const cash = Math.max(0, input.cash || 0);
  const netDebtWithOwnerLoans = grossDebt - cash;
  const netDebtWithoutOwnerLoans = grossDebt - ownerLoans - cash;

  const blockerActive =
    input.liens.has &&
    input.liens.holder === 'bank' &&
    (input.liens.type === 'floating' || input.liens.type === 'all_assets');
  const blocker = blockerActive
    ? { active: true, reasonHe: 'נדרש אישור הבנק הקיים לפני כל מימון חדש.' }
    : { active: false };

  const capacity = today.cfads > 0 ? presentValueAnnual(today.cfads, ratePct, termYears) : 0;
  const capacityPeak = peak.cfads > 0 ? presentValueAnnual(peak.cfads, ratePct, termYears) : 0;
  const ceiling = capacity * terms.ceilingPctOfCapacity;

  const base = {
    today,
    peak,
    ratePct,
    rateRangePct,
    primeRatePct: input.primeRatePct,
    termYears,
    capacity,
    capacityPeak,
    ceilingPct: terms.ceilingPctOfCapacity,
    ceiling,
    minDscr: terms.minDscr,
    existingMonthlyDebtService: existingMonthly,
    existingAnnualDebtService: existingAnnual,
    netDebtWithOwnerLoans,
    netDebtWithoutOwnerLoans,
    ownerLoans,
    blocker,
  };

  if (!(today.cfads > 0)) {
    return {
      ...base,
      status: 'no_capacity',
      explanationHe: NO_CAPACITY_EXPLANATION_HE,
      firstStage: 0,
      firstStageMonthly: 0,
      firstStageAnnual: 0,
      totalAnnualDebtService: existingAnnual,
      dscr: existingAnnual > 0 ? today.cfads / existingAnnual : null,
      binding: 'none',
    };
  }

  // Coverage limit: annual service room = CFADS / floor - existing annual service.
  const roomAnnual = today.cfads / terms.minDscr - existingAnnual;
  const byCoverage = roomAnnual > 0 ? principalForMonthlyPayment(roomAnnual / 12, ratePct, termYears) : 0;
  const raw = Math.min(byCoverage, ceiling);
  const firstStage = Math.max(0, Math.floor(raw / roundTo) * roundTo);
  const binding: CreditCapacityResult['binding'] = byCoverage <= 0 ? 'coverage' : byCoverage < ceiling ? 'coverage' : 'ceiling';

  const firstStageMonthly = monthlyPayment(firstStage, ratePct, termYears);
  const firstStageAnnual = firstStageMonthly * 12;
  const totalAnnualDebtService = existingAnnual + firstStageAnnual;
  const dscr = totalAnnualDebtService > 0 ? today.cfads / totalAnnualDebtService : null;

  return {
    ...base,
    status: firstStage > 0 ? 'ok' : 'no_room',
    ...(firstStage > 0 ? {} : { explanationHe: NO_ROOM_EXPLANATION_HE }),
    firstStage,
    firstStageMonthly,
    firstStageAnnual,
    totalAnnualDebtService,
    dscr,
    binding,
  };
}
