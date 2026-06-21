'use client';

import { useMemo } from 'react';
import type {
  EquifySectorKey,
  ValuationComputed,
  ValuationInputs,
  ValuationScenarios,
} from '../valuation';
import { runValuationEngine } from '../valuation/valuation_engine';
import {
  resolveSectorMethodologyConfig,
  resolveSectorMethodologyKey,
} from '../valuation/sector_methodology_resolver';
import {
  sectorConfigs,
  type SectorMethodologyConfig,
  type SectorMethodologyKey,
  type ValuationStrategyKind,
} from '../valuation/sector_methodology_matrix';

export interface UseValuationResult {
  computed: ValuationComputed;
  scenarios: ValuationScenarios;
  methodologyKey: SectorMethodologyKey;
  sectorConfig: SectorMethodologyConfig;
  strategy: ValuationStrategyKind;
}

/**
 * React hook — runs the config-driven valuation engine whenever inputs change.
 */
export function useValuation(inputs: ValuationInputs): UseValuationResult {
  return useMemo(() => {
    const { computed, scenarios } = runValuationEngine(inputs);
    const sector = inputs.sector ?? ('other' as EquifySectorKey);
    const methodologyKey = resolveSectorMethodologyKey(sector);
    const sectorConfig = resolveSectorMethodologyConfig(sector);

    return {
      computed,
      scenarios,
      methodologyKey,
      sectorConfig,
      strategy: sectorConfig.strategy,
    };
  }, [inputs]);
}

export { sectorConfigs };
