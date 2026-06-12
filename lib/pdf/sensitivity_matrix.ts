import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import { computeEnterpriseValue } from './dcf_projection';

const WACC_DELTAS = [-0.01, 0, 0.01] as const;
const G_DELTAS = [-0.005, 0, 0.005] as const;

export interface SensitivityMatrix {
  waccLabels: string[];
  gLabels: string[];
  cells: number[][];
  baseWacc: number;
  baseG: number;
}

export function buildSensitivityMatrix(
  matrix: ForecastMatrixWithDiagnostics,
): SensitivityMatrix {
  const baseWacc = matrix.assumptions.wacc;
  const baseG = matrix.assumptions.g_terminal;

  const waccLabels = WACC_DELTAS.map(
    (d) => `${((baseWacc + d) * 100).toFixed(1)}%`,
  );
  const gLabels = G_DELTAS.map(
    (d) => `${((baseG + d) * 100).toFixed(1)}%`,
  );

  const cells = G_DELTAS.map((gDelta) =>
    WACC_DELTAS.map((waccDelta) =>
      computeEnterpriseValue(matrix, baseWacc + waccDelta, baseG + gDelta),
    ),
  );

  return { waccLabels, gLabels, cells, baseWacc, baseG };
}
