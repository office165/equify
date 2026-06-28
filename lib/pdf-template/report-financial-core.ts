import type { ValuationComputed } from '../valuation';
import {
  convertIlsKToReportingK,
  getIlsToReportingMultiplier,
  type FxRatesSnapshot,
} from '../utils/fxService';
import type { EquifyWizardState } from '../wizard/map_equify_wizard';
import type { TrajectoryPoint, ValuationData, ReportFinancialCore } from './types';

export type { ReportFinancialCore } from './types';

function absFromReportingK(amountK: number): number {
  return amountK * 1000;
}

export function buildReportFinancialCore(
  state: EquifyWizardState,
  fxComputed: ValuationComputed,
  computed: ValuationComputed,
  netDebtK: number,
  fxRates: FxRatesSnapshot,
): ReportFinancialCore {
  const currency = state.profile.currency ?? 'ILS';
  const auditedEbitda2026K = convertIlsKToReportingK(
    state.financials.y2026.ebitdaK,
    currency,
    fxRates,
  );
  const netDebtReportingK = convertIlsKToReportingK(netDebtK, currency, fxRates);

  return {
    auditedEbitda2026Abs: absFromReportingK(auditedEbitda2026K),
    blendedEbitdaBaseAbs: absFromReportingK(fxComputed.ebitda),
    multipleLegEbitdaBaseAbs: absFromReportingK(fxComputed.baseEbitdaForMultiple),
    effectiveMultiple: computed.effectiveMult,
    blendedEnterpriseValueAbs: absFromReportingK(fxComputed.ev),
    netDebtAbs: absFromReportingK(netDebtReportingK),
    equityBaseAbs: absFromReportingK(fxComputed.equity),
    dcfEvAbs: absFromReportingK(fxComputed.dcf),
    ebitdaMultipleEvAbs: absFromReportingK(fxComputed.ebtMult),
    revenueMultipleEvAbs: absFromReportingK(fxComputed.revMult),
    blendWeights: { ...computed.blendWeights },
  };
}

/** Applies reporting-currency FX to trajectory chart/table values (engine ₪M → target currency M). */
export function scaleTrajectoryForReportingCurrency(
  trajectory: TrajectoryPoint[],
  reportingCurrency: string | undefined,
  fxRates: FxRatesSnapshot,
): TrajectoryPoint[] {
  const multiplier = getIlsToReportingMultiplier(reportingCurrency, fxRates);
  if (multiplier === 1) return trajectory;

  return trajectory.map((point) => ({
    ...point,
    revenueM: point.revenueM * multiplier,
    ebitdaM: point.ebitdaM * multiplier,
    fcffM: point.fcffM != null ? point.fcffM * multiplier : undefined,
  }));
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
