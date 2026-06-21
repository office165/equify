/**
 * Immutable sector methodology matrix — spec name: sectorConfigs.
 * Baseline weights, multiple guardrails, DCF growth caps, strategy selection.
 */
export type ValuationStrategyKind =
  | 'historical_blended_ebitda'
  | 'current_run_rate_revenue';

export interface SectorMethodologyConfig {
  strategy: ValuationStrategyKind;
  weightEbitda: number;
  weightDcf: number;
  weightRev: number;
  minMultiple: number;
  maxMultiple: number;
  /** Decimal cap (e.g. 0.25 = 25%). */
  growthCap: number;
}

export const sectorConfigs = {
  industry: {
    strategy: 'historical_blended_ebitda',
    weightEbitda: 0.6,
    weightDcf: 0.4,
    weightRev: 0.0,
    minMultiple: 5.0,
    maxMultiple: 7.5,
    growthCap: 0.25,
  },
  services: {
    strategy: 'historical_blended_ebitda',
    weightEbitda: 0.7,
    weightDcf: 0.3,
    weightRev: 0.0,
    minMultiple: 4.0,
    maxMultiple: 6.0,
    growthCap: 0.15,
  },
  saas: {
    strategy: 'current_run_rate_revenue',
    weightEbitda: 0.0,
    weightDcf: 0.4,
    weightRev: 0.6,
    minMultiple: 4.0,
    maxMultiple: 8.0,
    growthCap: 0.6,
  },
} as const satisfies Record<string, SectorMethodologyConfig>;

/** @alias sectorConfigs */
export const SECTOR_METHODOLOGY_MATRIX = sectorConfigs;

export type SectorMethodologyKey = keyof typeof sectorConfigs;

export function normalizeMethodologyWeights(
  config: Pick<SectorMethodologyConfig, 'weightDcf' | 'weightEbitda' | 'weightRev'>,
): { dcf: number; ebitda: number; rev: number } {
  const sum = config.weightDcf + config.weightEbitda + config.weightRev;
  if (sum <= 0) return { dcf: 0.5, ebitda: 0.5, rev: 0 };
  return {
    dcf: config.weightDcf / sum,
    ebitda: config.weightEbitda / sum,
    rev: config.weightRev / sum,
  };
}

export function getSectorMethodologyConfig(
  key: SectorMethodologyKey,
): SectorMethodologyConfig {
  return sectorConfigs[key];
}

/** Cap user growth % to sector growthCap (decimal). */
export function capGrowthPctForMethodology(
  growthPct: number,
  config: SectorMethodologyConfig,
): number {
  return Math.min(growthPct, config.growthCap * 100);
}
