import type { EquifySectorKey } from '../valuation';

/** Per-sector valuation blend, multiple guardrails, and DCF growth cap (decimal). */
export interface SectorValuationConfig {
  weightDcf: number;
  weightEbitda: number;
  weightRev: number;
  minMultiple: number;
  maxMultiple: number;
  growthCap: number;
}

export interface NormalizedBlendWeights {
  dcf: number;
  ebitda: number;
  rev: number;
}

const DEFAULT_TECH: SectorValuationConfig = {
  weightDcf: 0.5,
  weightEbitda: 0.3,
  weightRev: 0.2,
  minMultiple: 6,
  maxMultiple: 14,
  growthCap: 0.35,
};

const TRADITIONAL_INDUSTRIAL: SectorValuationConfig = {
  weightDcf: 0.4,
  weightEbitda: 0.6,
  weightRev: 0,
  minMultiple: 5,
  maxMultiple: 7,
  growthCap: 0.25,
};

export const SECTOR_VALUATION_CONFIGS: Record<EquifySectorKey, SectorValuationConfig> = {
  hospitality: {
    weightDcf: 0.45,
    weightEbitda: 0.55,
    weightRev: 0,
    minMultiple: 5,
    maxMultiple: 8.5,
    growthCap: 0.2,
  },
  saas: { ...DEFAULT_TECH, minMultiple: 8, maxMultiple: 18, growthCap: 0.4 },
  fintech: { ...DEFAULT_TECH, minMultiple: 8, maxMultiple: 16, growthCap: 0.35 },
  cyber: { ...DEFAULT_TECH, minMultiple: 9, maxMultiple: 18, growthCap: 0.38 },
  health: {
    weightDcf: 0.48,
    weightEbitda: 0.42,
    weightRev: 0.1,
    minMultiple: 7,
    maxMultiple: 14,
    growthCap: 0.3,
  },
  services: {
    weightDcf: 0.5,
    weightEbitda: 0.45,
    weightRev: 0.05,
    minMultiple: 5,
    maxMultiple: 9,
    growthCap: 0.2,
  },
  industry: TRADITIONAL_INDUSTRIAL,
  ecom: {
    weightDcf: 0.45,
    weightEbitda: 0.35,
    weightRev: 0.2,
    minMultiple: 4,
    maxMultiple: 10,
    growthCap: 0.25,
  },
  energy: {
    weightDcf: 0.5,
    weightEbitda: 0.5,
    weightRev: 0,
    minMultiple: 6,
    maxMultiple: 11,
    growthCap: 0.22,
  },
  defense_aerospace: TRADITIONAL_INDUSTRIAL,
  other: {
    weightDcf: 0.5,
    weightEbitda: 0.4,
    weightRev: 0.1,
    minMultiple: 5,
    maxMultiple: 10,
    growthCap: 0.25,
  },
};

export function getSectorValuationConfig(
  sector: EquifySectorKey | undefined,
): SectorValuationConfig {
  if (sector && sector in SECTOR_VALUATION_CONFIGS) {
    return SECTOR_VALUATION_CONFIGS[sector];
  }
  return SECTOR_VALUATION_CONFIGS.other;
}

export function normalizeBlendWeights(
  config: SectorValuationConfig,
): NormalizedBlendWeights {
  const sum = config.weightDcf + config.weightEbitda + config.weightRev;
  if (sum <= 0) {
    return { dcf: 0.5, ebitda: 0.5, rev: 0 };
  }
  return {
    dcf: config.weightDcf / sum,
    ebitda: config.weightEbitda / sum,
    rev: config.weightRev / sum,
  };
}

export function getBlendWeights(
  sector: EquifySectorKey | undefined,
): NormalizedBlendWeights {
  return normalizeBlendWeights(getSectorValuationConfig(sector));
}

/** Cap user growth % input to sector DCF growthCap (stored as decimal). */
export function capGrowthPctForSector(
  growthPct: number,
  sector: EquifySectorKey | undefined,
): number {
  const capPct = getSectorValuationConfig(sector).growthCap * 100;
  return Math.min(growthPct, capPct);
}
