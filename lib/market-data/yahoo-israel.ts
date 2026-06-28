/**
 * Fetches live EV/EBITDA multiples for Israeli public companies via Yahoo Finance.
 * Used to calibrate private company multiples with a liquidity discount.
 */

export interface YahooIsraelSnapshot {
  ticker: string;
  name: string;
  industry: string;
  evEbitda: number | null;
  evRevenue: number | null;
  marketCap: number | null;
  fetchedAt: string;
}

// Top Israeli public companies by sector (NASDAQ/NYSE listed)
const ISRAEL_TICKERS: { ticker: string; industry: string; name: string }[] = [
  { ticker: 'NICE',  industry: 'saas',                  name: 'NICE Systems' },
  { ticker: 'MNDY',  industry: 'saas',                  name: 'Monday.com' },
  { ticker: 'WIX',   industry: 'saas',                  name: 'Wix' },
  { ticker: 'CHKP',  industry: 'cyber',                  name: 'Check Point' },
  { ticker: 'CYBR',  industry: 'cyber',                  name: 'CyberArk' },
  { ticker: 'SITO',  industry: 'cyber',                  name: 'SentinelOne IL' },
  { ticker: 'TEVA',  industry: 'healthtech',             name: 'Teva' },
  { ticker: 'DRIO',  industry: 'healthtech',             name: 'DarioHealth' },
  { ticker: 'ESLT',  industry: 'defense',                name: 'Elbit Systems' },
  { ticker: 'ISAS',  industry: 'defense',                name: 'Israel Aerospace' },
  { ticker: 'ENLT',  industry: 'energy',                 name: 'Enlight Renewable' },
  { ticker: 'FORTY', industry: 'fintech',                name: 'Formula Systems' },
];

export async function fetchYahooIsraelMultiples(): Promise<YahooIsraelSnapshot[]> {
  const results: YahooIsraelSnapshot[] = [];

  for (const company of ISRAEL_TICKERS) {
    try {
      const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${company.ticker}?modules=defaultKeyStatistics,summaryDetail`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;

      const data = await res.json();
      const stats = data?.quoteSummary?.result?.[0]?.defaultKeyStatistics;

      results.push({
        ticker: company.ticker,
        name: company.name,
        industry: company.industry,
        evEbitda: stats?.enterpriseToEbitda?.raw ?? null,
        evRevenue: stats?.enterpriseToRevenue?.raw ?? null,
        marketCap: stats?.enterpriseValue?.raw ?? null,
        fetchedAt: new Date().toISOString(),
      });
    } catch {
      console.warn(`[yahoo] Failed to fetch ${company.ticker}`);
    }
  }

  return results;
}

export function computeIsraelMedianByIndustry(
  snapshots: YahooIsraelSnapshot[],
): Record<string, { evEbitda: number; evRevenue: number; count: number }> {
  const grouped: Record<string, number[]> = {};
  const groupedRev: Record<string, number[]> = {};

  for (const s of snapshots) {
    if (s.evEbitda && s.evEbitda > 0 && s.evEbitda < 100) {
      grouped[s.industry] = [...(grouped[s.industry] ?? []), s.evEbitda];
    }
    if (s.evRevenue && s.evRevenue > 0) {
      groupedRev[s.industry] = [...(groupedRev[s.industry] ?? []), s.evRevenue];
    }
  }

  const result: Record<string, { evEbitda: number; evRevenue: number; count: number }> = {};
  for (const industry of Object.keys(grouped)) {
    const vals = grouped[industry].sort((a, b) => a - b);
    const revVals = groupedRev[industry]?.sort((a, b) => a - b) ?? [1.5];
    const mid = Math.floor(vals.length / 2);
    const midRev = Math.floor(revVals.length / 2);
    result[industry] = {
      evEbitda: vals[mid],
      evRevenue: revVals[midRev] ?? 1.5,
      count: vals.length,
    };
  }

  return result;
}
