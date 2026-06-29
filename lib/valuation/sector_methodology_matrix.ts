/**
 * Immutable sector methodology matrix — spec name: sectorConfigs.
 * Baseline weights, multiple guardrails, DCF growth caps, strategy selection.
 */
export type ValuationStrategyKind =
  | 'historical_blended_ebitda'
  | 'current_run_rate_revenue';

export interface SectorMethodologyConfig {
  strategy: ValuationStrategyKind;
  weightEbitda: number;
  weightDcf: number;
  weightRev: number;
  minMultiple: number;
  maxMultiple: number;
  /** Decimal cap (e.g. 0.25 = 25%). */
  growthCap: number;
  /** Institutional max historical EBITDA / revenue — anti-anomaly winsorization. */
  maxHistoricalMargin: number;
  /** Max EBITDA multiple spread at QS=0 before quality tightening (×). */
  maxMultipleSpread: number;
  /** Max WACC spread at QS=0 before quality tightening (percentage points). */
  maxWaccSpreadPp: number;
  /** Sub-sector injected WACC baseline (%). When set, replaces rf+erp+crp core in WACC assembly. */
  waccBasePct?: number;
  /** When true, EV blend uses weightDcf/weightEbitda/weightRev instead of institutional 70/30. */
  useConfiguredBlendWeights?: boolean;
}

export const sectorConfigs = {
  industry: {
    strategy: 'historical_blended_ebitda',
    weightEbitda: 0.6,
    weightDcf: 0.4,
    weightRev: 0.0,
    minMultiple: 5.0,
    maxMultiple: 7.5,
    growthCap: 0.25,
    maxHistoricalMargin: 0.22,
    maxMultipleSpread: 1.25,
    maxWaccSpreadPp: 1.5625,
  },
  services: {
    strategy: 'historical_blended_ebitda',
    weightEbitda: 0.7,
    weightDcf: 0.3,
    weightRev: 0.0,
    minMultiple: 4.0,
    maxMultiple: 6.0,
    growthCap: 0.15,
    maxHistoricalMargin: 0.28,
    maxMultipleSpread: 1.0,
    maxWaccSpreadPp: 1.25,
  },
  saas: {
    strategy: 'current_run_rate_revenue',
    weightEbitda: 0.0,
    weightDcf: 0.4,
    weightRev: 0.6,
    minMultiple: 4.0,
    maxMultiple: 8.0,
    growthCap: 0.6,
    maxHistoricalMargin: 0.35,
    maxMultipleSpread: 1.5,
    maxWaccSpreadPp: 2.0,
  },
  real_estate: {
    strategy: 'historical_blended_ebitda',
    weightEbitda: 0.25,
    weightDcf: 0.35,
    weightRev: 0.0,
    minMultiple: 0.8,
    maxMultiple: 2.0,
    growthCap: 0.1,
    maxHistoricalMargin: 0.4,
    maxMultipleSpread: 0.6,
    maxWaccSpreadPp: 1.0,
  },
  /** קמעונאות ומסחר — thin margins, volume-driven, multiplier-heavy. */
  retail_unified: {
    strategy: 'historical_blended_ebitda',
    weightEbitda: 0.65,
    weightDcf: 0.35,
    weightRev: 0.0,
    minMultiple: 3.0,
    maxMultiple: 8.0,
    growthCap: 0.2,
    maxHistoricalMargin: 0.18,
    maxMultipleSpread: 1.1,
    maxWaccSpreadPp: 1.35,
  },
  /**
   * מזון ומסעדנות (CBS ענף 56) — cash-intensive, high failure rate;
   * EBITDA multiples 3.5–6.5×, never hotel band.
   */
  food_service: {
    strategy: 'historical_blended_ebitda',
    weightEbitda: 0.6,
    weightDcf: 0.4,
    weightRev: 0.0,
    minMultiple: 2.5,
    maxMultiple: 9.0,
    growthCap: 0.25,
    maxHistoricalMargin: 0.22,
    maxMultipleSpread: 1.2,
    maxWaccSpreadPp: 1.5,
  },
  /** מלונאות ואירוח — lodging only; RevPAR-driven, capex-heavy. */
  hospitality: {
    strategy: 'historical_blended_ebitda',
    weightEbitda: 0.45,
    weightDcf: 0.55,
    weightRev: 0.0,
    minMultiple: 5.0,
    maxMultiple: 14.0,
    growthCap: 0.1,
    maxHistoricalMargin: 0.3,
    maxMultipleSpread: 1.4,
    maxWaccSpreadPp: 1.5,
  },
} as const satisfies Record<string, SectorMethodologyConfig>;

/** @alias sectorConfigs */
export const SECTOR_METHODOLOGY_MATRIX = sectorConfigs;

export type SectorMethodologyKey = keyof typeof sectorConfigs;

export function normalizeMethodologyWeights(
  config: Pick<SectorMethodologyConfig, 'weightDcf' | 'weightEbitda' | 'weightRev'>,
): { dcf: number; ebitda: number; rev: number } {
  const sum = config.weightDcf + config.weightEbitda + config.weightRev;
  if (sum <= 0) return { dcf: 0.5, ebitda: 0.5, rev: 0 };
  return {
    dcf: config.weightDcf / sum,
    ebitda: config.weightEbitda / sum,
    rev: config.weightRev / sum,
  };
}

export function getSectorMethodologyConfig(
  key: SectorMethodologyKey,
): SectorMethodologyConfig {
  return sectorConfigs[key];
}

/** Cap user growth % to sector growthCap (decimal). */
export function capGrowthPctForMethodology(
  growthPct: number,
  config: SectorMethodologyConfig,
): number {
  return Math.min(growthPct, config.growthCap * 100);
}
