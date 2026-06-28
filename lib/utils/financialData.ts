/**
 * Live market parameters via Financial Modeling Prep (FMP).
 * Server-side only — reads FMP_API_KEY from env; never expose the key to the client.
 */

import { INDUSTRY_CONFIG } from '../constants/industry_config';
import { resolveEquifySectorKey } from '../i18n/equify_report_copy';
import type { EquifySectorKey } from '../valuation';
import { getMedianMultiple, ISRAEL_MULTIPLES_2026, type Industry } from '../valuation/multiples';
import { mapWizardIndustry } from '../valuation/engine';

/** 10-Year U.S. Treasury fallback (%), used when the API is unavailable. */
export const DEFAULT_RISK_FREE_RATE_PCT = 2.46;

const FMP_BASE_URL = 'https://financialmodelingprep.com';
const CACHE_TTL_MS = 15 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8_000;

export type MarketDataSource = 'live' | 'fallback';

export interface RiskFreeRateResult {
  /** Percentage points, e.g. 4.26 = 4.26% */
  ratePct: number;
  /** Decimal form, e.g. 0.0426 */
  rateDecimal: number;
  source: MarketDataSource;
  fetchedAt: string;
  asOfDate?: string;
  error?: string;
}

export interface SectorMetricsResult {
  sector: string;
  resolvedSectorKey: EquifySectorKey;
  /** Median / blended EV/EBITDA multiple (×) */
  evEbitda: number;
  /** Median / blended EV/Revenue multiple (×) */
  evRevenue: number;
  /** Unlevered beta (βu) */
  unleveredBeta: number;
  source: MarketDataSource;
  fetchedAt: string;
  fmpSector?: string;
  sampleSize?: number;
  error?: string;
}

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const cache = {
  riskFree: null as CacheEntry<RiskFreeRateResult> | null,
  sector: new Map<string, CacheEntry<SectorMetricsResult>>(),
};

/** Institutional unlevered beta defaults (Israeli mid-market calibration). */
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

/** Maps Equify sector → FMP stock-screener sector label. */
const EQUIFY_TO_FMP_SECTOR: Record<EquifySectorKey, string> = {
  hospitality: 'Consumer Cyclical',
  saas: 'Technology',
  fintech: 'Financial Services',
  cyber: 'Technology',
  health: 'Healthcare',
  services: 'Industrials',
  industry: 'Industrials',
  ecom: 'Consumer Cyclical',
  retail_trade: 'Consumer Cyclical',
  food_service: 'Consumer Cyclical',
  energy: 'Energy',
  defense_aerospace: 'Industrials',
  real_estate: 'Real Estate',
  other: 'Industrials',
};

/** Optional FMP industry filter for tighter peer sets. */
const EQUIFY_TO_FMP_INDUSTRY: Partial<Record<EquifySectorKey, string>> = {
  saas: 'Software - Application',
  fintech: 'Financial Data & Stock Exchanges',
  cyber: 'Software - Infrastructure',
  health: 'Biotechnology',
  ecom: 'Internet Retail',
  retail_trade: 'Grocery Stores',
  food_service: 'Restaurants',
  defense_aerospace: 'Aerospace & Defense',
  real_estate: 'Real Estate - Development',
};

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

function nowIso(): string {
  return new Date().toISOString();
}

function resolveApiKey(): string | undefined {
  return (
    process.env.FMP_API_KEY?.trim() ||
    process.env.FINANCIAL_MODELING_PREP_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_FMP_API_KEY?.trim()
  );
}

function isFresh<T>(entry: CacheEntry<T> | null | undefined): entry is CacheEntry<T> {
  return Boolean(entry && entry.expiresAt > Date.now());
}

function normalizeRatePct(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0 || n > 25) return null;
  return n;
}

function parseTreasuryYear10(row: Record<string, unknown>): number | null {
  const candidates = [
    row.year10,
    row.tenYear,
    row.ten_year,
    row.maturity10,
    row['10year'],
    row['10Year'],
  ];
  for (const candidate of candidates) {
    const parsed = normalizeRatePct(candidate);
    if (parsed != null) return parsed;
  }
  return null;
}

async function fetchFmpJson<T>(
  path: string,
  apiKey: string,
): Promise<T | null> {
  const url = `${FMP_BASE_URL}${path}${path.includes('?') ? '&' : '?'}apikey=${encodeURIComponent(apiKey)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      next: { revalidate: 900 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function buildFallbackRiskFreeRate(error?: string): RiskFreeRateResult {
  return {
    ratePct: DEFAULT_RISK_FREE_RATE_PCT,
    rateDecimal: DEFAULT_RISK_FREE_RATE_PCT / 100,
    source: 'fallback',
    fetchedAt: nowIso(),
    error,
  };
}

function resolveSectorKey(sector: string): EquifySectorKey {
  const trimmed = sector.trim();
  if (!trimmed) return 'other';

  const direct = resolveEquifySectorKey(trimmed);
  if (direct !== 'other' || trimmed === 'other') return direct;

  for (const key of Object.keys(INDUSTRY_CONFIG) as EquifySectorKey[]) {
    if (INDUSTRY_CONFIG[key].industryCode.toLowerCase() === trimmed.toLowerCase()) {
      return key;
    }
  }

  const fromIndustryCode = mapWizardIndustry(trimmed);
  const reverseMap: Partial<Record<Industry, EquifySectorKey>> = {
    saas: 'saas',
    fintech: 'fintech',
    healthtech: 'health',
    cyber: 'cyber',
    retail: 'ecom',
    manufacturing: 'industry',
    professional_services: 'services',
    defense: 'defense_aerospace',
    energy: 'energy',
    food: 'hospitality',
    realestate: 'real_estate',
    construction: 'real_estate',
    other: 'other',
  };
  return reverseMap[fromIndustryCode] ?? 'other';
}

function buildFallbackSectorMetrics(
  sector: string,
  sectorKey: EquifySectorKey,
  error?: string,
): SectorMetricsResult {
  const multiplesIndustry = EQUIFY_TO_MULTIPLES_INDUSTRY[sectorKey];
  const ranges = ISRAEL_MULTIPLES_2026[multiplesIndustry];

  return {
    sector,
    resolvedSectorKey: sectorKey,
    evEbitda: getMedianMultiple(ranges.evEbitda),
    evRevenue: getMedianMultiple(ranges.evSales),
    unleveredBeta: SECTOR_UNLEVERED_BETA[sectorKey],
    source: 'fallback',
    fetchedAt: nowIso(),
    fmpSector: EQUIFY_TO_FMP_SECTOR[sectorKey],
    error,
  };
}

function averageFinite(values: number[]): number | null {
  const valid = values.filter((v) => Number.isFinite(v) && v > 0);
  if (!valid.length) return null;
  return valid.reduce((sum, v) => sum + v, 0) / valid.length;
}

/** Approximate unlevered beta from observed levered beta. */
function toUnleveredBeta(
  leveredBeta: number,
  debtToEquity = 0.35,
  taxRate = 0.23,
): number {
  const denom = 1 + (1 - taxRate) * debtToEquity;
  if (denom <= 0) return leveredBeta;
  return leveredBeta / denom;
}

interface FmpScreenerRow {
  symbol?: string;
  beta?: number;
}

interface FmpRatiosTtm {
  enterpriseValueMultiple?: number;
  evToEBITDATTM?: number;
  priceToSalesRatioTTM?: number;
  priceToSalesRatio?: number;
}

/**
 * Fetches the current 10-Year U.S. Treasury yield (risk-free rate proxy).
 * Falls back to {@link DEFAULT_RISK_FREE_RATE_PCT} when the API key is missing or the call fails.
 */
export async function fetchRiskFreeRate(): Promise<RiskFreeRateResult> {
  if (isFresh(cache.riskFree)) return cache.riskFree.value;

  const apiKey = resolveApiKey();
  if (!apiKey) {
    const fallback = buildFallbackRiskFreeRate('FMP_API_KEY not configured');
    cache.riskFree = { value: fallback, expiresAt: Date.now() + CACHE_TTL_MS };
    return fallback;
  }

  const payload = await fetchFmpJson<Record<string, unknown>[]>(
    '/stable/treasury-rates',
    apiKey,
  );

  if (!payload?.length) {
    const legacy = await fetchFmpJson<Record<string, unknown>[]>(
      '/api/v4/treasury',
      apiKey,
    );
    const row = legacy?.[0];
    const ratePct = row ? parseTreasuryYear10(row) : null;
    if (row && ratePct != null) {
      const live: RiskFreeRateResult = {
        ratePct,
        rateDecimal: ratePct / 100,
        source: 'live',
        fetchedAt: nowIso(),
        asOfDate: typeof row.date === 'string' ? row.date : undefined,
      };
      cache.riskFree = { value: live, expiresAt: Date.now() + CACHE_TTL_MS };
      return live;
    }

    const fallback = buildFallbackRiskFreeRate('Treasury rates API returned no data');
    cache.riskFree = { value: fallback, expiresAt: Date.now() + CACHE_TTL_MS };
    return fallback;
  }

  const latest = payload[0];
  const ratePct = parseTreasuryYear10(latest);
  if (ratePct == null) {
    const fallback = buildFallbackRiskFreeRate('Could not parse 10Y treasury field');
    cache.riskFree = { value: fallback, expiresAt: Date.now() + CACHE_TTL_MS };
    return fallback;
  }

  const live: RiskFreeRateResult = {
    ratePct,
    rateDecimal: ratePct / 100,
    source: 'live',
    fetchedAt: nowIso(),
    asOfDate:
      typeof latest.date === 'string'
        ? latest.date
        : typeof latest.timestamp === 'string'
          ? latest.timestamp
          : undefined,
  };
  cache.riskFree = { value: live, expiresAt: Date.now() + CACHE_TTL_MS };
  return live;
}

/**
 * Fetches sector EV/EBITDA, EV/Revenue, and unlevered beta for the given sector label.
 * Accepts Equify sector keys (`saas`, `industry`), industry codes (`Software/SaaS`), or FMP sector names.
 * Falls back to Israeli institutional defaults from {@link ISRAEL_MULTIPLES_2026}.
 */
export async function fetchSectorMetrics(sector: string): Promise<SectorMetricsResult> {
  const sectorKey = resolveSectorKey(sector);
  const cacheKey = sectorKey;
  const cached = cache.sector.get(cacheKey);
  if (isFresh(cached)) return cached.value;

  const fallback = buildFallbackSectorMetrics(sector, sectorKey);
  const apiKey = resolveApiKey();
  if (!apiKey) {
    const result = buildFallbackSectorMetrics(sector, sectorKey, 'FMP_API_KEY not configured');
    cache.sector.set(cacheKey, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  }

  const fmpSector = EQUIFY_TO_FMP_SECTOR[sectorKey];
  const fmpIndustry = EQUIFY_TO_FMP_INDUSTRY[sectorKey];
  const screenerParams = new URLSearchParams({
    sector: fmpSector,
    marketCapMoreThan: '1000000000',
    isActivelyTrading: 'true',
    limit: '24',
  });
  if (fmpIndustry) screenerParams.set('industry', fmpIndustry);

  const screener = await fetchFmpJson<FmpScreenerRow[]>(
    `/api/v3/stock-screener?${screenerParams.toString()}`,
    apiKey,
  );

  const symbols = (screener ?? [])
    .map((row) => row.symbol?.trim())
    .filter((symbol): symbol is string => Boolean(symbol))
    .slice(0, 5);

  const leveredBetas = (screener ?? [])
    .map((row) => row.beta)
    .filter((beta): beta is number => typeof beta === 'number' && Number.isFinite(beta) && beta > 0);

  const ratioSamples = await Promise.allSettled(
    symbols.map(async (symbol) => {
      const ratios = await fetchFmpJson<FmpRatiosTtm>(
        `/api/v3/ratios-ttm/${encodeURIComponent(symbol)}`,
        apiKey,
      );
      if (!ratios) return null;
      const evEbitda =
        ratios.evToEBITDATTM ??
        ratios.enterpriseValueMultiple ??
        null;
      const evRevenue =
        ratios.priceToSalesRatioTTM ?? ratios.priceToSalesRatio ?? null;
      if (evEbitda == null && evRevenue == null) return null;
      return { evEbitda, evRevenue };
    }),
  );

  const evEbitdaSamples: number[] = [];
  const evRevenueSamples: number[] = [];
  for (const sample of ratioSamples) {
    if (sample.status !== 'fulfilled' || !sample.value) continue;
    if (sample.value.evEbitda != null && sample.value.evEbitda > 0 && sample.value.evEbitda < 100) {
      evEbitdaSamples.push(sample.value.evEbitda);
    }
    if (sample.value.evRevenue != null && sample.value.evRevenue > 0 && sample.value.evRevenue < 50) {
      evRevenueSamples.push(sample.value.evRevenue);
    }
  }

  const liveEvEbitda = averageFinite(evEbitdaSamples);
  const liveEvRevenue = averageFinite(evRevenueSamples);
  const liveLeveredBeta = averageFinite(leveredBetas);
  const hasLiveMultiples = liveEvEbitda != null || liveEvRevenue != null;
  const hasLiveBeta = liveLeveredBeta != null;

  if (!hasLiveMultiples && !hasLiveBeta) {
    const result = buildFallbackSectorMetrics(
      sector,
      sectorKey,
      'Sector screener / ratios API returned no usable data',
    );
    cache.sector.set(cacheKey, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  }

  const live: SectorMetricsResult = {
    sector,
    resolvedSectorKey: sectorKey,
    evEbitda: liveEvEbitda ?? fallback.evEbitda,
    evRevenue: liveEvRevenue ?? fallback.evRevenue,
    unleveredBeta: hasLiveBeta
      ? toUnleveredBeta(liveLeveredBeta!)
      : fallback.unleveredBeta,
    source: hasLiveMultiples || hasLiveBeta ? 'live' : 'fallback',
    fetchedAt: nowIso(),
    fmpSector,
    sampleSize: Math.max(evEbitdaSamples.length, leveredBetas.length),
  };

  cache.sector.set(cacheKey, { value: live, expiresAt: Date.now() + CACHE_TTL_MS });
  return live;
}

/** Clears in-memory caches (useful in tests). */
export function clearFinancialDataCache(): void {
  cache.riskFree = null;
  cache.sector.clear();
}

/** Loads risk-free rate and sector metrics in parallel. */
export async function fetchMarketParameters(sector: string): Promise<{
  riskFreeRate: RiskFreeRateResult;
  sectorMetrics: SectorMetricsResult;
}> {
  const [riskFreeRate, sectorMetrics] = await Promise.all([
    fetchRiskFreeRate(),
    fetchSectorMetrics(sector),
  ]);
  return { riskFreeRate, sectorMetrics };
}
