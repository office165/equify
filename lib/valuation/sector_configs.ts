import type { EquifySectorKey } from '../valuation';
import {
  capGrowthPctForMethodology,
  normalizeMethodologyWeights,
  SECTOR_METHODOLOGY_MATRIX,
  type SectorMethodologyConfig,
} from './sector_methodology_matrix';
import {
  EQUIFY_SECTOR_TO_METHODOLOGY,
  resolveSectorMethodologyConfig,
  resolveSectorMethodologyKey,
} from './sector_methodology_resolver';

export type { SectorMethodologyConfig, SectorMethodologyKey } from './sector_methodology_matrix';
export {
  SECTOR_METHODOLOGY_MATRIX,
  EQUIFY_SECTOR_TO_METHODOLOGY,
  resolveSectorMethodologyConfig,
  resolveSectorMethodologyKey,
};

/** @deprecated Use SectorMethodologyConfig — kept for legacy imports. */
export interface SectorValuationConfig {
  weightDcf: number;
  weightEbitda: number;
  weightRev: number;
  minMultiple: number;
  maxMultiple: number;
  growthCap: number;
  strategy?: string;
  maxHistoricalMargin?: number;
}

function toLegacyConfig(config: SectorMethodologyConfig): SectorValuationConfig {
  return {
    weightDcf: config.weightDcf,
    weightEbitda: config.weightEbitda,
    weightRev: config.weightRev,
    minMultiple: config.minMultiple,
    maxMultiple: config.maxMultiple,
    growthCap: config.growthCap,
    strategy: config.strategy,
    maxHistoricalMargin: config.maxHistoricalMargin,
  };
}

/** Per-sector guardrails derived from the immutable methodology matrix. */
export const SECTOR_VALUATION_CONFIGS: Record<EquifySectorKey, SectorValuationConfig> =
  Object.fromEntries(
    (Object.keys(EQUIFY_SECTOR_TO_METHODOLOGY) as EquifySectorKey[]).map((sector) => [
      sector,
      toLegacyConfig(resolveSectorMethodologyConfig(sector)),
    ]),
  ) as Record<EquifySectorKey, SectorValuationConfig>;

export interface NormalizedBlendWeights {
  dcf: number;
  ebitda: number;
  rev: number;
}

export function getSectorValuationConfig(
  sector: EquifySectorKey | undefined,
): SectorValuationConfig {
  return toLegacyConfig(resolveSectorMethodologyConfig(sector));
}

export function normalizeBlendWeights(
  config: Pick<SectorValuationConfig, 'weightDcf' | 'weightEbitda' | 'weightRev'>,
): NormalizedBlendWeights {
  return normalizeMethodologyWeights(config);
}

export function getBlendWeights(
  sector: EquifySectorKey | undefined,
): NormalizedBlendWeights {
  return normalizeMethodologyWeights(resolveSectorMethodologyConfig(sector));
}

/** Cap user growth % input to sector DCF growthCap (stored as decimal). */
export function capGrowthPctForSector(
  growthPct: number,
  sector: EquifySectorKey | undefined,
): number {
  return capGrowthPctForMethodology(growthPct, resolveSectorMethodologyConfig(sector));
}
