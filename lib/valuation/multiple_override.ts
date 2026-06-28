import type { EquifySectorKey, ValuationInputs } from '../valuation';
import type { SectorMethodologyConfig } from './sector_methodology_matrix';
import {
  resolveSubSectorDefaultMultiple,
  type SubSectorMarketMultiples,
} from './sub_sector_default_multiple';

export interface ActiveMultipleResolution {
  /** Multiple applied to the EBITDA / revenue multiples leg. */
  activeMultiple: number;
  /** Sub-sector configured default (×) — shown in Step 2 when not manual. */
  automaticMultiple: number;
  /** Same as {@link automaticMultiple} — institutional / insight-card baseline. */
  configuredDefaultMultiple: number;
  isManual: boolean;
}

/** Reads sub-sector default multiple — aligned with Step 1 Industry Insight Card. */
export function resolveConfiguredDefaultMultiple(
  sector: EquifySectorKey | undefined,
  subSector: string | undefined,
  sectorConfig: SectorMethodologyConfig,
  market?: Partial<SubSectorMarketMultiples>,
): number {
  return resolveSubSectorDefaultMultiple({
    sector,
    subSector,
    sectorConfig,
    market,
  });
}

/**
 * Interceptor — substitutes only the multiples-leg baseline.
 * Manual: expert `customMultiple`. Automatic: sub-sector configured default (×).
 */
export function resolveActiveEffectiveMultiple(params: {
  inputs: Pick<
    ValuationInputs,
    | 'isManualMultiple'
    | 'customMultiple'
    | 'sector'
    | 'subSector'
    | 'marketEvEbitda'
    | 'marketEvRevenue'
  >;
  sectorConfig: SectorMethodologyConfig;
}): ActiveMultipleResolution {
  const { inputs, sectorConfig } = params;
  const market =
    inputs.marketEvEbitda != null || inputs.marketEvRevenue != null
      ? {
          evEbitda: inputs.marketEvEbitda,
          evRevenue: inputs.marketEvRevenue,
        }
      : undefined;
  const configuredDefaultMultiple = resolveConfiguredDefaultMultiple(
    inputs.sector,
    inputs.subSector,
    sectorConfig,
    market,
  );

  const isManual = Boolean(
    inputs.isManualMultiple &&
      inputs.customMultiple != null &&
      Number.isFinite(inputs.customMultiple) &&
      inputs.customMultiple > 0,
  );

  const activeMultiple = isManual
    ? (inputs.customMultiple as number)
    : configuredDefaultMultiple;

  return {
    activeMultiple,
    automaticMultiple: configuredDefaultMultiple,
    configuredDefaultMultiple,
    isManual,
  };
}
