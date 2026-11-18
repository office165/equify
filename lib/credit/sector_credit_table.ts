/**
 * Credit terms by sector (round 4, SBC credit standard). Off unless CREDIT_CHAPTER=on.
 *
 * Every row carries its source. Values from the SBC credit standard (18.10.2026) are marked as
 * such; every other value has no public source and is an SBC estimate waiting for approval
 * ("הערכת SBC, לאישור"). They are listed in reports/round-4.md.
 *
 * Starting coverage floors: 1.25 for stable sectors, 1.5 for volatile ones.
 */
import type { EquifySectorKey } from '../valuation';

export const SBC_STANDARD_SOURCE = 'תקן SBC לבקשות אשראי, 18.10.2026';
export const SBC_ESTIMATE_SOURCE = 'הערכת SBC, לאישור';

export interface SectorCreditTerms {
  /** Customary loan term (years). */
  termYears: number;
  /** Rate range relative to prime (points), e.g. [1, 2.5] is prime + 1 to prime + 2.5. */
  spreadOverPrimePp: [number, number];
  /** Minimum debt service coverage ratio (CFADS / annual debt service). */
  minDscr: number;
  /** Ceiling as a share of the repayment capacity (decimal). */
  ceilingPctOfCapacity: number;
  /** Share of the setup cost that is financed, where the standard sets one (solar). */
  setupCostFinancingPct?: number;
  volatility: 'stable' | 'volatile';
  /** Source of each field. */
  sources: {
    termYears: string;
    spreadOverPrimePp: string;
    minDscr: string;
    ceilingPctOfCapacity: string;
    setupCostFinancingPct?: string;
  };
}

function estimate(
  termYears: number,
  spread: [number, number],
  volatility: 'stable' | 'volatile',
  ceiling: number,
): SectorCreditTerms {
  return {
    termYears,
    spreadOverPrimePp: spread,
    minDscr: volatility === 'stable' ? 1.25 : 1.5,
    ceilingPctOfCapacity: ceiling,
    volatility,
    sources: {
      termYears: SBC_ESTIMATE_SOURCE,
      spreadOverPrimePp: SBC_ESTIMATE_SOURCE,
      minDscr: SBC_ESTIMATE_SOURCE,
      ceilingPctOfCapacity: SBC_ESTIMATE_SOURCE,
    },
  };
}

/** One row per sector of the system (EquifySectorKey). */
export const SECTOR_CREDIT_TABLE: Record<EquifySectorKey, SectorCreditTerms> = {
  hospitality: estimate(10, [1.5, 3], 'volatile', 0.6),
  saas: estimate(5, [2, 4], 'volatile', 0.5),
  fintech: estimate(5, [2, 4], 'volatile', 0.5),
  cyber: estimate(5, [2, 4], 'volatile', 0.5),
  health: estimate(7, [1, 2.5], 'stable', 0.65),
  services: estimate(5, [1.5, 3], 'stable', 0.6),
  industry: estimate(7, [1, 2.5], 'stable', 0.7),
  retail_unified: estimate(5, [1.5, 3], 'volatile', 0.55),
  food_service: estimate(5, [2, 3.5], 'volatile', 0.5),
  energy: estimate(10, [0.5, 2], 'stable', 0.75),
  defense_aerospace: estimate(7, [1, 2.5], 'stable', 0.65),
  real_estate: estimate(15, [0.5, 2], 'stable', 0.7),
  other: estimate(5, [1.5, 3], 'volatile', 0.55),
};

/** Sub-sector rows that override the sector row. */
export const SUB_SECTOR_CREDIT_TABLE: Partial<Record<string, SectorCreditTerms>> = {
  // energy / solar: term up to 25 years, ceiling 80% of capacity, 80% of the setup cost.
  'energy/solar': {
    termYears: 25,
    spreadOverPrimePp: [0.5, 2],
    minDscr: 1.25,
    ceilingPctOfCapacity: 0.8,
    setupCostFinancingPct: 0.8,
    volatility: 'stable',
    sources: {
      termYears: SBC_STANDARD_SOURCE,
      spreadOverPrimePp: SBC_ESTIMATE_SOURCE,
      minDscr: SBC_ESTIMATE_SOURCE,
      ceilingPctOfCapacity: SBC_STANDARD_SOURCE,
      setupCostFinancingPct: SBC_STANDARD_SOURCE,
    },
  },
};

export function resolveSectorCreditTerms(sector: string | undefined, subSector?: string): SectorCreditTerms {
  const sub = sector && subSector ? SUB_SECTOR_CREDIT_TABLE[`${sector}/${subSector}`] : undefined;
  if (sub) return sub;
  return SECTOR_CREDIT_TABLE[(sector as EquifySectorKey) ?? 'other'] ?? SECTOR_CREDIT_TABLE.other;
}

/** Every value marked as an SBC estimate, for the round report. */
export function listEstimatedCreditValues(): Array<{ row: string; field: string; value: string }> {
  const out: Array<{ row: string; field: string; value: string }> = [];
  const rows: Array<[string, SectorCreditTerms]> = [
    ...Object.entries(SECTOR_CREDIT_TABLE),
    ...(Object.entries(SUB_SECTOR_CREDIT_TABLE) as Array<[string, SectorCreditTerms]>),
  ];
  for (const [row, t] of rows) {
    const fields: Array<[keyof SectorCreditTerms['sources'], string]> = [
      ['termYears', `${t.termYears}`],
      ['spreadOverPrimePp', `P+${t.spreadOverPrimePp[0]} עד P+${t.spreadOverPrimePp[1]}`],
      ['minDscr', `${t.minDscr}`],
      ['ceilingPctOfCapacity', `${Math.round(t.ceilingPctOfCapacity * 100)}%`],
    ];
    for (const [f, v] of fields) if (t.sources[f] === SBC_ESTIMATE_SOURCE) out.push({ row, field: f, value: v });
  }
  return out;
}
