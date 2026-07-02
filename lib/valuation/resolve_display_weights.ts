import type { EquifySectorKey } from '../valuation';
import { normalizeMethodologyWeights } from './sector_methodology_matrix';
import { resolveSectorMethodologyConfig } from './sector_methodology_resolver';
import {
  normalizeRegimeBlendWeights,
  resolveProfitabilityRegime,
  type RegimeBlendWeights,
  type RegimeResolution,
} from './profitability_regime';
import {
  applyScaleAdjustedBlendWeights,
  resolveScaleModifierProfile,
} from './scale_modifier_pipeline';
import {
  resolveValuationBlendWeights,
  type EngineBlendWeights,
} from './valuation_weights_registry';
import type { ValuationStrategyKind } from './sector_methodology_matrix';

export interface DisplayBlendWeights {
  dcf: number;
  ebitdaMultiple: number;
  revenueMultiple: number;
  regimeLabel: string | null;
}

function toRegimeShape(weights: EngineBlendWeights): RegimeBlendWeights {
  return {
    dcf: weights.dcf,
    ebitdaMultiple: weights.ebitda,
    revenueMultiple: weights.rev,
  };
}

function toEngineShape(weights: RegimeBlendWeights): EngineBlendWeights {
  return {
    dcf: weights.dcf,
    ebitda: weights.ebitdaMultiple,
    rev: weights.revenueMultiple,
  };
}

/**
 * Sector / sub-sector base weights — Layer 1 of the blend stack.
 * Prefers injected sub-sector engine defaults (3-leg) when configured;
 * otherwise falls back to the valuation weights registry.
 */
export function getSectorWeights(
  sectorKey: EquifySectorKey | undefined,
  subSectorKey: string | undefined | null,
): RegimeBlendWeights {
  const sectorConfig = resolveSectorMethodologyConfig(sectorKey, subSectorKey ?? undefined);

  if (sectorConfig.useConfiguredBlendWeights) {
    const normalized = normalizeMethodologyWeights(sectorConfig);
    return normalizeRegimeBlendWeights({
      dcf: normalized.dcf,
      ebitdaMultiple: normalized.ebitda,
      revenueMultiple: normalized.rev,
    });
  }

  const engine = resolveValuationBlendWeights({
    subSectorId: subSectorKey ?? undefined,
    strategy: sectorConfig.strategy,
  });
  return normalizeRegimeBlendWeights(toRegimeShape(engine));
}

/**
 * Loss-making compose — shifts sector EBITDA weight and any DCF dampening into Revenue.
 * Damodaran: EBITDA multiples invalid when EBITDA < 0; sector DNA preserved.
 */
export function composeRegimeWithSectorBase(
  sectorBase: RegimeBlendWeights,
  regime: RegimeResolution,
): RegimeBlendWeights {
  if (regime.regime === 'healthy') {
    return normalizeRegimeBlendWeights(sectorBase);
  }

  const factor = regime.regimeDcfFactor;

  if (regime.thinMarginBlendT != null) {
    const lossComposed = composeLossMakingSectorBase(sectorBase, factor);
    const t = regime.thinMarginBlendT;
    return normalizeRegimeBlendWeights({
      dcf: lossComposed.dcf * (1 - t) + sectorBase.dcf * t,
      ebitdaMultiple: lossComposed.ebitdaMultiple * (1 - t) + sectorBase.ebitdaMultiple * t,
      revenueMultiple:
        lossComposed.revenueMultiple * (1 - t) + sectorBase.revenueMultiple * t,
    });
  }

  return composeLossMakingSectorBase(sectorBase, factor);
}

function composeLossMakingSectorBase(
  sectorBase: RegimeBlendWeights,
  regimeDcfFactor: number,
): RegimeBlendWeights {
  const dampenedDcf = sectorBase.dcf * regimeDcfFactor;
  const shiftedFromDcf = sectorBase.dcf - dampenedDcf;
  return normalizeRegimeBlendWeights({
    dcf: dampenedDcf,
    ebitdaMultiple: 0,
    revenueMultiple:
      sectorBase.revenueMultiple + sectorBase.ebitdaMultiple + shiftedFromDcf,
  });
}


/**
 * Engine blend weights — sector base + scale modifier + optional regime overlay.
 * Healthy / pre-financials: byte-identical to pre-regression sector path.
 */
export function resolveEngineBlendWeights(params: {
  sector?: EquifySectorKey;
  subSector?: string;
  strategy: ValuationStrategyKind;
  revenueK: number;
  ebitdaK: number;
  lifecycle?: import('../valuation').EquifyLifecycleKey;
  lifecycleAdj?: number;
  revK: number;
}): { weights: EngineBlendWeights; regime: RegimeResolution; sectorBase: RegimeBlendWeights } {
  const sectorBase = getSectorWeights(params.sector, params.subSector);
  const scaleProfile = resolveScaleModifierProfile({
    lifecycle: params.lifecycle,
    lifecycleAdj: params.lifecycleAdj ?? 0,
    rev: params.revK,
    revenue2026K: params.revenueK,
  });
  const scaledBase = applyScaleAdjustedBlendWeights(
    toEngineShape(sectorBase),
    scaleProfile,
    params.strategy,
  );
  const scaledRegimeShape = normalizeRegimeBlendWeights(toRegimeShape(scaledBase));

  const regime = resolveProfitabilityRegime({
    ebitdaK: params.ebitdaK,
    revenueK: params.revenueK,
  });

  const weights =
    regime.regime === 'healthy'
      ? scaledBase
      : toEngineShape(composeRegimeWithSectorBase(scaledRegimeShape, regime));

  return { weights, regime, sectorBase };
}

/**
 * Single source of truth for displayed blend weights (wizard sidebar + live panel).
 * Layer 1 sector base; Layer 2 regime overlay only after financials + non-healthy regime.
 */
export function resolveDisplayWeights(params: {
  sectorKey: EquifySectorKey | undefined;
  subSectorKey: string | null | undefined;
  financials: { revenueK: number; ebitdaK: number } | null;
  lifecycle?: import('../valuation').EquifyLifecycleKey;
  lifecycleAdj?: number;
}): DisplayBlendWeights {
  const base = getSectorWeights(params.sectorKey, params.subSectorKey);

  if (!params.financials || params.financials.revenueK <= 0) {
    return {
      dcf: base.dcf,
      ebitdaMultiple: base.ebitdaMultiple,
      revenueMultiple: base.revenueMultiple,
      regimeLabel: null,
    };
  }

  const regime = resolveProfitabilityRegime({
    ebitdaK: params.financials.ebitdaK,
    revenueK: params.financials.revenueK,
  });

  if (regime.regime === 'healthy') {
    return {
      dcf: base.dcf,
      ebitdaMultiple: base.ebitdaMultiple,
      revenueMultiple: base.revenueMultiple,
      regimeLabel: null,
    };
  }

  const composed = composeRegimeWithSectorBase(base, regime);
  return {
    dcf: composed.dcf,
    ebitdaMultiple: composed.ebitdaMultiple,
    revenueMultiple: composed.revenueMultiple,
    regimeLabel: regime.labelHe,
  };
}
