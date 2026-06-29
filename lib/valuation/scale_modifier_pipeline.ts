import type { EquifyLifecycleKey, ValuationInputs } from '../valuation';
import { resolveLifecycleStage } from './capm_wacc';
import type { ValuationStrategyKind } from './sector_methodology_matrix';
import type { EngineBlendWeights } from './valuation_weights_registry';

/** Operating-scale tier — derived from lifecycle + revenue run-rate (₪K). */
export type ScaleTier = 'smb' | 'growth' | 'enterprise';

export interface ScaleBlendTargets {
  dcf: number;
  multiple: number;
}

export interface ScaleModifierMatrixRow {
  tier: ScaleTier;
  /** Additional WACC size-risk overlay (pp) — SMB +3..+5, enterprise optimized ≤ 0. */
  waccSizePremiumOverlayPp: { min: number; max: number };
  /** Multiple dampener vs sector baseline (×) — SMB < 1, enterprise ≈ 1. */
  multipleDampener: { min: number; max: number };
  /** Target DCF / multiple blend before sub-sector merge. */
  blendTargets: ScaleBlendTargets;
  /** Strength of tier blend pull (0–1) over sub-sector registry weights. */
  blendMixStrength: number;
}

/** Conditional modifier matrix — lifecycle stage × revenue band. */
export const SCALE_MODIFIER_MATRIX: Record<EquifyLifecycleKey, ScaleModifierMatrixRow> = {
  seed: {
    tier: 'smb',
    waccSizePremiumOverlayPp: { min: 4.0, max: 5.0 },
    multipleDampener: { min: 0.76, max: 0.84 },
    blendTargets: { dcf: 0.3, multiple: 0.7 },
    blendMixStrength: 0.55,
  },
  early: {
    tier: 'smb',
    waccSizePremiumOverlayPp: { min: 3.0, max: 4.5 },
    multipleDampener: { min: 0.8, max: 0.9 },
    blendTargets: { dcf: 0.3, multiple: 0.7 },
    blendMixStrength: 0.5,
  },
  growth: {
    tier: 'growth',
    waccSizePremiumOverlayPp: { min: 0.5, max: 1.5 },
    multipleDampener: { min: 0.92, max: 1.0 },
    blendTargets: { dcf: 0.5, multiple: 0.5 },
    blendMixStrength: 0.3,
  },
  mature: {
    tier: 'enterprise',
    waccSizePremiumOverlayPp: { min: -0.5, max: 0 },
    multipleDampener: { min: 1.0, max: 1.02 },
    blendTargets: { dcf: 0.65, multiple: 0.35 },
    blendMixStrength: 0.45,
  },
};

/** Revenue run-rate thresholds (₪K) for tier elevation / dampening. */
export const SCALE_REVENUE_THRESHOLDS_K = {
  smbMax: 20_000,
  midMarketMin: 20_000,
  enterpriseMin: 120_000,
} as const;

export interface ScaleModifierProfile {
  tier: ScaleTier;
  lifecycleStage: EquifyLifecycleKey;
  revenueK: number;
  revenueScale: number;
  waccSizePremiumOverlayPp: number;
  multipleDampener: number;
  blendTargets: ScaleBlendTargets;
  blendMixStrength: number;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * clamp(t, 0, 1);
}

/** 0 = micro/SMB band, 1 = mid-market / enterprise-scale revenue — linear ₪20M–₪120M. */
function resolveRevenueScale(revenueK: number): number {
  const rev = Math.max(0, revenueK);
  const { smbMax, enterpriseMin } = SCALE_REVENUE_THRESHOLDS_K;
  if (rev <= smbMax) return 0;
  if (rev >= enterpriseMin) return 1;
  return (rev - smbMax) / (enterpriseMin - smbMax);
}

/** Soft tier label for diagnostics — derived from revenue scale, no hard revenue cliffs. */
function resolveTierFromSignals(
  lifecycleStage: EquifyLifecycleKey,
  revenueScale: number,
): ScaleTier {
  if (revenueScale >= 0.85 && lifecycleStage === 'mature') return 'enterprise';
  if (revenueScale >= 0.45) return 'growth';
  if (lifecycleStage === 'mature' && revenueScale > 0.2) return 'growth';
  return 'smb';
}

function resolveSmallCapRow(lifecycleStage: EquifyLifecycleKey): ScaleModifierMatrixRow {
  if (lifecycleStage === 'seed') return SCALE_MODIFIER_MATRIX.seed;
  return SCALE_MODIFIER_MATRIX.early;
}

function interpolateRange(
  range: { min: number; max: number },
  t: number,
  invert = false,
): number {
  const factor = invert ? 1 - t : t;
  return lerp(range.min, range.max, factor);
}

/** Resolve scale modifiers — revenue-linear blend between SMB and mid-market (no hard ₪20M/₪120M cliffs). */
export function resolveScaleModifierProfile(
  inputs: Pick<
    ValuationInputs,
    'lifecycle' | 'lifecycleAdj' | 'rev' | 'revenue2026K'
  >,
): ScaleModifierProfile {
  const lifecycleStage = resolveLifecycleStage(inputs.lifecycle, inputs.lifecycleAdj);
  const revenueK = Math.max(0, inputs.revenue2026K ?? inputs.rev ?? 0);
  const revenueScale = resolveRevenueScale(revenueK);
  const tier = resolveTierFromSignals(lifecycleStage, revenueScale);

  const smallRow = resolveSmallCapRow(lifecycleStage);
  const midRow = SCALE_MODIFIER_MATRIX.growth;
  const matureRow = SCALE_MODIFIER_MATRIX.mature;

  const smallWacc = interpolateRange(smallRow.waccSizePremiumOverlayPp, 0.5, false);
  const midWacc = interpolateRange(midRow.waccSizePremiumOverlayPp, 0.5, false);
  const matureWacc = interpolateRange(matureRow.waccSizePremiumOverlayPp, 1, false);

  const smallDamp = interpolateRange(smallRow.multipleDampener, 0.5, false);
  const midDamp = interpolateRange(midRow.multipleDampener, 0.5, false);
  const matureDamp = interpolateRange(matureRow.multipleDampener, 1, false);

  const smbToMidT = Math.min(revenueScale / 0.85, 1);
  let waccSizePremiumOverlayPp = lerp(smallWacc, midWacc, smbToMidT);
  let multipleDampener = lerp(smallDamp, midDamp, smbToMidT);

  if (lifecycleStage === 'mature' && revenueScale > 0.7) {
    const entT = clamp((revenueScale - 0.7) / 0.3, 0, 1);
    waccSizePremiumOverlayPp = lerp(waccSizePremiumOverlayPp, matureWacc, entT);
    multipleDampener = lerp(multipleDampener, matureDamp, entT);
  }

  const blendTargets: ScaleBlendTargets = {
    dcf: lerp(smallRow.blendTargets.dcf, midRow.blendTargets.dcf, smbToMidT),
    multiple: lerp(
      smallRow.blendTargets.multiple,
      midRow.blendTargets.multiple,
      smbToMidT,
    ),
  };
  const blendMixStrength = lerp(
    smallRow.blendMixStrength,
    midRow.blendMixStrength,
    smbToMidT,
  );

  return {
    tier,
    lifecycleStage,
    revenueK,
    revenueScale,
    waccSizePremiumOverlayPp,
    multipleDampener,
    blendTargets,
    blendMixStrength,
  };
}

function normalizeBlendWeights(weights: EngineBlendWeights): EngineBlendWeights {
  const sum = weights.dcf + weights.ebitda + weights.rev;
  if (sum <= 0) {
    return { dcf: 0.5, ebitda: 0.5, rev: 0 };
  }
  return {
    dcf: weights.dcf / sum,
    ebitda: weights.ebitda / sum,
    rev: weights.rev / sum,
  };
}

/** Merge sub-sector registry weights with tier targets (SMB → multiple-heavy, enterprise → DCF-heavy). */
export function applyScaleAdjustedBlendWeights(
  base: EngineBlendWeights,
  profile: ScaleModifierProfile,
  strategy: ValuationStrategyKind,
): EngineBlendWeights {
  const mix = profile.blendMixStrength;
  const targetDcf = profile.blendTargets.dcf;
  const targetMultiple = profile.blendTargets.multiple;

  if (strategy === 'current_run_rate_revenue') {
    return normalizeBlendWeights({
      dcf: base.dcf * (1 - mix) + targetDcf * mix,
      ebitda: 0,
      rev: base.rev * (1 - mix) + targetMultiple * mix,
    });
  }

  return normalizeBlendWeights({
    dcf: base.dcf * (1 - mix) + targetDcf * mix,
    ebitda: base.ebitda * (1 - mix) + targetMultiple * mix,
    rev: base.rev,
  });
}

/** Apply multiple dampener / enterprise prime coefficient to automatic sector multiple. */
export function applyScaleMultipleDampener(
  multiple: number,
  profile: ScaleModifierProfile,
  floorMultiple: number,
): number {
  return Math.max(floorMultiple, multiple * profile.multipleDampener);
}
