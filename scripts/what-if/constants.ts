/**
 * What-if constants (analysis only, not used by production code).
 * Rule for this round: no web search. Values come from constants already in the code;
 * a value that is not in the code is marked MISSING_SOURCE and must be checked before use.
 */
import type { EquifySectorKey } from '../../lib/valuation';

export const MISSING_SOURCE = 'חסר מקור';

/** Israel country risk premium (pp). In code: lib/pdf-template/map-from-wizard.ts:190, label "Damodaran Israel". */
export const ISRAEL_CRP = {
  valuePp: 1.6,
  source: 'lib/pdf-template/map-from-wizard.ts:190 (תווית Damodaran Israel)',
  asOf: MISSING_SOURCE,
} as const;

/** Long-run terminal growth (same as production TERMINAL_GROWTH_RATE). */
export const TERMINAL_G = 0.025;

/** Minimum WACC minus g spread for uncapped Gordon (guards against blow-ups). */
export const T1_MIN_SPREAD = 0.03;

/** Year-1 growth caps for G1 (percent). From the round 1 brief. */
export const G1_SECTOR_CAP_PCT: Record<EquifySectorKey, number> = {
  saas: 25, fintech: 25, cyber: 25,
  health: 15, energy: 15,
  hospitality: 10, services: 10, industry: 10, retail_unified: 10, food_service: 10,
  defense_aerospace: 10, real_estate: 10, other: 10,
};

/**
 * Sector target D/E (market value) for W1 weights.
 * Not in the code: values below are Claude's recollection of Damodaran industry averages
 * (global, Jan 2025 dataset) and are marked MISSING_SOURCE. Check against
 * pages.stern.nyu.edu/~adamodar before any production use.
 */
export const SECTOR_TARGET_DE: Record<EquifySectorKey, { de: number; source: string }> = {
  saas: { de: 0.05, source: MISSING_SOURCE },
  fintech: { de: 0.15, source: MISSING_SOURCE },
  cyber: { de: 0.05, source: MISSING_SOURCE },
  health: { de: 0.15, source: MISSING_SOURCE },
  services: { de: 0.2, source: MISSING_SOURCE },
  industry: { de: 0.25, source: MISSING_SOURCE },
  retail_unified: { de: 0.3, source: MISSING_SOURCE },
  food_service: { de: 0.25, source: MISSING_SOURCE },
  hospitality: { de: 0.4, source: MISSING_SOURCE },
  energy: { de: 0.8, source: MISSING_SOURCE },
  defense_aerospace: { de: 0.2, source: MISSING_SOURCE },
  real_estate: { de: 0.7, source: MISSING_SOURCE },
  other: { de: 0.25, source: MISSING_SOURCE },
};

/** EV/Sales ranges for R1: ISRAEL_MULTIPLES_2026[*].evSales in lib/valuation/multiples.ts (already in code). */
export const R1_SOURCE = 'lib/valuation/multiples.ts ISRAEL_MULTIPLES_2026.evSales';
