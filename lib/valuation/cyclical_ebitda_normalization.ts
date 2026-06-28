import type { EquifySectorKey, ValuationInputs } from '../valuation';
import {
  getInstitutionalSubSectorConfig,
  getSubSectorEngineDefaults,
} from '../constants/industry_config';
import { resolveCurrentYearEbitdaK } from './backlog_metrics';

function isPositiveFinite(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

/** True when sub-sector metadata requests cyclical EBITDA normalization. */
export function shouldApplyCyclicalEbitdaNormalization(
  sector: EquifySectorKey | undefined,
  subSector: string | undefined,
): boolean {
  if (!sector || !subSector) return false;

  const engine = getSubSectorEngineDefaults(sector, subSector);
  if (engine?.isCyclicalNormalized === true) return true;

  const institutional = getInstitutionalSubSectorConfig(sector, subSector);
  return institutional?.isCyclicalNormalized === true;
}

/**
 * 3-year cyclical EBITDA baseline for multiplier leg only.
 * (EBITDA 2024 + EBITDA 2025 + EBITDA 2026) / 3 when both historical years are present.
 * Falls back to current-year EBITDA when 2024 or 2025 is empty/zero.
 */
export function resolveCyclicalNormalizedEbitdaBaseline(
  inputs: Pick<
    ValuationInputs,
    'ebitda2024K' | 'ebitda2025K' | 'ebitda2026K' | 'rev' | 'margin'
  >,
): number {
  const currentYearEbitdaK = resolveCurrentYearEbitdaK(inputs);
  const y2024 = inputs.ebitda2024K;
  const y2025 = inputs.ebitda2025K;

  if (!isPositiveFinite(y2024) || !isPositiveFinite(y2025)) {
    return currentYearEbitdaK;
  }

  const y2026 = isPositiveFinite(inputs.ebitda2026K)
    ? inputs.ebitda2026K
    : currentYearEbitdaK;

  return (y2024 + y2025 + y2026) / 3;
}

/**
 * Interceptor — overrides multiplier EBITDA base for cyclical sub-sectors only.
 * Non-cyclical sectors pass through unchanged.
 */
export function resolveEbitdaBaseForMultipleLeg(
  inputs: ValuationInputs,
  defaultBaseEbitdaK: number,
): number {
  if (!shouldApplyCyclicalEbitdaNormalization(inputs.sector, inputs.subSector)) {
    return defaultBaseEbitdaK;
  }
  return resolveCyclicalNormalizedEbitdaBaseline(inputs);
}
