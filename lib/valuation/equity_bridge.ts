import type { ForecastMatrixCapitalStructure } from '../../forecast_sample';

/** Matches valuation_engine.py DLOM_RATE and ValuationDashboard bridge */
export const DEFAULT_DLOM_RATE = 0.2;

export interface ScenarioEquitySlice {
  enterprise_value: number;
  equity_before_dlom: number;
  equity_after_dlom: number;
  final_equity_value: number;
}

export interface EquityBridgeMetrics {
  enterpriseValue: number;
  netDebt: number;
  equityBeforeDlom: number;
  dlomRate: number;
  dlomDeduction: number;
  equityAfterDlom: number;
  controlPremiumApplied: boolean;
  controlPremiumRate: number;
  controlPremiumAmount: number;
  finalEquityValue: number;
}

export function resolveNetDebt(
  capital: ForecastMatrixCapitalStructure | undefined,
  wizardNetDebt?: number | null,
): number {
  if (wizardNetDebt != null && Number.isFinite(wizardNetDebt)) {
    return wizardNetDebt;
  }
  if (!capital) return 0;
  return (capital.total_debt ?? 0) - (capital.cash_and_equivalents ?? 0);
}

function controlPremiumApplied(capital: ForecastMatrixCapitalStructure | undefined): boolean {
  const purpose = capital?.valuation_purpose ?? 'GENERAL';
  return (
    purpose === 'M&A_SALE' ||
    purpose === 'M_AND_A_SALE' ||
    purpose === 'CAPITAL_RAISE'
  );
}

/**
 * Bridge EV → net debt → DLOM → (optional control) → final equity.
 * Values must come from the same scenario slice as the live engine (`bridgeToEquity`).
 */
export function buildEquityBridge(
  scenario: ScenarioEquitySlice,
  capital: ForecastMatrixCapitalStructure | undefined,
  wizardNetDebt?: number | null,
): EquityBridgeMetrics {
  const netDebt = resolveNetDebt(capital, wizardNetDebt);
  const dlomRate = capital?.dlom_rate ?? DEFAULT_DLOM_RATE;
  const equityBeforeDlom = scenario.equity_before_dlom;
  const equityAfterDlom = scenario.equity_after_dlom;
  const dlomDeduction = Math.max(0, equityBeforeDlom - equityAfterDlom);
  const applyControl = controlPremiumApplied(capital);
  const controlPremiumRate = applyControl
    ? (capital?.control_premium_rate ?? 0.27)
    : 0;
  const controlPremiumAmount = applyControl
    ? Math.max(0, scenario.final_equity_value - equityAfterDlom)
    : 0;

  return {
    enterpriseValue: scenario.enterprise_value,
    netDebt,
    equityBeforeDlom,
    dlomRate,
    dlomDeduction,
    equityAfterDlom,
    controlPremiumApplied: applyControl,
    controlPremiumRate,
    controlPremiumAmount,
    finalEquityValue: scenario.final_equity_value,
  };
}

export function formatDlomPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

/** Recompute bridge when scenario slice lacks pre-computed equity fields (PDF / API payloads). */
export function bridgeFromEnterpriseValue(
  enterpriseValue: number,
  capital: ForecastMatrixCapitalStructure | undefined,
  wizardNetDebt?: number | null,
): EquityBridgeMetrics {
  const netDebt = resolveNetDebt(capital, wizardNetDebt);
  const minority = capital?.minority_interest ?? 0;
  const nonOp = capital?.non_operating_assets ?? 0;
  const dlomRate = capital?.dlom_rate ?? DEFAULT_DLOM_RATE;
  const equityBeforeDlom = enterpriseValue - netDebt - minority + nonOp;
  const equityAfterDlom = equityBeforeDlom * (1 - dlomRate);
  const applyControl = controlPremiumApplied(capital);
  const controlPremiumRate = applyControl
    ? (capital?.control_premium_rate ?? 0.27)
    : 0;
  const finalEquityValue = equityAfterDlom * (applyControl ? 1 + controlPremiumRate : 1);
  const controlPremiumAmount = applyControl
    ? Math.max(0, finalEquityValue - equityAfterDlom)
    : 0;

  return {
    enterpriseValue,
    netDebt,
    equityBeforeDlom,
    dlomRate,
    dlomDeduction: Math.max(0, equityBeforeDlom - equityAfterDlom),
    equityAfterDlom,
    controlPremiumApplied: applyControl,
    controlPremiumRate,
    controlPremiumAmount,
    finalEquityValue,
  };
}

export function resolveScenarioSlice(
  scenario:
    | Partial<ScenarioEquitySlice>
    | undefined,
  enterpriseValue: number,
  capital: ForecastMatrixCapitalStructure | undefined,
  wizardNetDebt?: number | null,
): ScenarioEquitySlice {
  if (
    scenario?.equity_before_dlom != null &&
    scenario?.equity_after_dlom != null &&
    scenario?.final_equity_value != null
  ) {
    return {
      enterprise_value: scenario.enterprise_value ?? enterpriseValue,
      equity_before_dlom: scenario.equity_before_dlom,
      equity_after_dlom: scenario.equity_after_dlom,
      final_equity_value: scenario.final_equity_value,
    };
  }
  const bridge = bridgeFromEnterpriseValue(enterpriseValue, capital, wizardNetDebt);
  return {
    enterprise_value: enterpriseValue,
    equity_before_dlom: bridge.equityBeforeDlom,
    equity_after_dlom: bridge.equityAfterDlom,
    final_equity_value: bridge.finalEquityValue,
  };
}
