import type { ReportingCurrencyCode } from './formatCurrency';
import { normalizeCurrencyCode } from './formatCurrency';
import { fetchIlsPerUnitRates } from './fx_provider';

export type FxCurrency = ReportingCurrencyCode | 'GBP';

/** Wizard financial inputs are modeled in ILS (₪K storage). */
export const VALUATION_BASE_CURRENCY: FxCurrency = 'ILS';

/**
 * Static fallback — 1 USD = 3.00 ILS, 1 EUR = 3.42 ILS, 1 GBP = 3.80 ILS.
 * Values are multipliers: amount_ILS × rate → amount_in_target (same numeric scale).
 */
export const STATIC_FX_FROM_ILS: Readonly<Record<FxCurrency, number>> = {
  ILS: 1,
  USD: 1 / 3.0,
  EUR: 1 / 3.42,
  GBP: 1 / 3.8,
};

export type FxRateSource = 'live' | 'fallback' | 'cache';

/**
 * Date the static fallback rates were last set (commit e2f08a5, 2026-06-29).
 * Shown in the report as the date of the fallback rate, never as "today".
 */
export const FX_FALLBACK_AS_OF = '2026-06-29';

export interface FxRatesSnapshot {
  /** ILS → target currency multipliers (same unit scale, e.g. ₪K → $K). */
  fromIls: Record<FxCurrency, number>;
  source: FxRateSource;
  /** YYYY-MM-DD of the rates (provider date for live, FX_FALLBACK_AS_OF for fallback). */
  asOf: string;
  fetchedAt: number;
}

/** True when the snapshot holds the static fallback rates (not a live quote). */
export function isFallbackFxSnapshot(rates: Pick<FxRatesSnapshot, 'source' | 'asOf'>): boolean {
  return rates.source === 'fallback' || rates.asOf === 'static';
}

const EXCHANGE_RATES_API = '/api/exchange-rates';
const CACHE_TTL_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 4_000;

let cachedRates: FxRatesSnapshot = buildFallbackSnapshot();

function buildFallbackSnapshot(): FxRatesSnapshot {
  return {
    fromIls: { ...STATIC_FX_FROM_ILS },
    source: 'fallback',
    asOf: FX_FALLBACK_AS_OF,
    fetchedAt: Date.now(),
  };
}

function isFresh(snapshot: FxRatesSnapshot): boolean {
  return Date.now() - snapshot.fetchedAt < CACHE_TTL_MS;
}

interface ExchangeRatesApiResponse {
  USD: number;
  EUR: number;
  GBP: number;
  source: 'live' | 'fallback';
  fetchedAt: string;
  asOf?: string;
}

function parseExchangeRatesPayload(payload: unknown): FxRatesSnapshot | null {
  if (!payload || typeof payload !== 'object') return null;
  const body = payload as ExchangeRatesApiResponse;
  const { USD, EUR, GBP, source, fetchedAt, asOf } = body;
  if (!Number.isFinite(USD) || !Number.isFinite(EUR) || USD <= 0 || EUR <= 0) {
    return null;
  }

  const gbpIlsPerUnit =
    Number.isFinite(GBP) && GBP > 0 ? GBP : 1 / STATIC_FX_FROM_ILS.GBP;

  return {
    fromIls: {
      ILS: 1,
      USD: 1 / USD,
      EUR: 1 / EUR,
      GBP: 1 / gbpIlsPerUnit,
    },
    source: source === 'live' ? 'live' : 'fallback',
    asOf:
      source === 'live'
        ? asOf || new Date(fetchedAt).toISOString().slice(0, 10)
        : FX_FALLBACK_AS_OF,
    fetchedAt: new Date(fetchedAt).getTime() || Date.now(),
  };
}

/** Browser only: same-origin API route. */
function resolveExchangeRatesUrl(): string {
  return EXCHANGE_RATES_API;
}

/** Tests only: back to the static fallback (npm test runs the suites twice in one process). */
export function resetFxCacheForTests(): void {
  cachedRates = buildFallbackSnapshot();
}

/** Synchronous read — cached live rates or static fallback (never blocks UI). */
export function getCachedFxRates(): FxRatesSnapshot {
  return cachedRates;
}

/** ₪K → reporting-currency K multiplier (1 when target is ILS). */
export function getIlsToReportingMultiplier(
  target: ReportingCurrencyCode | string | undefined,
  rates: FxRatesSnapshot = cachedRates,
): number {
  const code = normalizeCurrencyCode(target);
  return rates.fromIls[code] ?? STATIC_FX_FROM_ILS[code] ?? 1;
}

export function convertIlsKToReportingK(
  amountK: number,
  target: ReportingCurrencyCode | string | undefined,
  rates?: FxRatesSnapshot,
): number {
  if (!Number.isFinite(amountK)) return amountK;
  return amountK * getIlsToReportingMultiplier(target, rates);
}

/** Fetch latest FX via server API route; falls back silently on failure. */
export async function refreshFxRates(force = false): Promise<FxRatesSnapshot> {
  if (!force && isFresh(cachedRates) && cachedRates.source !== 'fallback') {
    return cachedRates;
  }

  // Server: call the provider directly (no HTTP round trip to our own API, no localhost).
  if (typeof window === 'undefined') {
    try {
      const live = await fetchIlsPerUnitRates(FETCH_TIMEOUT_MS);
      cachedRates = {
        fromIls: { ILS: 1, USD: 1 / live.USD, EUR: 1 / live.EUR, GBP: 1 / live.GBP },
        source: 'live',
        asOf: live.asOfDate,
        fetchedAt: Date.now(),
      };
      return cachedRates;
    } catch (err) {
      console.warn('[fxService] live FX unavailable, using fallback rates', err instanceof Error ? err.message : err);
      if (!isFresh(cachedRates) || cachedRates.source === 'fallback') {
        cachedRates = buildFallbackSnapshot();
      }
      return cachedRates;
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(resolveExchangeRatesUrl(), {
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Exchange rates HTTP ${res.status}`);
    const parsed = parseExchangeRatesPayload(await res.json());
    if (!parsed) throw new Error('Exchange rates payload invalid');
    cachedRates = { ...parsed, source: parsed.source === 'live' ? 'cache' : 'fallback' };
    return cachedRates;
  } catch {
    if (!isFresh(cachedRates)) {
      cachedRates = buildFallbackSnapshot();
    }
    return cachedRates;
  } finally {
    clearTimeout(timer);
  }
}

/** Warm cache at app boot — safe to fire-and-forget. */
export function prefetchFxRates(): void {
  void refreshFxRates();
}
