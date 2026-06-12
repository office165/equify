import type { ValuationLocale } from '../../api_client';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import type { CanonicalValuation } from '../valuation/canonical_valuation';
import {
  bridgeFromEnterpriseValue,
  buildEquityBridge,
  resolveScenarioSlice,
  type EquityBridgeMetrics,
} from '../valuation/equity_bridge';
import { buildMultiplesPanelData } from '../valuation/multiples_panel_data';
import { normalizeMultiplesAnalysis } from '../valuation/normalize_multiples_analysis';
import { buildVerdictMetrics, type VerdictMetrics } from '../valuation/verdict_metrics';
import { getWizardContext } from './wizard_context';
import { scenarioValues } from './formatters';

const COHERENCE_TOLERANCE = 1;

export interface CanonicalReportValuation {
  /** Always base scenario for client-facing report */
  scenario: 'base';
  enterpriseValue: number;
  netDebt: number;
  bearEnterpriseValue: number;
  bullEnterpriseValue: number;
  bearEquity: number;
  bullEquity: number;
  finalEquityValue: number;
  bridge: EquityBridgeMetrics;
  verdict: VerdictMetrics;
  /** Multiples-only implied range — subordinate context, not headline */
  multiplesRawLow: number | null;
  multiplesRawHigh: number | null;
  multiplesImpliedBase: number | null;
}

export class ReportCoherenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportCoherenceError';
  }
}

function assertCoherence(
  bridge: EquityBridgeMetrics,
  verdict: VerdictMetrics,
  label: string,
): void {
  if (process.env.NODE_ENV === 'production') return;

  const checks: [string, number, number][] = [
    ['verdict.equityValue vs bridge.finalEquityValue', verdict.equityValue, bridge.finalEquityValue],
    ['verdict.enterpriseValue vs bridge.enterpriseValue', verdict.enterpriseValue, bridge.enterpriseValue],
    ['verdict.baseEquity vs bridge.finalEquityValue', verdict.baseEquity, bridge.finalEquityValue],
  ];

  for (const [name, a, b] of checks) {
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (Math.abs(a - b) > COHERENCE_TOLERANCE) {
      throw new ReportCoherenceError(
        `[${label}] Report coherence failed: ${name} (${a} ≠ ${b})`,
      );
    }
  }
}

export interface BuildCanonicalOptions {
  baseEV?: number;
  bearEV?: number;
  bullEV?: number;
  /** Live dashboard canonical object — preferred when available */
  canonicalValuation?: CanonicalValuation;
}

/**
 * Single canonical valuation object for the entire PDF — base scenario only.
 * Headline equity, waterfall, and verdict must all derive from this.
 */
export function buildCanonicalReportValuation(
  matrix: ForecastMatrixWithDiagnostics,
  locale: ValuationLocale,
  overrides: BuildCanonicalOptions = {},
): CanonicalReportValuation {
  const wizard = getWizardContext(matrix);
  const cv = overrides.canonicalValuation;
  const ev = scenarioValues(matrix);

  const enterpriseValue =
    cv?.ev_blended ?? overrides.baseEV ?? ev.base;
  const bearEnterpriseValue =
    cv?.ev_blended_by_scenario.bear ?? overrides.bearEV ?? ev.bear;
  const bullEnterpriseValue =
    cv?.ev_blended_by_scenario.bull ?? overrides.bullEV ?? ev.bull;
  const netDebt =
    cv?.net_debt ??
    wizard.net_debt ??
    matrix.capital_structure.total_debt - matrix.capital_structure.cash_and_equivalents;

  const baseSlice = cv
    ? {
        enterprise_value: enterpriseValue,
        equity_before_dlom: bridgeFromEnterpriseValue(
          enterpriseValue,
          matrix.capital_structure,
          netDebt,
        ).equityBeforeDlom,
        equity_after_dlom: bridgeFromEnterpriseValue(
          enterpriseValue,
          matrix.capital_structure,
          netDebt,
        ).equityAfterDlom,
        final_equity_value: cv.equity_value,
      }
    : resolveScenarioSlice(
        matrix.scenarios?.base,
        enterpriseValue,
        matrix.capital_structure,
        netDebt,
      );

  const bearSlice = cv
    ? (() => {
        const b = bridgeFromEnterpriseValue(
          bearEnterpriseValue,
          matrix.capital_structure,
          netDebt,
        );
        return {
          enterprise_value: bearEnterpriseValue,
          equity_before_dlom: b.equityBeforeDlom,
          equity_after_dlom: b.equityAfterDlom,
          final_equity_value: cv.equity_by_scenario.bear,
        };
      })()
    : resolveScenarioSlice(
        matrix.scenarios?.bear,
        bearEnterpriseValue,
        matrix.capital_structure,
        netDebt,
      );
  const bullSlice = cv
    ? (() => {
        const b = bridgeFromEnterpriseValue(
          bullEnterpriseValue,
          matrix.capital_structure,
          netDebt,
        );
        return {
          enterprise_value: bullEnterpriseValue,
          equity_before_dlom: b.equityBeforeDlom,
          equity_after_dlom: b.equityAfterDlom,
          final_equity_value: cv.equity_by_scenario.bull,
        };
      })()
    : resolveScenarioSlice(
        matrix.scenarios?.bull,
        bullEnterpriseValue,
        matrix.capital_structure,
        netDebt,
      );

  const bridge = buildEquityBridge(
    baseSlice,
    matrix.capital_structure,
    netDebt,
  );

  const verdict = buildVerdictMetrics(matrix, {
    enterpriseValue,
    bearEquity: bearSlice.final_equity_value,
    baseEquity: bridge.finalEquityValue,
    bullEquity: bullSlice.final_equity_value,
  });

  if (!verdict) {
    throw new ReportCoherenceError('Unable to build verdict metrics for report');
  }

  assertCoherence(bridge, verdict, matrix.meta.valuation_id ?? 'report');

  const normalized = normalizeMultiplesAnalysis(matrix.multiples_analysis);
  let multiplesRawLow: number | null = null;
  let multiplesRawHigh: number | null = null;
  let multiplesImpliedBase: number | null = null;

  if (cv) {
    multiplesRawLow = cv.multiples_raw_low;
    multiplesRawHigh = cv.multiples_raw_high;
    multiplesImpliedBase = normalized?.valuationRange.base ?? null;
  } else if (normalized?.valuationRange) {
    multiplesRawLow = normalized.valuationRange.low;
    multiplesRawHigh = normalized.valuationRange.high;
    multiplesImpliedBase = normalized.valuationRange.base;
  }

  return {
    scenario: 'base',
    enterpriseValue,
    netDebt,
    bearEnterpriseValue,
    bullEnterpriseValue,
    bearEquity: bearSlice.final_equity_value,
    bullEquity: bullSlice.final_equity_value,
    finalEquityValue: bridge.finalEquityValue,
    bridge,
    verdict,
    multiplesRawLow,
    multiplesRawHigh,
    multiplesImpliedBase,
  };
}

/** Reference multiples panel — never overwrites canonical EV/equity */
export function buildCanonicalMultiplesContext(
  matrix: ForecastMatrixWithDiagnostics,
  canonical: CanonicalReportValuation,
) {
  const normalized = normalizeMultiplesAnalysis(matrix.multiples_analysis);
  if (!normalized) return null;
  return buildMultiplesPanelData(
    normalized,
    matrix,
    canonical.enterpriseValue,
    canonical.finalEquityValue,
    { dcf: 0.6, mult: 0.4 },
  );
}
