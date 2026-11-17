/**
 * Golden cases: one representative sub-sector per sector (13), mostly in the core band
 * (equity 5M to 200M ₪), plus one large industrial company (revenue about 1B ₪).
 */
import type { CaseSpec } from './fixtures';

const base = {
  group: 'golden',
  owner: 0,
  backlog: 0,
  competition: true,
  founderDep: false,
} as const;

function hist(rev26: number, margin: number, g: number): CaseSpec['y'] {
  const r25 = Math.round(rev26 / (1 + g / 100));
  const r24 = Math.round(r25 / (1 + g / 100));
  const m = margin / 100;
  return [
    [r24, Math.round(r24 * (m - 0.01))],
    [r25, Math.round(r25 * (m - 0.005))],
    [rev26, Math.round(rev26 * m)],
  ];
}

export const GOLDEN_CASES: CaseSpec[] = [
  { ...base, id: 'golden-restaurant', sector: 'food_service', subSector: 'restaurant', lifecycle: 'mature', y: hist(28000, 13, 6), growth: 6, grossDebt: 4000, cash: 1200, capex: 4, recurring: 35, top: 4, ip: false, contracts: false, goal: 'negotiation' },
  { ...base, id: 'golden-boutique-hotel', sector: 'hospitality', subSector: 'boutique_hotel', lifecycle: 'mature', y: hist(18000, 24, 5), growth: 5, grossDebt: 9000, cash: 1500, capex: 6, recurring: 25, top: 6, ip: false, contracts: false, goal: 'bank' },
  { ...base, id: 'golden-consulting', sector: 'services', subSector: 'consulting', lifecycle: 'mature', y: hist(24000, 16, 7), growth: 7, grossDebt: 1500, cash: 2500, capex: 1, recurring: 60, top: 14, ip: false, contracts: true, goal: 'partner' },
  { ...base, id: 'golden-manufacturing', sector: 'industry', subSector: 'manufacturing', lifecycle: 'mature', y: hist(65000, 12, 5), growth: 5, grossDebt: 12000, cash: 3000, capex: 7, recurring: 30, top: 18, ip: true, contracts: true, goal: 'bank' },
  { ...base, id: 'golden-retail', sector: 'retail_unified', subSector: 'retail-supermarkets', lifecycle: 'mature', y: hist(90000, 7, 4), growth: 4, grossDebt: 10000, cash: 3500, capex: 3, recurring: 20, top: 2, ip: false, contracts: false, goal: 'negotiation' },
  { ...base, id: 'golden-b2b-saas', sector: 'saas', subSector: 'b2b_saas', lifecycle: 'growth', y: hist(30000, 18, 25), growth: 25, grossDebt: 0, cash: 8000, capex: 3, recurring: 88, top: 9, ip: true, contracts: true, goal: 'fundraise' },
  { ...base, id: 'golden-payments', sector: 'fintech', subSector: 'payments', lifecycle: 'growth', y: hist(22000, 20, 18), growth: 18, grossDebt: 2000, cash: 4000, capex: 3, recurring: 75, top: 12, ip: true, contracts: true, goal: 'fundraise' },
  { ...base, id: 'golden-enterprise-cyber', sector: 'cyber', subSector: 'enterprise', lifecycle: 'growth', y: hist(26000, 15, 22), growth: 22, grossDebt: 0, cash: 6000, capex: 3, recurring: 82, top: 14, ip: true, contracts: true, goal: 'fundraise' },
  { ...base, id: 'golden-medtech', sector: 'health', subSector: 'medtech', lifecycle: 'growth', y: hist(20000, 17, 12), growth: 12, grossDebt: 3000, cash: 2500, capex: 4, recurring: 45, top: 16, ip: true, contracts: true, goal: 'negotiation' },
  { ...base, id: 'golden-solar', sector: 'energy', subSector: 'solar', lifecycle: 'growth', y: hist(15000, 30, 10), growth: 10, grossDebt: 12000, cash: 1500, capex: 10, recurring: 85, top: 30, ip: false, contracts: true, goal: 'bank' },
  { ...base, id: 'golden-defense', sector: 'defense_aerospace', subSector: 'defense_tech', lifecycle: 'mature', y: hist(45000, 14, 9), growth: 9, grossDebt: 5000, cash: 4000, capex: 6, recurring: 40, top: 35, ip: true, contracts: true, goal: 'negotiation' },
  { ...base, id: 'golden-income-re', sector: 'real_estate', subSector: 're_income', lifecycle: 'mature', y: hist(12000, 55, 3), growth: 3, grossDebt: 10000, cash: 2000, capex: 5, recurring: 90, top: 10, ip: false, contracts: true, goal: 'bank' },
  { ...base, id: 'golden-other', sector: 'other', subSector: 'general', lifecycle: 'mature', y: hist(35000, 11, 6), growth: 6, grossDebt: 3000, cash: 1000, capex: 3, recurring: 40, top: 15, ip: false, contracts: false, goal: 'internal' },
  { ...base, id: 'golden-large-industrial', sector: 'industry', subSector: 'manufacturing', lifecycle: 'mature', y: hist(1000000, 13, 5), growth: 5, grossDebt: 220000, cash: 60000, capex: 6, recurring: 30, top: 10, ip: true, contracts: true, goal: 'bank' },
];
