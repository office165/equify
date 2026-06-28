import {
  getInstitutionalSubSectorConfig,
  getSubSectorEngineDefaults,
  getSubSectorMultAdj,
  getSubSectorValuationProfile,
  resolveSubSectorMultiplesIndustry,
} from '../constants/industry_config';
import { getOfflineSectorMetrics } from '../wizard/sector_market_defaults';
import type { EquifySectorKey } from '../valuation';
import { ISRAEL_MULTIPLES_2026 } from './multiples';
import type { SectorMethodologyConfig } from './sector_methodology_matrix';

export interface SubSectorMarketMultiples {
  evEbitda: number;
  evRevenue: number;
}

function roundMultiple(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 10) / 10;
}

function resolveMarketMultiples(
  sector: EquifySectorKey | undefined,
  market?: Partial<SubSectorMarketMultiples>,
): SubSectorMarketMultiples {
  const offline = sector ? getOfflineSectorMetrics(sector) : null;
  return {
    evEbitda: market?.evEbitda ?? offline?.evEbitda ?? 8,
    evRevenue: market?.evRevenue ?? offline?.evRevenue ?? 1.5,
  };
}

/**
 * Sub-sector baseline multiple (×) — mirrors Step 1 Industry Insight Card logic.
 * Institutional / engine defaults take precedence; otherwise market median × multAdj.
 */
export function resolveSubSectorDefaultMultiple(params: {
  sector: EquifySectorKey | undefined;
  subSector: string | undefined;
  sectorConfig: SectorMethodologyConfig;
  market?: Partial<SubSectorMarketMultiples>;
}): number {
  const { sector, subSector, sectorConfig, market } = params;

  if (sector && subSector) {
    const engine = getSubSectorEngineDefaults(sector, subSector);
    if (engine?.defaultMultipleValue != null && engine.defaultMultipleValue > 0) {
      return roundMultiple(engine.defaultMultipleValue);
    }

    const institutional = getInstitutionalSubSectorConfig(sector, subSector);
    if (institutional?.defaultMultiple != null && institutional.defaultMultiple > 0) {
      return roundMultiple(institutional.defaultMultiple);
    }
  }

  if (!sector || !subSector) {
    return roundMultiple((sectorConfig.minMultiple + sectorConfig.maxMultiple) / 2);
  }

  const multAdj = getSubSectorMultAdj(sector, subSector);
  const metrics = resolveMarketMultiples(sector, market);
  const valuationProfile = getSubSectorValuationProfile(sector, subSector);
  const multiplesIndustry = resolveSubSectorMultiplesIndustry(sector, subSector);
  const institutionalRanges = ISRAEL_MULTIPLES_2026[multiplesIndustry];

  if (valuationProfile) {
    const { primaryMultiple, multipleRange } = valuationProfile;

    if (primaryMultiple === 'pbv' || primaryMultiple === 'nav') {
      const pbvRange =
        multipleRange ?? institutionalRanges.pbv ?? ([0.8, 1.8] as [number, number]);
      const mid = ((pbvRange[0] + pbvRange[1]) / 2) * multAdj;
      return roundMultiple(mid);
    }

    if (primaryMultiple === 'ev_ebitda' || primaryMultiple === 'ev_revenue') {
      if (multipleRange) {
        return roundMultiple((multipleRange[0] + multipleRange[1]) / 2);
      }
      const base =
        primaryMultiple === 'ev_ebitda' ? metrics.evEbitda : metrics.evRevenue;
      return roundMultiple(base * multAdj);
    }
  }

  const prefersRevenue =
    sectorConfig.strategy === 'current_run_rate_revenue' ||
    sectorConfig.weightRev > sectorConfig.weightEbitda;
  const baseMultiple = prefersRevenue ? metrics.evRevenue : metrics.evEbitda;
  return roundMultiple(baseMultiple * multAdj);
}
