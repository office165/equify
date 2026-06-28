import type { EquifySectorKey } from '../valuation';
import { getSubSectorEngineDefaults } from '../constants/industry_config';
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
  retail_trade: 'services',
  food_service: 'services',
  saas: 'saas',
  fintech: 'saas',
  cyber: 'saas',
  real_estate: 'real_estate',
};

export function resolveSectorMethodologyKey(
  sector: EquifySectorKey | undefined,
  subSector?: string,
): SectorMethodologyKey {
  if (sector === 'real_estate' && subSector) {
    if (subSector === 'construction_contracting') return 'industry';
    if (subSector === 'proptech') return 'services';
  }
  if (sector && sector in EQUIFY_SECTOR_TO_METHODOLOGY) {
    return EQUIFY_SECTOR_TO_METHODOLOGY[sector];
  }
  return 'services';
}

function applySubSectorEngineDefaults(
  base: SectorMethodologyConfig,
  sector: EquifySectorKey | undefined,
  subSector?: string,
): SectorMethodologyConfig {
  if (!sector || !subSector) return base;

  const engine = getSubSectorEngineDefaults(sector, subSector);
  if (!engine) return base;

  const spread = engine.defaultMultipleValue * 0.08;

  return {
    ...base,
    strategy:
      engine.defaultMultipleType === 'Revenue'
        ? 'current_run_rate_revenue'
        : 'historical_blended_ebitda',
    weightDcf: engine.weightDcf,
    weightEbitda: engine.weightEbitda,
    weightRev: engine.weightRev ?? 0,
    minMultiple: Math.max(0.1, engine.defaultMultipleValue - spread),
    maxMultiple: engine.defaultMultipleValue + spread,
    waccBasePct: engine.waccBasePct,
    useConfiguredBlendWeights: true,
  };
}

export function resolveSectorMethodologyConfig(
  sector: EquifySectorKey | undefined,
  subSector?: string,
): SectorMethodologyConfig {
  const base = getSectorMethodologyConfig(resolveSectorMethodologyKey(sector, subSector));
  return applySubSectorEngineDefaults(base, sector, subSector);
}
