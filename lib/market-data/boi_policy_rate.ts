/**
 * Bank of Israel policy rate (round 4, credit chapter). Same official source as the risk-free
 * rate in damodaran_2026.ts (the Bank of Israel SDMX server, edge.boi.gov.il), series
 * MNT_RIB_BOI_D (daily, percent). Read on 18.11.2026; the last observation is the value below.
 *
 * Prime in Israel is the Bank of Israel rate plus 1.5 points (PRIME_SPREAD_OVER_BOI_PP).
 * To refresh: fetch the URL below with ?startperiod=YYYY-MM-DD&format=csv and take the last row.
 */
export const BOI_POLICY_RATE = {
  /** Percent. */
  valuePct: 3.25,
  /** Date of the observation. */
  dataDate: '2026-11-17',
  downloaded: '2026-11-18',
  series: 'BOI.STATISTICS/BR MNT_RIB_BOI_D',
  url: 'https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS/BR/1.0/MNT_RIB_BOI_D',
  verified: true,
} as const;

/** Prime = Bank of Israel rate + 1.5 points. */
export const PRIME_SPREAD_OVER_BOI_PP = 1.5;

export function primeRatePct(boiRatePct: number = BOI_POLICY_RATE.valuePct): number {
  return Math.round((boiRatePct + PRIME_SPREAD_OVER_BOI_PP) * 100) / 100;
}
