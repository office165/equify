/**
 * Live ILS exchange rates from the public provider (open.er-api.com, no key).
 * Used directly on the server (fxService.refreshFxRates) and by /api/exchange-rates,
 * so server code never calls its own HTTP API (no localhost dependency).
 */
export const FX_PROVIDER_URL = 'https://open.er-api.com/v6/latest/ILS';

export interface IlsPerUnitRates {
  /** ILS per 1 unit of foreign currency (e.g. USD: 3.70). */
  USD: number;
  EUR: number;
  GBP: number;
  /** YYYY-MM-DD of the provider's last update. */
  asOfDate: string;
}

function toIsoDate(raw: unknown): string {
  const d = typeof raw === 'string' || typeof raw === 'number' ? new Date(raw) : new Date();
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}

/** Throws on network or payload errors; callers fall back to static rates. */
export async function fetchIlsPerUnitRates(timeoutMs = 4_000): Promise<IlsPerUnitRates> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(FX_PROVIDER_URL, { signal: controller.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`FX provider HTTP ${res.status}`);
    const data = (await res.json()) as {
      rates?: Record<string, number>;
      time_last_update_utc?: string;
    };
    const usd = data.rates?.USD;
    const eur = data.rates?.EUR;
    const gbp = data.rates?.GBP;
    if (!usd || !eur || !(usd > 0) || !(eur > 0)) throw new Error('FX provider payload invalid');
    return {
      USD: 1 / usd,
      EUR: 1 / eur,
      GBP: gbp && gbp > 0 ? 1 / gbp : 3.8,
      asOfDate: toIsoDate(data.time_last_update_utc),
    };
  } finally {
    clearTimeout(timer);
  }
}
