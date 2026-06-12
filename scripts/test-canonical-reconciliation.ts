/**
 * Canonical valuation reconciliation — hero, waterfall, and scenario equity must align.
 * Usage: npm run test:canonical
 */

import { createSampleForecastMatrix } from '../forecast_sample';
import type { ForecastMatrixAssumptions } from '../forecast_sample';
import type { ForecastMatrixWithDiagnostics } from '../valuation_forecast';
import {
  assertValuationCoherence,
  buildCanonicalValuation,
} from '../lib/valuation/canonical_valuation';
import { bridgeFromEnterpriseValue } from '../lib/valuation/equity_bridge';

const YEARS = 5;
const MID_YEAR = 0.5;
const DEFAULT_TAX = 0.23;

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function pad(rates: number[]): number[] {
  const out = rates.slice(0, YEARS);
  while (out.length < YEARS) out.push(out[out.length - 1] ?? 0.08);
  return out;
}

function buildScenarioEv(
  assumptions: ForecastMatrixAssumptions,
  growthDeltaPp: number,
  marginDeltaPp: number,
) {
  const tax = assumptions.effective_tax_rate ?? DEFAULT_TAX;
  const wacc = assumptions.wacc;
  let revenue = Math.max(assumptions.base_revenue, 1);
  const gRates = pad(assumptions.revenue_growth_rates).map((g) =>
    clamp(g + growthDeltaPp / 100, -0.5, 1.5),
  );
  const margins = pad(assumptions.ebit_margin_targets).map((m) =>
    clamp(m + marginDeltaPp / 100, -0.5, 0.85),
  );
  const daPct = assumptions.da_pct_of_ebit ?? 0.1;
  const capexPct = assumptions.capex_pct_of_revenue ?? 0.05;
  const nwcPct = assumptions.nwc_pct_of_revenue_change ?? 0.1;
  const rev0 = revenue;

  const explicit_rows: Array<{ year: number; revenue: number; ebit: number; nopat: number; fcff: number; pv_fcff: number }> = [];
  let sumPv = 0;

  for (let i = 0; i < YEARS; i++) {
    if (i > 0) revenue *= 1 + gRates[i];
    const ebit = revenue * margins[i];
    const nopat = ebit * (1 - tax);
    const da = ebit * daPct;
    const capex = revenue * capexPct;
    const nwc = i === 0 ? 0 : (revenue - rev0) * nwcPct;
    const fcff = nopat + da - capex - nwc;
    const pv = fcff / Math.pow(1 + wacc, i + MID_YEAR);
    sumPv += pv;
    explicit_rows.push({
      year: i + 1,
      revenue,
      ebit,
      nopat,
      fcff,
      pv_fcff: pv,
    });
  }

  const noplatY5 = explicit_rows[YEARS - 1].nopat;
  const ronic = Math.max(assumptions.industry_tronic, wacc);
  const rr = clamp(assumptions.g_terminal / ronic, 0, 1);
  const gImp = rr * ronic;
  const spread = Math.max(wacc - gImp, 0.005);
  const fcfT = noplatY5 * (1 - rr);
  const pvTerminal = (fcfT / spread) / Math.pow(1 + wacc, YEARS - MID_YEAR);

  return {
    enterprise_value: sumPv + pvTerminal,
    explicit_rows,
  };
}

function baseMultiplesAnalysis() {
  return {
    comparisonGroup: 'SaaS · growth',
    valuationRange: { low: 35_000_000, base: 57_600_000, high: 72_000_000 },
    selectedMultiple: {
      multiple: 'evEbitda' as const,
      label: 'EV/EBITDA',
      rationale: 'Sector median',
    },
    industry: 'saas' as const,
    lifecycleStage: 'growth' as const,
    metricValue: 2_823_529,
    medianMultiple: 8,
    normalizedEbitda: 2_823_529,
    forwardEbitda: 2_823_529,
    sanityCheck: 'ok',
    methodologyNote: 'נתוני שוק ישראלי 2026',
    multiplesUsed: {
      evEbitda: [6, 10] as [number, number],
      evEbita: [8, 14] as [number, number],
      evSales: [2, 4] as [number, number],
      pe: [12, 20] as [number, number],
    },
  };
}

function main(): void {
  const sample = createSampleForecastMatrix();
  const matrix: ForecastMatrixWithDiagnostics = {
    ...sample,
    multiples_analysis: baseMultiplesAnalysis(),
  };

  const bear = buildScenarioEv(matrix.assumptions, -3, -2);
  const base = buildScenarioEv(matrix.assumptions, 0, 0);
  const bull = buildScenarioEv(matrix.assumptions, 3, 2);

  const canonical = buildCanonicalValuation(matrix, {
    bear,
    base: { ...base, explicit_rows: base.explicit_rows },
    bull,
  });

  const bridge = bridgeFromEnterpriseValue(
    canonical.ev_blended_by_scenario.base,
    matrix.capital_structure,
  );

  assertValuationCoherence(
    canonical,
    bridge,
    canonical.equity_by_scenario.base,
  );

  const heroEquity = canonical.equity_by_scenario.base;
  const waterfallEquity = bridge.finalEquityValue;

  if (Math.abs(heroEquity - waterfallEquity) > 1) {
    throw new Error(`Hero vs waterfall mismatch: ${heroEquity} vs ${waterfallEquity}`);
  }

  console.log('=== Canonical Valuation Reconciliation ===');
  console.log(`DCF EV (base):     ${canonical.ev_dcf.toLocaleString('he-IL')}`);
  console.log(`Blended EV:        ${canonical.ev_blended.toLocaleString('he-IL')}`);
  console.log(`Equity (base):     ${canonical.equity_value.toLocaleString('he-IL')}`);
  console.log(
    `Weights:           DCF ${(canonical.weights.dcf * 100).toFixed(0)}% / Multiples ${(canonical.weights.multiples * 100).toFixed(0)}%`,
  );
  console.log(
    `Dampening:         ${canonical.weights.dampeningReason ?? 'none (default 60/40)'}`,
  );
  console.log(`Label (HE):        ${canonical.weightingLabelHe}`);
  console.log('Coherence:         OK (hero === waterfall === scenario)');
}

main();
