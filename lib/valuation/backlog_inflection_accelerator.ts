import type { ValuationInputs } from '../valuation';
import {
  resolveCurrentYearEbitdaK,
  resolveForwardEbitda2027K,
} from './backlog_valuation';
import {
  normalizeMethodologyWeights,
  type SectorMethodologyConfig,
} from './sector_methodology_matrix';

/** Target blend when backlog inflection is fully engaged. */
export const BACKLOG_INFLECTION_TARGETS = {
  dcf: 0.7,
  ebitda: 0.3,
  rev: 0.0,
} as const;

export interface BacklogInflectionResult {
  /** 0–1 strength of backlog-driven inflection. */
  inflectionIntensity: number;
  acceleratedGrowthPct: number;
  blendWeights: { dcf: number; ebitda: number; rev: number };
  forwardEbitda2027K: number | null;
}

function isPositiveFinite(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Inflection intensity from signed backlog magnitude vs current-year revenue,
 * with a floor when the boolean backlog flag is set.
 */
export function computeInflectionIntensity(
  hasSignificantBacklog: boolean | undefined,
  backlogSignedK: number | undefined,
  revenue2026K: number,
): number {
  let intensity = 0;

  if (hasSignificantBacklog === true) {
    intensity = 0.55;
  }

  if (isPositiveFinite(backlogSignedK) && isPositiveFinite(revenue2026K)) {
    const backlogRatio = backlogSignedK / revenue2026K;
    intensity = Math.max(intensity, Math.min(1, backlogRatio * 1.15));
  }

  return Math.min(1, Math.max(0, intensity));
}

function morphBlendWeights(
  base: { dcf: number; ebitda: number; rev: number },
  intensity: number,
  preserveRev: number,
): { dcf: number; ebitda: number; rev: number } {
  if (intensity <= 0) return base;

  const dcf = lerp(base.dcf, BACKLOG_INFLECTION_TARGETS.dcf, intensity);
  const ebitda = lerp(base.ebitda, BACKLOG_INFLECTION_TARGETS.ebitda, intensity);
  const rev = lerp(base.rev, preserveRev, intensity);
  const sum = dcf + ebitda + rev;
  if (sum <= 0) return base;

  return { dcf: dcf / sum, ebitda: ebitda / sum, rev: rev / sum };
}

function deriveForwardEbitdaFromBacklog(params: {
  revenue2026K: number;
  marginPct: number;
  normalizedOwnerSalaryK: number;
  backlogSignedK: number;
}): number {
  const { revenue2026K, marginPct, normalizedOwnerSalaryK, backlogSignedK } = params;
  const recognitionRate = 0.85;
  const forwardRevK = revenue2026K + backlogSignedK * recognitionRate;
  return forwardRevK * (marginPct / 100) + normalizedOwnerSalaryK;
}

/**
 * Backlog Inflection Accelerator — morphs sector baseline weights toward DCF-heavy
 * inflection, lifts DCF growth toward backlog-implied run-rate, and resolves 2027F EBITDA.
 *
 * Applies ONLY to industry/services (historical_blended_ebitda). Never SaaS.
 */
export function applyBacklogInflectionAccelerator(params: {
  sectorConfig: SectorMethodologyConfig;
  inputs: Pick<
    ValuationInputs,
    | 'hasSignificantBacklog'
    | 'backlogSignedK'
    | 'growth'
    | 'rev'
    | 'margin'
    | 'revenue2026K'
    | 'ebitda2027K'
    | 'ebitda2026K'
    | 'normalizedOwnerSalary'
  >;
  cappedGrowthPct: number;
}): BacklogInflectionResult {
  const { sectorConfig, inputs, cappedGrowthPct } = params;
  const baseWeights = normalizeMethodologyWeights(sectorConfig);

  if (sectorConfig.strategy === 'current_run_rate_revenue') {
    return {
      inflectionIntensity: 0,
      acceleratedGrowthPct: cappedGrowthPct,
      blendWeights: baseWeights,
      forwardEbitda2027K: null,
    };
  }

  const revenue2026K = inputs.revenue2026K ?? inputs.rev ?? 0;
  const currentYearEbitdaK = resolveCurrentYearEbitdaK(inputs);
  const explicit2027 = resolveForwardEbitda2027K(inputs);

  const intensity = computeInflectionIntensity(
    inputs.hasSignificantBacklog,
    inputs.backlogSignedK,
    revenue2026K,
  );

  const blendWeights = morphBlendWeights(
    baseWeights,
    intensity,
    sectorConfig.weightRev,
  );

  const backlogSignedK = inputs.backlogSignedK ?? 0;
  const backlogImpliedGrowthPct =
    isPositiveFinite(backlogSignedK) && isPositiveFinite(revenue2026K)
      ? (backlogSignedK / revenue2026K) * 100 * 0.4
      : 0;

  // Inflection Accelerator changes WEIGHTING methodology only — sector growth ceiling is unchanged.
  const growthCapPct = sectorConfig.growthCap * 100;
  const acceleratedGrowthPct = Math.min(
    growthCapPct,
    cappedGrowthPct + intensity * backlogImpliedGrowthPct,
  );

  let forwardEbitda2027K: number | null = null;
  if (intensity > 0) {
    if (isPositiveFinite(explicit2027)) {
      forwardEbitda2027K = explicit2027;
    } else if (isPositiveFinite(backlogSignedK)) {
      forwardEbitda2027K = deriveForwardEbitdaFromBacklog({
        revenue2026K,
        marginPct: inputs.margin,
        normalizedOwnerSalaryK: inputs.normalizedOwnerSalary ?? 0,
        backlogSignedK,
      });
    } else if (inputs.hasSignificantBacklog === true) {
      forwardEbitda2027K = currentYearEbitdaK;
    }
  }

  return {
    inflectionIntensity: intensity,
    acceleratedGrowthPct,
    blendWeights,
    forwardEbitda2027K,
  };
}
