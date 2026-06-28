import type { ReportingCurrencyCode } from '../utils/formatCurrency';
import {
  convertIlsKToReportingK,
  getCachedFxRates,
  getIlsToReportingMultiplier,
  type FxRatesSnapshot,
} from '../utils/fxService';
import type { ValuationComputed, ValuationScenarios } from '../valuation';

function scaleK(value: number, multiplier: number): number {
  if (!Number.isFinite(value)) return value;
  return value * multiplier;
}

/** Apply reporting-currency FX to engine outputs (₪K base → target ₪K equivalent). */
export function applyReportingFxToComputed(
  computed: ValuationComputed,
  multiplier: number,
): ValuationComputed {
  if (multiplier === 1) return computed;

  const blend = computed.ebitdaBlend;
  return {
    ...computed,
    ebitda: scaleK(computed.ebitda, multiplier),
    ebitdaBlend: {
      ...blend,
      past: scaleK(blend.past, multiplier),
      current: scaleK(blend.current, multiplier),
      projected: scaleK(blend.projected, multiplier),
      blended: scaleK(blend.blended, multiplier),
      revPastK: scaleK(blend.revPastK, multiplier),
      revCurrentK: scaleK(blend.revCurrentK, multiplier),
      revProjectedK: scaleK(blend.revProjectedK, multiplier),
    },
    ebtMult: scaleK(computed.ebtMult, multiplier),
    revMult: scaleK(computed.revMult, multiplier),
    dcf: scaleK(computed.dcf, multiplier),
    ev: scaleK(computed.ev, multiplier),
    equity: scaleK(computed.equity, multiplier),
    rawEv:
      computed.rawEv != null ? scaleK(computed.rawEv, multiplier) : computed.rawEv,
    rawEquity:
      computed.rawEquity != null
        ? scaleK(computed.rawEquity, multiplier)
        : computed.rawEquity,
    forwardRunRateK:
      computed.forwardRunRateK != null
        ? scaleK(computed.forwardRunRateK, multiplier)
        : computed.forwardRunRateK,
    forwardEbitda2027K: scaleK(computed.forwardEbitda2027K, multiplier),
    baseEbitdaForMultiple: scaleK(computed.baseEbitdaForMultiple, multiplier),
  };
}

export function applyReportingFxToScenarios(
  scenarios: ValuationScenarios,
  multiplier: number,
): ValuationScenarios {
  if (multiplier === 1) return scenarios;

  const cog = scenarios.centerOfGravity;
  return {
    ...scenarios,
    bearEv: scaleK(scenarios.bearEv, multiplier),
    bullEv: scaleK(scenarios.bullEv, multiplier),
    bearEq: scaleK(scenarios.bearEq, multiplier),
    bullEq: scaleK(scenarios.bullEq, multiplier),
    baseEq: scaleK(scenarios.baseEq, multiplier),
    rows: scenarios.rows.map((row) => ({
      ...row,
      ev: scaleK(row.ev, multiplier),
      equity: scaleK(row.equity, multiplier),
    })),
    centerOfGravity: cog
      ? {
          ...cog,
          trailingRunRateK: scaleK(cog.trailingRunRateK, multiplier),
          forwardRunRateK: scaleK(cog.forwardRunRateK, multiplier),
          rawEvK: scaleK(cog.rawEvK, multiplier),
          rawEquityK: scaleK(cog.rawEquityK, multiplier),
          calibratedEvK: scaleK(cog.calibratedEvK, multiplier),
          calibratedEquityK: scaleK(cog.calibratedEquityK, multiplier),
        }
      : cog,
  };
}

export function applyReportingFxLayer(
  computed: ValuationComputed,
  scenarios: ValuationScenarios,
  reportingCurrency: ReportingCurrencyCode | string | undefined,
  rates: FxRatesSnapshot = getCachedFxRates(),
): { computed: ValuationComputed; scenarios: ValuationScenarios; multiplier: number } {
  const multiplier = getIlsToReportingMultiplier(reportingCurrency, rates);
  return {
    multiplier,
    computed: applyReportingFxToComputed(computed, multiplier),
    scenarios: applyReportingFxToScenarios(scenarios, multiplier),
  };
}

/** Convenience for single ₪K amounts (e.g. net debt bridge display). */
export function convertEngineKToReportingK(
  amountK: number,
  reportingCurrency: ReportingCurrencyCode | string | undefined,
  rates?: FxRatesSnapshot,
): number {
  return convertIlsKToReportingK(amountK, reportingCurrency, rates);
}
