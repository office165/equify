import type { EquifySectorKey } from '../valuation';
import { resolveSectorMethodologyConfig } from '../valuation/sector_methodology_resolver';
import { getMedianMultiple, ISRAEL_MULTIPLES_2026, type Industry } from '../valuation/multiples';
import type { SectorMetricsResult } from '../utils/financialData';

export interface SectorMarketContext {
  sectorKey: EquifySectorKey;
  unleveredBeta: number;
  evEbitda: number;
  evRevenue: number;
  source: 'live' | 'fallback';
  fetchedAt: string;
  /** Smart-default growth % applied when sector was confirmed */
  appliedGrowthPct: number;
  /** Smart-default CAPEX % applied when sector was confirmed */
  appliedCapexPct: number;
}

const EQUIFY_TO_MULTIPLES_INDUSTRY: Record<EquifySectorKey, Industry> = {
  hospitality: 'food',
  saas: 'saas',
  fintech: 'fintech',
  cyber: 'cyber',
  health: 'healthtech',
  services: 'professional_services',
  industry: 'manufacturing',
  ecom: 'retail',
  retail_trade: 'retail',
  food_service: 'food',
  energy: 'energy',
  defense_aerospace: 'defense',
  real_estate: 'realestate',
  other: 'other',
};

const SECTOR_UNLEVERED_BETA: Record<EquifySectorKey, number> = {
  hospitality: 0.88,
  saas: 1.12,
  fintech: 1.05,
  cyber: 1.1,
  health: 0.98,
  services: 0.92,
  industry: 1.02,
  ecom: 1.04,
  retail_trade: 1.02,
  food_service: 0.95,
  energy: 0.86,
  defense_aerospace: 0.82,
  real_estate: 0.78,
  other: 1.0,
};

const SECTOR_CAPEX_BASE_PCT: Record<EquifySectorKey, number> = {
  hospitality: 8,
  saas: 3,
  fintech: 4,
  cyber: 4,
  health: 7,
  services: 4,
  industry: 8,
  ecom: 5,
  retail_trade: 4,
  food_service: 6,
  energy: 12,
  defense_aerospace: 6,
  real_estate: 5,
  other: 6,
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Sector unlevered beta (βu) — institutional default; falls back to 0.9. */
export function resolveSectorUnleveredBeta(sector: EquifySectorKey | undefined): number {
  if (!sector) return 0.9;
  return SECTOR_UNLEVERED_BETA[sector] ?? 0.9;
}

/** Offline sector metrics — mirrors {@link financialData} institutional fallbacks. */
export function getOfflineSectorMetrics(sector: EquifySectorKey): SectorMetricsResult {
  const multiplesIndustry = EQUIFY_TO_MULTIPLES_INDUSTRY[sector];
  const ranges = ISRAEL_MULTIPLES_2026[multiplesIndustry];

  return {
    sector,
    resolvedSectorKey: sector,
    evEbitda: getMedianMultiple(ranges.evEbitda),
    evRevenue: getMedianMultiple(ranges.evSales),
    unleveredBeta: SECTOR_UNLEVERED_BETA[sector],
    source: 'fallback',
    fetchedAt: new Date().toISOString(),
  };
}

/** Client-side fetch with graceful offline fallback. */
export async function fetchSectorMetricsClient(
  sector: EquifySectorKey,
): Promise<SectorMetricsResult> {
  try {
    const res = await fetch(
      `/api/market-data/sector?sector=${encodeURIComponent(sector)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) throw new Error(`market-data ${res.status}`);
    const payload = (await res.json()) as SectorMetricsResult;
    if (
      !payload ||
      typeof payload.evEbitda !== 'number' ||
      typeof payload.unleveredBeta !== 'number'
    ) {
      throw new Error('invalid market-data payload');
    }
    return payload;
  } catch {
    return getOfflineSectorMetrics(sector);
  }
}

/** Maps live sector multiples + beta into wizard slider defaults (user can override). */
export function deriveFinancialDefaultsFromSectorMetrics(
  sector: EquifySectorKey,
  metrics: Pick<SectorMetricsResult, 'evEbitda' | 'evRevenue' | 'unleveredBeta'>,
): { growthPct: number; capexLevelPct: number } {
  const config = resolveSectorMethodologyConfig(sector);
  const growthCapPct = config.growthCap * 100;

  const multipleNorm = clamp(metrics.evEbitda / 10, 0.75, 1.35);
  const betaNorm = clamp(metrics.unleveredBeta, 0.75, 1.25);
  const revenueMultipleNorm = clamp(metrics.evRevenue / 3, 0.7, 1.3);

  const growthRaw = growthCapPct * 0.36 * multipleNorm * betaNorm * revenueMultipleNorm;
  const growthPct = Math.round(clamp(growthRaw, -10, 50));

  const capexBase = SECTOR_CAPEX_BASE_PCT[sector] ?? 6;
  const capexRaw = capexBase * (0.88 + metrics.unleveredBeta * 0.08);
  const capexLevelPct = Math.round(clamp(capexRaw, 0, 30));

  return { growthPct, capexLevelPct };
}

export function buildSectorMarketContext(
  sector: EquifySectorKey,
  metrics: SectorMetricsResult,
): SectorMarketContext {
  const defaults = deriveFinancialDefaultsFromSectorMetrics(sector, metrics);
  return {
    sectorKey: sector,
    unleveredBeta: metrics.unleveredBeta,
    evEbitda: metrics.evEbitda,
    evRevenue: metrics.evRevenue,
    source: metrics.source,
    fetchedAt: metrics.fetchedAt,
    appliedGrowthPct: defaults.growthPct,
    appliedCapexPct: defaults.capexLevelPct,
  };
}

/** Nudges static sector multiplier toward live EV/EBITDA when market context is present. */
export function resolveLiveSectorMult(
  sector: EquifySectorKey,
  baseMult: number,
  marketContext?: SectorMarketContext,
): number {
  if (!marketContext || marketContext.sectorKey !== sector) return baseMult;
  const offline = getOfflineSectorMetrics(sector);
  if (offline.evEbitda <= 0) return baseMult;
  const ratio = clamp(marketContext.evEbitda / offline.evEbitda, 0.9, 1.12);
  return Math.round(baseMult * ratio * 1000) / 1000;
}
