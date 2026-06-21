import type { EquifySectorKey } from '../valuation';
import {
  getSectorMethodologyConfig,
  type SectorMethodologyConfig,
  type SectorMethodologyKey,
} from './sector_methodology_matrix';

/** Maps equify wizard sector keys to a methodology profile. */
export const EQUIFY_SECTOR_TO_METHODOLOGY: Record<EquifySectorKey, SectorMethodologyKey> = {
  industry: 'industry',
  defense_aerospace: 'industry',
  energy: 'industry',
  services: 'services',
  hospitality: 'services',
  health: 'services',
  other: 'services',
  ecom: 'services',
  saas: 'saas',
  fintech: 'saas',
  cyber: 'saas',
};

export function resolveSectorMethodologyKey(
  sector: EquifySectorKey | undefined,
): SectorMethodologyKey {
  if (sector && sector in EQUIFY_SECTOR_TO_METHODOLOGY) {
    return EQUIFY_SECTOR_TO_METHODOLOGY[sector];
  }
  return 'services';
}

export function resolveSectorMethodologyConfig(
  sector: EquifySectorKey | undefined,
): SectorMethodologyConfig {
  return getSectorMethodologyConfig(resolveSectorMethodologyKey(sector));
}
