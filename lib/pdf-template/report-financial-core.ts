import type { ValuationComputed } from '../valuation';
import type { FxRatesSnapshot } from '../utils/fxService';
import type { EquifyWizardFinancials, EquifyWizardState } from '../wizard/map_equify_wizard';
import { buildFinancialTrajectoryFromEquifyState } from '../wizard/financial_history';
import type { TrajectoryPoint, ValuationData, ReportFinancialCore } from './types';

export type { ReportFinancialCore } from './types';

/** Wizard storage K → absolute reporting-currency amount (matches live Step 2 inputs). */
export function wizardFinancialAbsFromK(amountK: number): number {
  return amountK * 1000;
}

function absFromReportingK(amountK: number): number {
  return wizardFinancialAbsFromK(amountK);
}

export function buildReportFinancialCore(
  state: EquifyWizardState,
  fxComputed: ValuationComputed,
  computed: ValuationComputed,
  netDebtK: number,
  _fxRates: FxRatesSnapshot,
): ReportFinancialCore {
  // Historical wizard inputs are already in reporting currency (₪K / $K / €K storage).
  const auditedEbitda2026Abs = wizardFinancialAbsFromK(state.financials.y2026.ebitdaK);
  const netDebtAbs = wizardFinancialAbsFromK(netDebtK);

  return {
    auditedEbitda2026Abs,
    blendedEbitdaBaseAbs: absFromReportingK(fxComputed.ebitda),
    multipleLegEbitdaBaseAbs: absFromReportingK(fxComputed.baseEbitdaForMultiple),
    effectiveMultiple: computed.effectiveMult,
    blendedEnterpriseValueAbs: absFromReportingK(fxComputed.ev),
    netDebtAbs,
    equityBaseAbs: absFromReportingK(fxComputed.equity),
    dcfEvAbs: absFromReportingK(fxComputed.dcf),
    ebitdaMultipleEvAbs: absFromReportingK(fxComputed.ebtMult),
    revenueMultipleEvAbs: absFromReportingK(fxComputed.revMult),
    blendWeights: { ...computed.blendWeights },
  };
}

/**
 * PDF Page 3 trajectory — same path as live results (`buildReportViewModel` / scroll report).
 * Wizard year buckets are stored in reporting-currency K; convert K→M only (no FX rescale).
 */
export function buildWizardReportTrajectory(
  financials: EquifyWizardFinancials,
): TrajectoryPoint[] {
  return buildFinancialTrajectoryFromEquifyState(financials);
}

/** @deprecated Wizard trajectory is reporting-native — use {@link buildWizardReportTrajectory}. */
export function scaleTrajectoryForReportingCurrency(
  trajectory: TrajectoryPoint[],
  _reportingCurrency?: string,
  _fxRates?: FxRatesSnapshot,
): TrajectoryPoint[] {
  return trajectory;
}

/** Builds a core block for legacy API payloads that lack wizard state. */
export function synthesizeFinancialCoreFromValuationData(
  data: ValuationData,
): ReportFinancialCore {
  const weights = inferBlendWeightsFromModelBlend(data.modelBlend);
  const multipleLegEbitdaBaseAbs =
    data.multipleLegEbitdaBase ??
    (data.effectiveMult > 0 ? data.ebitdaEv / data.effectiveMult : data.ebitda);

  return {
    auditedEbitda2026Abs: data.ebitda,
    blendedEbitdaBaseAbs: data.blendedEbitdaBase ?? data.ebitda,
    multipleLegEbitdaBaseAbs,
    effectiveMultiple: data.effectiveMult,
    blendedEnterpriseValueAbs: data.enterpriseValue,
    netDebtAbs: data.netDebt,
    equityBaseAbs: data.equity,
    dcfEvAbs: data.dcfEv,
    ebitdaMultipleEvAbs: data.ebitdaEv,
    revenueMultipleEvAbs: data.revenueEv,
    blendWeights: weights,
  };
}

function inferBlendWeightsFromModelBlend(
  rows: ValuationData['modelBlend'],
): ReportFinancialCore['blendWeights'] {
  const find = (pattern: RegExp) =>
    rows.find((row) => pattern.test(row.name))?.weightPct ?? 0;

  const dcfPct = find(/dcf/i);
  const ebitdaPct = find(/ebitda/i);
  const revPct = find(/revenue|rev|הכנסות/i);
  const total = dcfPct + ebitdaPct + revPct;

  if (total <= 0) {
    return { dcf: 0.5, ebitda: 0.3, rev: 0.2 };
  }

  return {
    dcf: dcfPct / total,
    ebitda: ebitdaPct / total,
    rev: revPct / total,
  };
}
