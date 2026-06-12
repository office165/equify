import {
  getMedianMultiple,
  ISRAEL_MULTIPLES_2026,
} from '../valuation/multiples';
import { mapWizardIndustry } from '../valuation/engine';

export interface SectorMultiplierProfile {
  revenueMultiple: number;
  ebitdaMultiple: number;
}

const DEFAULT_SECTOR_MULTIPLIERS: SectorMultiplierProfile = {
  revenueMultiple: 4.5,
  ebitdaMultiple: 12,
};

function profileFromIsraelMultiples(industryCode: string): SectorMultiplierProfile {
  const industry = mapWizardIndustry(industryCode);
  const ranges = ISRAEL_MULTIPLES_2026[industry];
  return {
    revenueMultiple: getMedianMultiple(ranges.evSales),
    ebitdaMultiple: getMedianMultiple(ranges.evEbitda),
  };
}

export function getSectorMultipliers(industryCode: string): SectorMultiplierProfile {
  const key = industryCode.trim();
  if (!key) return DEFAULT_SECTOR_MULTIPLIERS;
  return profileFromIsraelMultiples(key);
}

/**
 * Sector-normalized enterprise value anchor from revenue and/or EBITDA.
 */
export function computeSectorEnterpriseValue(
  industryCode: string,
  revenue: number,
  ebitda: number,
): number {
  const { revenueMultiple, ebitdaMultiple } = getSectorMultipliers(industryCode);
  const revenueEv = revenue > 0 ? revenue * revenueMultiple : 0;
  const ebitdaEv = ebitda > 0 ? ebitda * ebitdaMultiple : 0;

  if (revenueEv > 0 && ebitdaEv > 0) {
    return Math.round(((revenueEv + ebitdaEv) / 2) * 100) / 100;
  }
  return Math.round((revenueEv || ebitdaEv) * 100) / 100;
}
