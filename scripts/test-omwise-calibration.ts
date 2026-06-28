/**
 * Omwise ("הומייז") calibration validation — temporary simulation.
 * Usage: npx tsx scripts/test-omwise-calibration.ts
 */

import {
  applySectorMarginGuardrails,
  computeDynamicMultiple,
  runValuationEngine,
  SECTOR_MULTIPLIERS,
  LIFECYCLE_ADJ,
  OMWISE_BASELINE_VARIANCE_PCT,
  OMWISE_CALIBRATION_QS,
  buildVarianceRibbon,
  type ValuationInputs,
} from '../lib/valuation';
import { resolveSectorMethodologyConfig } from '../lib/valuation/sector_methodology_resolver';
import { BACKLOG_INFLECTION_TARGETS } from '../lib/valuation/backlog_inflection_accelerator';

/** Absolute ₪ → engine ₪K */
const toK = (nis: number) => nis / 1000;

const OMWISE = {
  company: 'Omwise / הומייז',
  revenue2024: 25_779_621,
  ebitda2024: 3_377_021,
  revenue2025: 38_000_000,
  ebitda2025: 6_503_353,
  revenue2026: 45_000_000,
  ebitda2026: 7_000_000,
  backlogSigned: 70_000_000,
  grossDebt: 4_400_000,
  cash: 1_700_000,
  netDebt: 2_700_000,
  targetQualityScore: 67,
  sector: 'industry' as const,
};

function pct(n: number): string {
  return `${n.toFixed(2)}%`;
}

function moneyK(k: number): string {
  return `₪${(k / 1000).toFixed(2)}M (${k.toFixed(0)}K)`;
}

function buildOmwiseInputs(): ValuationInputs {
  const rev2026K = toK(OMWISE.revenue2026);
  const margin2026 =
    OMWISE.revenue2026 > 0
      ? (OMWISE.ebitda2026 / OMWISE.revenue2026) * 100
      : 0;
  const projected2027K = OMWISE.ebitda2026 * (1 + 0.12);

  return {
    rev: rev2026K,
    margin: margin2026,
    growth: 12,
    debt: toK(OMWISE.netDebt),
    grossDebt: toK(OMWISE.grossDebt),
    cash: toK(OMWISE.cash),
    sector: OMWISE.sector,
    sectorMult: SECTOR_MULTIPLIERS.industry,
    subSectorMult: 1,
    lifecycleAdj: LIFECYCLE_ADJ.growth,
    recurring: 30,
    topCustomer: 60,
    founderDep: false,
    competition: false,
    ip: true,
    contracts: true,
    normalizedOwnerSalary: 0,
    capexLevelPct: 6,
    revenue2024K: toK(OMWISE.revenue2024),
    revenue2025K: toK(OMWISE.revenue2025),
    revenue2026K: rev2026K,
    ebitda2024K: toK(OMWISE.ebitda2024),
    ebitda2025K: toK(OMWISE.ebitda2025),
    ebitda2026K: toK(OMWISE.ebitda2026),
    backlogSignedK: toK(OMWISE.backlogSigned),
    projectedEbitdaK: [toK(projected2027K), 0, 0],
    ebitda2027K: toK(projected2027K),
  };
}

function rawMarginPct(revenue: number, ebitda: number): number {
  return revenue > 0 ? (ebitda / revenue) * 100 : 0;
}

function divider(title: string): void {
  console.log('\n' + '='.repeat(72));
  console.log(title);
  console.log('='.repeat(72));
}

function main(): void {
  divider(`OMWISE CALIBRATION SIMULATION — ${OMWISE.company}`);

  const inputs = buildOmwiseInputs();
  const sectorConfig = resolveSectorMethodologyConfig(OMWISE.sector);

  console.log('\n── Raw input margins (pre-engine) ──');
  const m2024 = rawMarginPct(OMWISE.revenue2024, OMWISE.ebitda2024);
  const m2025 = rawMarginPct(OMWISE.revenue2025, OMWISE.ebitda2025);
  const m2026 = rawMarginPct(OMWISE.revenue2026, OMWISE.ebitda2026);
  console.log(`  2024: ${pct(m2024)}  (NOT 54% bug baseline)`);
  console.log(`  2025: ${pct(m2025)}`);
  console.log(`  2026: ${pct(m2026)}`);
  console.log(
    `  Simple 3-yr avg: ${pct((m2024 + m2025 + m2026) / 3)}`,
  );
  console.log(
    `  Sector maxHistoricalMargin cap: ${pct(sectorConfig.maxHistoricalMargin * 100)}`,
  );

  divider('1 · MARGIN GUARDRAILS (Anti-Anomaly Shield)');
  const calibration = applySectorMarginGuardrails(inputs, sectorConfig);

  for (const year of ['y2024', 'y2025', 'y2026'] as const) {
    const slice = calibration.calibratedYears[year];
    console.log(
      `  ${year}: revenue ${moneyK(slice.revenueK)} · EBITDA ${moneyK(slice.ebitdaK)} · margin ${pct(slice.marginPct)}`,
    );
  }

  console.log(`\n  historicalAvgMarginPct: ${pct(calibration.historicalAvgMarginPct)}`);
  console.log(
    `  Winsorization triggered: ${calibration.warnings.length > 0 ? 'YES' : 'NO'}`,
  );
  if (calibration.warnings.length) {
    calibration.warnings.forEach((w) => console.log(`    ⚠ ${w.message}`));
  } else {
    console.log('    ✓ Real historical margins preserved — no 54% synthetic fallback.');
  }

  divider('2 · BACKLOG INFLECTION ACCELERATOR');
  const backlogRatio =
    OMWISE.backlogSigned / OMWISE.revenue2026;
  console.log(`  backlog_signed / revenue_2026 = ${(backlogRatio * 100).toFixed(1)}% (threshold 50%)`);

  const { computed, scenarios } = runValuationEngine(inputs);

  console.log(`  backlogInflectionActive: ${computed.backlogInflectionActive}`);
  console.log(`  inflectionIntensity: ${computed.inflectionIntensity}`);
  console.log(
    `  blendWeights → DCF ${(computed.blendWeights.dcf * 100).toFixed(0)}% · EBITDA ${(computed.blendWeights.ebitda * 100).toFixed(0)}% · REV ${(computed.blendWeights.rev * 100).toFixed(0)}%`,
  );
  console.log(
    `  Expected at inflection: DCF ${BACKLOG_INFLECTION_TARGETS.dcf * 100}% · EBITDA ${BACKLOG_INFLECTION_TARGETS.ebitda * 100}%`,
  );
  console.log(
    `  weightShift OK: ${
      computed.backlogInflectionActive &&
      computed.blendWeights.dcf === BACKLOG_INFLECTION_TARGETS.dcf &&
      computed.blendWeights.ebitda === BACKLOG_INFLECTION_TARGETS.ebitda
        ? 'YES ✓'
        : computed.backlogInflectionActive
          ? 'PARTIAL'
          : 'NO (inflection not active)'
    }`,
  );

  const waccWithoutBacklogAdj = computed.wacc - computed.waccBacklogAdjustment;
  console.log(`\n  WACC (base): ${pct(waccWithoutBacklogAdj)}`);
  console.log(`  WACC backlog adjustment: ${computed.waccBacklogAdjustment.toFixed(1)} pp`);
  console.log(`  WACC (adjusted): ${pct(computed.wacc)}`);

  console.log(`\n  forwardEbitda2027K (organic): ${moneyK(computed.forwardEbitda2027K)}`);
  console.log(
    `  Formula: ebitda_2026 × (1 + growth) = ${moneyK(toK(OMWISE.ebitda2026 * 1.09))}`,
  );
  console.log(
    `  Backlog coverage (backlog ÷ organic 2027F rev): ${((OMWISE.backlogSigned / (OMWISE.revenue2026 * 1.09)) * 100).toFixed(1)}% → WACC −${Math.abs(computed.waccBacklogAdjustment).toFixed(1)}pp specific risk`,
  );

  divider('3 · DYNAMIC MULTIPLE (Linear Interpolation)');
  console.log(`  Engine qualityScore (computed): ${computed.qs} (${computed.qsGrade})`);
  console.log(`  User target qualityScore: ${OMWISE.targetQualityScore}`);

  const atTargetQs = computeDynamicMultiple({
    config: sectorConfig,
    qualityScore: OMWISE.targetQualityScore,
    topCustomerPct: inputs.topCustomer,
  });

  console.log(`\n  At engine QS=${computed.qs}:`);
  console.log(`    multipleBase: ${computed.multipleBase.toFixed(3)}×`);
  console.log(
    `    multipleConcentrationPenalty: ${computed.multipleConcentrationPenalty.toFixed(3)}×`,
  );
  console.log(`    effectiveMult (final): ${computed.effectiveMult.toFixed(3)}×`);

  console.log(`\n  At target QS=${OMWISE.targetQualityScore} (reference):`);
  console.log(`    multipleBase: ${atTargetQs.baseMultiple.toFixed(3)}×`);
  console.log(
    `    multipleConcentrationPenalty: ${atTargetQs.concentrationPenalty.toFixed(3)}×`,
  );
  console.log(`    effectiveMult (final): ${atTargetQs.multiple.toFixed(3)}×`);

  divider('4 · FINAL VALUATION OUTPUT');
  console.log(`  Blended EBITDA (30/50/20): ${moneyK(computed.ebitda)}`);
  console.log(`  baseEbitdaForMultiple: ${moneyK(computed.baseEbitdaForMultiple)}`);
  console.log(`  DCF EV leg: ${moneyK(computed.dcf)}`);
  console.log(`  EBITDA multiple leg: ${moneyK(computed.ebtMult)}`);
  console.log(`  Blended Enterprise Value (EV): ${moneyK(computed.ev)}`);
  console.log(`  Net debt: ${moneyK(inputs.debt)}`);
  console.log(`  Equity Value (שווי לבעלים): ${moneyK(computed.equity)}`);

  divider('5 · SCENARIO RIBBON (QS-Driven Relative Variance)');
  const e = scenarios.elasticity!;
  const cog = scenarios.centerOfGravity!;
  console.log(`  Raw equity (trailing): ${moneyK(computed.rawEquity ?? computed.equity)}`);
  console.log(
    `  Forward run-rate: ${moneyK(cog.forwardRunRateK)} vs trailing ${moneyK(cog.trailingRunRateK)} · uplift ×${cog.calibrationFactor.toFixed(3)}`,
  );
  console.log(`  Calibrated base (center of gravity): ${moneyK(computed.equity)}`);
  console.log(
    `  Ribbon: ±${(e.relativeVariancePct * 100).toFixed(1)}% · QS ${e.qualityScore} · tier ${e.valuationTier} · bear ×${e.bearMultiplier.toFixed(2)} · bull ×${e.bullMultiplier.toFixed(2)}`,
  );
  console.log(
    `  Omwise target: Base ~₪19.5M · Bear ~₪18M · Bull ~₪22.5M at QS ${OMWISE_CALIBRATION_QS} (±${(OMWISE_BASELINE_VARIANCE_PCT * 100).toFixed(0)}%)`,
  );
  for (const row of scenarios.rows) {
    console.log(
      `  ${row.label.toUpperCase()}: ${row.ebitdaAdj} · WACC ${pct(row.waccPct)} · ${row.multDisplay} · Equity ${moneyK(row.equity)}`,
    );
  }
  const spreadK = scenarios.bullEq - scenarios.bearEq;
  console.log(`\n  Equity spread (Bull − Bear): ${moneyK(spreadK)}`);

  divider('6 · ENTERPRISE SCALABILITY (same ±%, auto-scales in ₪)');
  const enterpriseBaseEqK = 1_000_000;
  const enterpriseRibbon = buildVarianceRibbon({
    baseEquityK: enterpriseBaseEqK,
    debtK: 50_000,
    qualityScore: OMWISE.targetQualityScore,
    sector: inputs.sector,
    revenueK: enterpriseBaseEqK * 2,
  });
  console.log(
    `  ₪1B base equity · ±${(enterpriseRibbon.elasticity.relativeVariancePct * 100).toFixed(1)}% → Bear ${moneyK(enterpriseRibbon.bearEquityK)} · Bull ${moneyK(enterpriseRibbon.bullEquityK)} · spread ${moneyK(enterpriseRibbon.bullEquityK - enterpriseRibbon.bearEquityK)}`,
  );

  console.log('\n── Calibration warnings emitted ──');
  if (computed.calibrationWarnings.length) {
    computed.calibrationWarnings.forEach((w) => console.log(`  ${w}`));
  } else {
    console.log('  (none)');
  }

  divider('SIMULATION COMPLETE');
}

main();
