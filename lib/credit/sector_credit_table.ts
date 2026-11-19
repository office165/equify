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
  /** Round 14: true for a value still waiting for Orly's approval ("לאישור אורלי"). */
  pendingOrly?: Partial<Record<'termYears' | 'spreadOverPrimePp' | 'minDscr' | 'ceilingPctOfCapacity' | 'setupCostFinancingPct', boolean>>;
}

/**
 * Round 14: the values live in data/credit/sectors.json, the one data file for Orly's answer. Every
 * value there has `value`, `source` and `pendingOrly` (true = "לאישור אורלי"). A value still
 * pending is shown in the report as "הערכת SBC" (credit_chapter.ts). The table below is built from
 * the file and is exactly what round 4 had in code.
 */
import SECTORS_JSON from '../../data/credit/sectors.json';

interface JsonCell<T> {
  value: T;
  source: string;
  pendingOrly: boolean;
}
interface JsonRow {
  nameHe: string;
  volatility: 'stable' | 'volatile';
  termYears: JsonCell<number>;
  spreadOverPrimePp: JsonCell<[number, number]>;
  minDscr: JsonCell<number>;
  ceilingPctOfCapacity: JsonCell<number>;
  setupCostFinancingPct?: JsonCell<number>;
}
interface SectorsFile {
  sectors: Record<string, JsonRow>;
  subSectors: Record<string, JsonRow>;
}

export type CreditTermField = 'termYears' | 'spreadOverPrimePp' | 'minDscr' | 'ceilingPctOfCapacity' | 'setupCostFinancingPct';

/** Fields of a row still waiting for Orly's approval. */
export function pendingOrlyFields(t: SectorCreditTerms): CreditTermField[] {
  return (Object.keys(t.pendingOrly ?? {}) as CreditTermField[]).filter((k) => t.pendingOrly?.[k]);
}

function fromJson(r: JsonRow): SectorCreditTerms {
  const t: SectorCreditTerms = {
    termYears: r.termYears.value,
    spreadOverPrimePp: [r.spreadOverPrimePp.value[0], r.spreadOverPrimePp.value[1]],
    minDscr: r.minDscr.value,
    ceilingPctOfCapacity: r.ceilingPctOfCapacity.value,
    ...(r.setupCostFinancingPct ? { setupCostFinancingPct: r.setupCostFinancingPct.value } : {}),
    volatility: r.volatility,
    sources: {
      termYears: r.termYears.source,
      spreadOverPrimePp: r.spreadOverPrimePp.source,
      minDscr: r.minDscr.source,
      ceilingPctOfCapacity: r.ceilingPctOfCapacity.source,
      ...(r.setupCostFinancingPct ? { setupCostFinancingPct: r.setupCostFinancingPct.source } : {}),
    },
    pendingOrly: {
      termYears: r.termYears.pendingOrly,
      spreadOverPrimePp: r.spreadOverPrimePp.pendingOrly,
      minDscr: r.minDscr.pendingOrly,
      ceilingPctOfCapacity: r.ceilingPctOfCapacity.pendingOrly,
      ...(r.setupCostFinancingPct ? { setupCostFinancingPct: r.setupCostFinancingPct.pendingOrly } : {}),
    },
  };
  return t;
}

const FILE = SECTORS_JSON as unknown as SectorsFile;

/** One row per sector of the system (EquifySectorKey). */
export const SECTOR_CREDIT_TABLE: Record<EquifySectorKey, SectorCreditTerms> = Object.fromEntries(
  Object.entries(FILE.sectors).map(([k, r]) => [k, fromJson(r)]),
) as Record<EquifySectorKey, SectorCreditTerms>;

/** Sub-sector rows that override the sector row. */
export const SUB_SECTOR_CREDIT_TABLE: Partial<Record<string, SectorCreditTerms>> = Object.fromEntries(
  Object.entries(FILE.subSectors).map(([k, r]) => [k, fromJson(r)]),
);

/** Hebrew name of a row in the data file (for the report to Orly). */
export function creditRowNameHe(key: string): string {
  return (FILE.sectors[key] ?? FILE.subSectors[key])?.nameHe ?? key;
}

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
