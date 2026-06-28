import type { ReportingCurrencyCode } from './formatCurrency';
import { normalizeCurrencyCode } from './formatCurrency';

export type FxCurrency = ReportingCurrencyCode;

/** Wizard financial inputs are modeled in ILS (₪K storage). */
export const VALUATION_BASE_CURRENCY: FxCurrency = 'ILS';

/**
 * Static fallback — 1 USD = 3.75 ILS, 1 EUR = 4.05 ILS.
 * Values are multipliers: amount_ILS × rate → amount_in_target (same numeric scale).
 */
export const STATIC_FX_FROM_ILS: Readonly<Record<FxCurrency, number>> = {
  ILS: 1,
  USD: 1 / 3.75,
  EUR: 1 / 4.05,
};

export type FxRateSource = 'live' | 'fallback' | 'cache';

export interface FxRatesSnapshot {
  /** ILS → target currency multipliers (same unit scale, e.g. ₪K → $K). */
  fromIls: Record<FxCurrency, number>;
  source: FxRateSource;
  asOf: string;
  fetchedAt: number;
}

const FRANKFURTER_URL =
  'https://api.frankfurter.app/latest?from=ILS&to=USD,EUR';
const CACHE_TTL_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 4_000;

let cachedRates: FxRatesSnapshot = buildFallbackSnapshot();

function buildFallbackSnapshot(): FxRatesSnapshot {
  return {
    fromIls: { ...STATIC_FX_FROM_ILS },
    source: 'fallback',
    asOf: 'static',
    fetchedAt: Date.now(),
  };
}

function isFresh(snapshot: FxRatesSnapshot): boolean {
  return Date.now() - snapshot.fetchedAt < CACHE_TTL_MS;
}

function parseFrankfurterPayload(payload: unknown): FxRatesSnapshot | null {
  if (!payload || typeof payload !== 'object') return null;
  const body = payload as { base?: string; date?: string; rates?: Record<string, number> };
  if (body.base !== 'ILS' || !body.rates) return null;

  const usd = body.rates.USD;
  const eur = body.rates.EUR;
  if (!Number.isFinite(usd) || !Number.isFinite(eur) || usd <= 0 || eur <= 0) {
    return null;
  }

  return {
    fromIls: { ILS: 1, USD: usd, EUR: eur },
    source: 'live',
    asOf: typeof body.date === 'string' ? body.date : 'live',
    fetchedAt: Date.now(),
  };
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

/** Fetch latest FX from Frankfurter; falls back silently on failure. */
export async function refreshFxRates(force = false): Promise<FxRatesSnapshot> {
  if (!force && isFresh(cachedRates) && cachedRates.source !== 'fallback') {
    return cachedRates;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(FRANKFURTER_URL, {
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Frankfurter HTTP ${res.status}`);
    const parsed = parseFrankfurterPayload(await res.json());
    if (!parsed) throw new Error('Frankfurter payload invalid');
    cachedRates = { ...parsed, source: 'cache' };
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
