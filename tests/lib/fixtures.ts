/**
 * Fictional wizard cases for the safety net. No real customer data.
 * All money values are in thousands (K) of the case currency.
 */
import type { EquifyWizardState } from '../../lib/wizard/map_equify_wizard';
import type {
  EquifyGoalKey,
  EquifyLifecycleKey,
  EquifySectorKey,
} from '../../lib/valuation';

export interface CaseSpec {
  id: string;
  group: string;
  sector: EquifySectorKey;
  subSector: string;
  lifecycle: EquifyLifecycleKey;
  /** [revenueK, ebitdaK] for 2024, 2025, 2026 */
  y: [[number, number], [number, number], [number, number]];
  growth: number;
  grossDebt: number;
  cash: number;
  owner: number;
  capex: number;
  backlog: number;
  recurring: number;
  top: number;
  founderDep: boolean;
  competition: boolean;
  ip: boolean;
  contracts: boolean;
  goal: EquifyGoalKey;
  currency?: 'ILS' | 'USD' | 'EUR';
  customMultiple?: number | null;
  isManualMultiple?: boolean;
  /** Expected equity in full currency units (anchors only). */
  expectedEquity?: number;
  expectedEv?: number;
  expectedWacc?: number;
  note?: string;
}

export function buildWizardState(spec: CaseSpec): EquifyWizardState {
  const [y24, y25, y26] = spec.y;
  const rev = y26[0];
  return {
    profile: {
      fullName: 'Test Case',
      userEmail: 'test@example.invalid',
      userMobilePhone: '0500000000',
      companyName: `Case ${spec.id}`,
      userNationalId: '',
      userCorporateTaxId: '',
      foundedYear: '2015',
      sector: spec.sector,
      subSector: spec.subSector,
      lifecycle: spec.lifecycle,
      customLogoDataUrl: '',
      qualitativeDescription: '',
      currency: spec.currency ?? 'ILS',
      fiscalYear: '2026',
    },
    financials: {
      y2024: { revenueK: y24[0], ebitdaK: y24[1] },
      y2025: { revenueK: y25[0], ebitdaK: y25[1] },
      y2026: { revenueK: y26[0], ebitdaK: y26[1] },
      rev,
      margin: rev > 0 ? (y26[1] / rev) * 100 : 0,
      growth: spec.growth,
      grossDebtK: spec.grossDebt,
      cashK: spec.cash,
      normalizedOwnerSalaryK: spec.owner,
      capexLevelPct: spec.capex,
      projectedEbitdaK: [0, 0, 0],
      backlogSignedK: spec.backlog,
      debt: spec.grossDebt - spec.cash,
      customMultiple: spec.customMultiple ?? null,
      isManualMultiple: spec.isManualMultiple ?? false,
    },
    risk: {
      recurring: spec.recurring,
      topCustomer: spec.top,
      founderDep: spec.founderDep,
      competition: spec.competition,
      ip: spec.ip,
      contracts: spec.contracts,
    },
    goal: spec.goal,
    agreedToTerms: true,
  };
}

const ANCHOR_COMMON = {
  group: 'anchor',
  owner: 0,
  backlog: 0,
} as const;

/** The 7 anchor cases from 16.11 (verbatim). */
export const ANCHOR_CASES: CaseSpec[] = [
  {
    ...ANCHOR_COMMON,
    id: 'anchor-1-restaurant',
    sector: 'food_service',
    subSector: 'restaurant',
    lifecycle: 'mature',
    y: [[3600, 520], [3850, 560], [4100, 615]],
    growth: 6, grossDebt: 800, cash: 200, owner: 250, capex: 4, backlog: 0,
    recurring: 35, top: 5, founderDep: true, competition: true, ip: false, contracts: false,
    goal: 'negotiation',
    expectedEquity: 1_158_290, expectedEv: 1_758_290, expectedWacc: 13.58,
  },
  {
    ...ANCHOR_COMMON,
    id: 'anchor-2-saas',
    sector: 'saas',
    subSector: 'b2b_saas',
    lifecycle: 'growth',
    y: [[6000, 600], [8400, 1260], [11500, 2300]],
    growth: 30, grossDebt: 0, cash: 3000, owner: 0, capex: 3, backlog: 0,
    recurring: 85, top: 12, founderDep: false, competition: true, ip: true, contracts: true,
    goal: 'fundraise',
    expectedEquity: 46_314_370,
  },
  {
    ...ANCHOR_COMMON,
    id: 'anchor-3-contractor',
    sector: 'real_estate',
    subSector: 'construction_contracting',
    lifecycle: 'mature',
    y: [[22000, 1800], [25000, 2100], [27000, 2400]],
    growth: 8, grossDebt: 6000, cash: 1500, owner: 400, capex: 5, backlog: 30000,
    recurring: 10, top: 30, founderDep: true, competition: true, ip: false, contracts: true,
    goal: 'bank',
    expectedEquity: 4_801_240,
  },
  {
    ...ANCHOR_COMMON,
    id: 'anchor-4-accounting',
    sector: 'services',
    subSector: 'accounting',
    lifecycle: 'mature',
    y: [[1800, 450], [1900, 480], [2000, 500]],
    growth: 4, grossDebt: 0, cash: 300, owner: 350, capex: 1, backlog: 0,
    recurring: 70, top: 8, founderDep: true, competition: false, ip: false, contracts: true,
    goal: 'partner',
    expectedEquity: 2_786_090,
  },
  {
    ...ANCHOR_COMMON,
    id: 'anchor-5-young-factory',
    sector: 'industry',
    subSector: 'manufacturing',
    lifecycle: 'early',
    y: [[9000, -300], [10500, -150], [12000, 200]],
    growth: 15, grossDebt: 3000, cash: 500, owner: 0, capex: 8, backlog: 0,
    recurring: 20, top: 25, founderDep: false, competition: true, ip: true, contracts: false,
    goal: 'internal',
    expectedEquity: 5_455_280,
  },
  {
    ...ANCHOR_COMMON,
    id: 'anchor-6-loss-factory',
    sector: 'industry',
    subSector: 'manufacturing',
    lifecycle: 'growth',
    y: [[5000, -400], [6000, -300], [7000, -200]],
    growth: 15, grossDebt: 1000, cash: 200, owner: 0, capex: 5, backlog: 0,
    recurring: 20, top: 25, founderDep: false, competition: true, ip: false, contracts: false,
    goal: 'internal',
    expectedEquity: 6_826_130,
  },
  {
    ...ANCHOR_COMMON,
    id: 'anchor-7-thin-factory',
    sector: 'industry',
    subSector: 'manufacturing',
    lifecycle: 'mature',
    y: [[9000, 300], [10500, 250], [12000, 200]],
    growth: 5, grossDebt: 3000, cash: 500, owner: 0, capex: 8, backlog: 0,
    recurring: 20, top: 25, founderDep: false, competition: true, ip: true, contracts: false,
    goal: 'internal',
    expectedEquity: 2_654_450,
  },
];
