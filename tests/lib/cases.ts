/**
 * Case catalogue for the safety net. Every case is fictional and deterministic.
 * Groups:
 *   anchor      7 anchor cases from 16.11 (verbatim)
 *   subsector   one case per sub-sector (50), sizes spread SMB to enterprise
 *   edge        10 edge cases
 *   ladder      size ladder (services, industry, saas) incl. tier boundaries
 *   lifecycle   50 sub-sectors x 4 lifecycle stages (200)
 *   goal        13 sectors x 5 goals (65)
 *   golden      14 golden cases for the correctness suite
 */
import type {
  EquifyGoalKey,
  EquifyLifecycleKey,
  EquifySectorKey,
} from '../../lib/valuation';
import { ANCHOR_CASES, type CaseSpec } from './fixtures';
import { GOLDEN_CASES } from './golden';

export { ANCHOR_CASES, type CaseSpec } from './fixtures';

/** Sector archetype: typical margin, growth, capex, risk profile. */
interface Archetype {
  margin: number;
  growth: number;
  capex: number;
  recurring: number;
  top: number;
  ip: boolean;
  contracts: boolean;
  lifecycle: EquifyLifecycleKey;
}

const ARCHETYPES: Record<EquifySectorKey, Archetype> = {
  hospitality: { margin: 22, growth: 6, capex: 6, recurring: 30, top: 5, ip: false, contracts: false, lifecycle: 'mature' },
  saas: { margin: 18, growth: 25, capex: 3, recurring: 85, top: 10, ip: true, contracts: true, lifecycle: 'growth' },
  fintech: { margin: 20, growth: 18, capex: 3, recurring: 70, top: 12, ip: true, contracts: true, lifecycle: 'growth' },
  cyber: { margin: 16, growth: 22, capex: 3, recurring: 80, top: 15, ip: true, contracts: true, lifecycle: 'growth' },
  health: { margin: 15, growth: 12, capex: 4, recurring: 50, top: 15, ip: true, contracts: true, lifecycle: 'growth' },
  services: { margin: 15, growth: 6, capex: 1, recurring: 60, top: 12, ip: false, contracts: true, lifecycle: 'mature' },
  industry: { margin: 12, growth: 5, capex: 7, recurring: 30, top: 20, ip: false, contracts: true, lifecycle: 'mature' },
  retail_unified: { margin: 8, growth: 5, capex: 3, recurring: 20, top: 3, ip: false, contracts: false, lifecycle: 'mature' },
  food_service: { margin: 14, growth: 6, capex: 4, recurring: 35, top: 5, ip: false, contracts: false, lifecycle: 'mature' },
  energy: { margin: 35, growth: 10, capex: 10, recurring: 80, top: 30, ip: false, contracts: true, lifecycle: 'growth' },
  defense_aerospace: { margin: 14, growth: 9, capex: 6, recurring: 40, top: 35, ip: true, contracts: true, lifecycle: 'mature' },
  real_estate: { margin: 18, growth: 6, capex: 5, recurring: 40, top: 20, ip: false, contracts: true, lifecycle: 'mature' },
  other: { margin: 12, growth: 6, capex: 3, recurring: 40, top: 15, ip: false, contracts: false, lifecycle: 'mature' },
};

export const SUBSECTORS: Array<{ sector: EquifySectorKey; subSector: string }> = [
  ...['boutique_hotel', 'hotel_chain', 'vacation', 'airbnb_mgmt'].map((s) => ({ sector: 'hospitality' as const, subSector: s })),
  ...['b2b_saas', 'b2c_saas', 'devtools', 'marketplace'].map((s) => ({ sector: 'saas' as const, subSector: s })),
  ...['payments', 'lending', 'insurtech', 'wealth'].map((s) => ({ sector: 'fintech' as const, subSector: s })),
  ...['enterprise', 'cloud', 'ot', 'services_cyber'].map((s) => ({ sector: 'cyber' as const, subSector: s })),
  ...['medtech', 'biotech', 'digital_health', 'services_health'].map((s) => ({ sector: 'health' as const, subSector: s })),
  ...['consulting', 'legal', 'accounting', 'marketing'].map((s) => ({ sector: 'services' as const, subSector: s })),
  ...['manufacturing', 'distribution', 'food_bev', 'traditional'].map((s) => ({ sector: 'industry' as const, subSector: s })),
  ...['retail-supermarkets', 'd2c', 'retail-fashion', 'marketplace', 'specialty'].map((s) => ({ sector: 'retail_unified' as const, subSector: s })),
  ...['restaurant', 'cafe', 'catering', 'franchise', 'delivery'].map((s) => ({ sector: 'food_service' as const, subSector: s })),
  ...['solar', 'storage', 'wind', 'services_energy'].map((s) => ({ sector: 'energy' as const, subSector: s })),
  ...['defense_manufacturing', 'aviation_space', 'defense_tech'].map((s) => ({ sector: 'defense_aerospace' as const, subSector: s })),
  ...['re_development', 're_income', 'construction_contracting', 'proptech'].map((s) => ({ sector: 'real_estate' as const, subSector: s })),
  { sector: 'other', subSector: 'general' },
];

/**
 * Revenue (₪K) per sub-sector index. Distribution: 10 small (0.3M to 5M),
 * 5 large (0.6B to 5B), 35 core (6M to 300M).
 */
const SMALL_REVENUE_K: Record<string, number> = {
  airbnb_mgmt: 900, marketing: 2_500, cafe: 600, catering: 1_800, delivery: 3_200,
  'retail-fashion': 4_000, services_cyber: 3_500, digital_health: 2_200, legal: 1_500, specialty: 800,
};
const LARGE_REVENUE_K: Record<string, number> = {
  hotel_chain: 650_000, payments: 1_200_000, manufacturing: 2_500_000,
  'retail-supermarkets': 5_000_000, defense_manufacturing: 1_800_000,
};
const CORE_REVENUE_STEPS_K = [
  6_000, 9_000, 12_000, 16_000, 22_000, 30_000, 40_000, 55_000, 75_000,
  100_000, 140_000, 190_000, 250_000, 300_000,
];

function revenueForSubSector(subSector: string, index: number): number {
  if (SMALL_REVENUE_K[subSector] != null) return SMALL_REVENUE_K[subSector];
  if (LARGE_REVENUE_K[subSector] != null) return LARGE_REVENUE_K[subSector];
  return CORE_REVENUE_STEPS_K[(index * 5) % CORE_REVENUE_STEPS_K.length];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Build three years of history backwards from 2026 using growth and a stable margin. */
function history(rev2026K: number, marginPct: number, growthPct: number): CaseSpec['y'] {
  const g = 1 + growthPct / 100;
  const r26 = rev2026K;
  const r25 = r26 / g;
  const r24 = r25 / g;
  const m = marginPct / 100;
  return [
    [round1(r24), round1(r24 * (m - 0.01))],
    [round1(r25), round1(r25 * (m - 0.005))],
    [round1(r26), round1(r26 * m)],
  ];
}

const GOALS: EquifyGoalKey[] = ['negotiation', 'fundraise', 'partner', 'bank', 'internal'];

function subsectorCase(i: number, overrides: Partial<CaseSpec> = {}): CaseSpec {
  const { sector, subSector } = SUBSECTORS[i];
  const a = ARCHETYPES[sector];
  const revK = revenueForSubSector(subSector, i);
  const small = revK < 5_000;
  return {
    id: `sub-${sector}-${subSector}`,
    group: 'subsector',
    sector,
    subSector,
    lifecycle: a.lifecycle,
    y: history(revK, a.margin, a.growth),
    growth: a.growth,
    grossDebt: round1(revK * 0.15),
    cash: round1(revK * 0.06),
    owner: small ? Math.min(400, round1(revK * 0.08)) : 0,
    capex: a.capex,
    backlog: 0,
    recurring: a.recurring,
    top: a.top,
    founderDep: small,
    competition: true,
    ip: a.ip,
    contracts: a.contracts,
    goal: GOALS[i % GOALS.length],
    ...overrides,
  };
}

export function buildSubsectorCases(): CaseSpec[] {
  return SUBSECTORS.map((_, i) => subsectorCase(i));
}

export function buildEdgeCases(): CaseSpec[] {
  const base = (id: string, o: Partial<CaseSpec>): CaseSpec => ({
    ...subsectorCase(SUBSECTORS.findIndex((s) => s.subSector === 'consulting')),
    id: `edge-${id}`,
    group: 'edge',
    ...o,
  });
  return [
    base('loss-all-years', {
      sector: 'industry', subSector: 'distribution', lifecycle: 'growth',
      y: [[15000, -900], [17000, -700], [19000, -500]], growth: 12, grossDebt: 2500, cash: 600,
      owner: 0, capex: 5, note: 'הפסד בכל השנים',
    }),
    base('thin-margin', {
      sector: 'retail_unified', subSector: 'd2c', lifecycle: 'mature',
      y: [[30000, 450], [32000, 420], [34000, 400]], growth: 4, grossDebt: 4000, cash: 1000,
      owner: 0, capex: 3, note: 'רווח דק',
    }),
    base('neg-to-pos', {
      sector: 'saas', subSector: 'devtools', lifecycle: 'early',
      y: [[8000, -1200], [11000, -200], [15000, 900]], growth: 30, grossDebt: 0, cash: 5000,
      owner: 0, capex: 3, note: 'EBITDA שלילי שעובר לחיובי',
    }),
    base('big-backlog', {
      sector: 'defense_aerospace', subSector: 'defense_tech', lifecycle: 'growth',
      y: [[40000, 5200], [46000, 6100], [52000, 7300]], growth: 12, grossDebt: 8000, cash: 3000,
      owner: 0, capex: 6, backlog: 90000, note: 'צבר חתום גדול',
    }),
    base('net-cash', {
      sector: 'cyber', subSector: 'cloud', lifecycle: 'growth',
      y: [[20000, 2400], [25000, 3500], [31000, 5000]], growth: 22, grossDebt: 0, cash: 25000,
      owner: 0, capex: 3, note: 'חוב נטו שלילי (מזומן גבוה)',
    }),
    base('debt-over-ev', {
      sector: 'hospitality', subSector: 'boutique_hotel', lifecycle: 'mature',
      y: [[12000, 1500], [12500, 1550], [13000, 1600]], growth: 3, grossDebt: 30000, cash: 500,
      owner: 0, capex: 6, note: 'חוב גבוה מה EV',
    }),
    base('usd', {
      sector: 'saas', subSector: 'b2b_saas', lifecycle: 'growth', currency: 'USD',
      y: [[4000, 400], [5200, 780], [6800, 1360]], growth: 28, grossDebt: 0, cash: 2000,
      owner: 0, capex: 3, note: 'מטבע USD (סכומים באלפי דולר)',
    }),
    base('eur', {
      sector: 'industry', subSector: 'food_bev', lifecycle: 'mature', currency: 'EUR',
      y: [[9000, 1000], [9500, 1080], [10000, 1150]], growth: 5, grossDebt: 2000, cash: 400,
      owner: 0, capex: 6, note: 'מטבע EUR (סכומים באלפי יורו)',
    }),
    base('manual-multiple', {
      sector: 'services', subSector: 'consulting', lifecycle: 'mature',
      y: [[18000, 2500], [19000, 2700], [20000, 3000]], growth: 6, grossDebt: 1000, cash: 800,
      owner: 0, capex: 1, customMultiple: 9, isManualMultiple: true, note: 'מכפיל ידני 9',
    }),
    base('no-owner-no-history', {
      sector: 'other', subSector: 'general', lifecycle: 'early',
      y: [[0, 0], [0, 0], [7000, 800]], growth: 10, grossDebt: 500, cash: 200,
      owner: 0, capex: 3, founderDep: true, note: 'בלי שכר בעלים ובלי שנים קודמות',
    }),
  ];
}

/** Size ladder: same company profile at increasing revenue, plus tier-boundary pairs. */
export const LADDER_REVENUES_K = [300, 2_000, 10_000, 50_000, 200_000, 1_000_000, 5_000_000];
export const LADDER_BOUNDARY_REVENUES_K = [4_950, 5_050, 19_800, 20_200, 118_800, 121_200];

export const LADDER_PROFILES: Array<{
  key: string;
  sector: EquifySectorKey;
  subSector: string;
  capex: number;
  recurring: number;
}> = [
  { key: 'services', sector: 'services', subSector: 'consulting', capex: 1, recurring: 60 },
  { key: 'industry', sector: 'industry', subSector: 'manufacturing', capex: 7, recurring: 30 },
  { key: 'saas', sector: 'saas', subSector: 'b2b_saas', capex: 3, recurring: 85 },
];

export function ladderCase(profileKey: string, revK: number): CaseSpec {
  const p = LADDER_PROFILES.find((x) => x.key === profileKey)!;
  return {
    id: `ladder-${p.key}-${revK}`,
    group: 'ladder',
    sector: p.sector,
    subSector: p.subSector,
    lifecycle: 'mature',
    y: history(revK, 15, 6),
    growth: 6,
    grossDebt: round1(revK * 0.1),
    cash: round1(revK * 0.05),
    owner: 0,
    capex: p.capex,
    backlog: 0,
    recurring: p.recurring,
    top: 15,
    founderDep: false,
    competition: true,
    ip: false,
    contracts: true,
    goal: 'internal',
  };
}

export function buildLadderCases(): CaseSpec[] {
  const out: CaseSpec[] = [];
  for (const p of LADDER_PROFILES) {
    for (const r of [...LADDER_REVENUES_K, ...LADDER_BOUNDARY_REVENUES_K].sort((a, b) => a - b)) {
      out.push(ladderCase(p.key, r));
    }
  }
  return out;
}

export const LIFECYCLES: EquifyLifecycleKey[] = ['seed', 'early', 'growth', 'mature'];

export function buildLifecycleCases(): CaseSpec[] {
  const out: CaseSpec[] = [];
  SUBSECTORS.forEach((s, i) => {
    for (const lc of LIFECYCLES) {
      out.push(
        subsectorCase(i, {
          id: `lc-${s.sector}-${s.subSector}-${lc}`,
          group: 'lifecycle',
          lifecycle: lc,
        }),
      );
    }
  });
  return out;
}

export function buildGoalCases(): CaseSpec[] {
  const out: CaseSpec[] = [];
  const seen = new Set<string>();
  SUBSECTORS.forEach((s, i) => {
    if (seen.has(s.sector)) return;
    seen.add(s.sector);
    for (const g of GOALS) {
      out.push(
        subsectorCase(i, {
          id: `goal-${s.sector}-${g}`,
          group: 'goal',
          goal: g,
        }),
      );
    }
  });
  return out;
}

export function buildAllCases(): CaseSpec[] {
  return [
    ...ANCHOR_CASES,
    ...buildSubsectorCases(),
    ...buildEdgeCases(),
    ...buildLadderCases(),
    ...buildLifecycleCases(),
    ...buildGoalCases(),
    ...GOLDEN_CASES,
  ];
}
