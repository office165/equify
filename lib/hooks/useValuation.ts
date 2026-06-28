'use client';

import { useEffect, useMemo, useState } from 'react';
import type {
  EquifySectorKey,
  ValuationComputed,
  ValuationInputs,
  ValuationScenarios,
} from '../valuation';
import { runValuationEngine } from '../valuation/valuation_engine';
import { applyReportingFxLayer } from '../valuation/apply_reporting_fx';
import type { ReportingCurrencyCode } from '../utils/formatCurrency';
import {
  getCachedFxRates,
  refreshFxRates,
  type FxRatesSnapshot,
} from '../utils/fxService';
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
  calibrationWarnings: string[];
}

/**
 * React hook — runs the config-driven valuation engine whenever inputs change.
 * Manual multiple overrides (`customMultiple` + `isManualMultiple`) trigger instant recomputation.
 * Applies reporting-currency FX at the presentation layer (engine stays in ILS ₪K).
 */
export function useValuation(
  inputs: ValuationInputs,
  reportingCurrency: ReportingCurrencyCode = 'ILS',
): UseValuationResult {
  const [fxRates, setFxRates] = useState<FxRatesSnapshot>(() => getCachedFxRates());

  useEffect(() => {
    let cancelled = false;
    void refreshFxRates().then((rates) => {
      if (!cancelled) setFxRates(rates);
    });
    return () => {
      cancelled = true;
    };
  }, [reportingCurrency]);

  return useMemo(() => {
    const { computed: baseComputed, scenarios: baseScenarios } = runValuationEngine(inputs);
    const { computed, scenarios } = applyReportingFxLayer(
      baseComputed,
      baseScenarios,
      reportingCurrency,
      fxRates,
    );
    const sector = inputs.sector ?? ('other' as EquifySectorKey);
    const methodologyKey = resolveSectorMethodologyKey(sector, inputs.subSector);
    const sectorConfig = resolveSectorMethodologyConfig(sector, inputs.subSector);

    return {
      computed,
      scenarios,
      methodologyKey,
      sectorConfig,
      strategy: sectorConfig.strategy,
      calibrationWarnings: computed.calibrationWarnings,
    };
  }, [fxRates, inputs, reportingCurrency]);
}

export { sectorConfigs };
