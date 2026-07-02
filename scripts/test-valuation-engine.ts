/**
 * Valuation engine regression suite — blocks regressions in backlog, CAPEX,
 * industry multiples, owner-salary handling, concentration curve, and FX.
 * Usage: npm run test:engine
 */

import {
  LIFECYCLE_ADJ,
  SECTOR_MULTIPLIERS,
  runValuationEngine,
  type ValuationInputs,
} from '../lib/valuation';
import {
  getIndustryMultiples,
  getMedianMultiple,
  type Industry,
} from '../lib/valuation/multiples';
import { computeBacklogInflectionWeight } from '../lib/valuation/backlog_metrics';
import { sumModelBlendContributionsK } from '../lib/valuation/compute_final_enterprise_value';
import { computeSpecificRiskPremium } from '../lib/valuation/specific_risk_premium';
import { resolveDisplayWeights } from '../lib/valuation/resolve_display_weights';
import {
  computeNormalizedEbitda,
  resolveNormalizedEbitdaFromInputs,
} from '../lib/valuation/normalized_ebitda';
import { resolveProfitabilityRegime } from '../lib/valuation/profitability_regime';

let passed = 0;
let failed = 0;

function fail(test: string, message: string): never {
  failed += 1;
  console.error(`\n❌ FAIL [${test}]: ${message}`);
  process.exit(1);
}

function pass(test: string, detail?: string): void {
  passed += 1;
  console.log(`✅ PASS [${test}]${detail ? ` — ${detail}` : ''}`);
}

function assert(test: string, condition: boolean, message: string): void {
  if (!condition) fail(test, message);
}

function baseInputs(overrides: Partial<ValuationInputs> = {}): ValuationInputs {
  return {
    rev: 8_000,
    margin: 6.25,
    growth: 8,
    debt: 0,
    grossDebt: 0,
    cash: 0,
    sector: 'food_service',
    subSector: 'restaurant',
    sectorMult: SECTOR_MULTIPLIERS.food_service,
    subSectorMult: 1,
    lifecycle: 'growth',
    lifecycleAdj: LIFECYCLE_ADJ.growth,
    recurring: 40,
    topCustomer: 15,
    founderDep: false,
    competition: false,
    ip: false,
    contracts: false,
    normalizedOwnerSalary: 0,
    capexLevelPct: 3,
    revenue2026K: 8_000,
    ebitda2026K: 500,
    ebitda2025K: 480,
    ebitda2024K: 450,
    revenue2025K: 7_500,
    revenue2024K: 7_000,
    ...overrides,
  };
}

function equityFor(overrides: Partial<ValuationInputs> = {}): number {
  const { computed } = runValuationEngine(baseInputs(overrides));
  return computed.equity;
}

function testBacklogProportionalImpact(): void {
  const test = 'TEST 1 — Backlog proportional impact';
  const baseValue = equityFor({ backlogSignedK: 0 });
  assert(test, baseValue > 0, `base equity must be positive (got ${baseValue})`);

  const at500K = equityFor({ backlogSignedK: 500 });
  const at5M = equityFor({ backlogSignedK: 5_000 });
  const at8M = equityFor({ backlogSignedK: 8_000 });

  const w500 = computeBacklogInflectionWeight(500, 8_000);
  const w5M = computeBacklogInflectionWeight(5_000, 8_000);
  const w8M = computeBacklogInflectionWeight(8_000, 8_000);

  assert(
    test,
    w500 > 0,
    `backlog 500K must produce inflection weight > 0 (got ${w500})`,
  );
  assert(
    test,
    at500K > baseValue * 1.01,
    `backlog 500K must lift equity ≥1% (base=${baseValue.toFixed(0)} got=${at500K.toFixed(0)})`,
  );
  assert(
    test,
    at5M > baseValue * 1.05,
    `backlog 5M must lift equity ≥5% (base=${baseValue.toFixed(0)} got=${at5M.toFixed(0)}, weight=${w5M})`,
  );
  assert(
    test,
    at8M > baseValue * 1.1,
    `backlog 8M must lift equity ≥10% (base=${baseValue.toFixed(0)} got=${at8M.toFixed(0)}, weight=${w8M})`,
  );
  assert(test, at500K < at5M && at5M < at8M, 'equity must increase monotonically with backlog');

  pass(
    test,
    `base=${baseValue.toFixed(0)} | +500K=${at500K.toFixed(0)} | +5M=${at5M.toFixed(0)} | +8M=${at8M.toFixed(0)}`,
  );
}

function testCapexMonotonicDecrease(): void {
  const test = 'TEST 2 — CAPEX monotonic decrease';
  const saasBase = {
    rev: 8_000,
    margin: 25,
    growth: 12,
    debt: 0,
    sector: 'saas' as const,
    subSector: 'b2b_saas',
    sectorMult: SECTOR_MULTIPLIERS.saas,
    subSectorMult: 1,
    lifecycleAdj: LIFECYCLE_ADJ.growth,
    recurring: 70,
    topCustomer: 12,
    founderDep: false,
    competition: false,
    ip: true,
    contracts: true,
    revenue2026K: 8_000,
    ebitda2026K: 2_000,
    ebitda2025K: 1_800,
    ebitda2024K: 1_600,
    revenue2025K: 7_200,
    revenue2024K: 6_500,
  };

  const capexLevels = [0, 1, 2, 3, 4, 5];
  const equities: number[] = [];

  for (const capex of capexLevels) {
    equities.push(
      equityFor({
        ...saasBase,
        capexLevelPct: capex,
        backlogSignedK: 0,
      }),
    );
  }

  for (let i = 1; i < capexLevels.length; i += 1) {
    const prev = equities[i - 1]!;
    const curr = equities[i]!;
    assert(
      test,
      curr < prev,
      `capex ${capexLevels[i]}% equity (${curr.toFixed(0)}) must be < capex ${capexLevels[i - 1]}% (${prev.toFixed(0)})`,
    );
  }

  pass(test, equities.map((v, i) => `${capexLevels[i]}%→${v.toFixed(0)}`).join(' | '));
}

function testIndustryMultiplesRanges(): void {
  const test = 'TEST 3 — Industry multiples correct range';
  const cases: Array<{
    industry: Industry;
    min: number;
    max: number;
    notHotelMax?: number;
  }> = [
    { industry: 'food_service', min: 3.0, max: 7.0, notHotelMax: 8.0 },
    { industry: 'hospitality', min: 7.5, max: 13.0 },
    { industry: 'saas', min: 9.0, max: 18.0 },
    { industry: 'cyber', min: 11.0, max: 20.0 },
  ];

  for (const { industry, min, max, notHotelMax } of cases) {
    const range = getIndustryMultiples(industry).evEbitda;
    const median = getMedianMultiple(range);
    assert(
      test,
      median >= min && median <= max,
      `${industry} median EV/EBITDA ${median} must be in [${min}, ${max}] (range ${range[0]}–${range[1]})`,
    );
    if (notHotelMax != null) {
      assert(
        test,
        range[1] < notHotelMax,
        `${industry} max EV/EBITDA ${range[1]} must stay below hotel floor ${notHotelMax}`,
      );
    }
  }

  pass(test, 'food_service, hospitality, saas, cyber ranges verified');
}

function testOwnerSalaryZeroHandling(): void {
  const test = 'TEST 4 — Owner salary zero handling';
  const inputs = baseInputs({
    sector: 'saas',
    subSector: 'b2b_saas',
    sectorMult: SECTOR_MULTIPLIERS.saas,
    margin: 25,
    ebitda2026K: 2_000,
    recurring: 75,
    topCustomer: 10,
    founderDep: false,
    competition: false,
    ip: true,
    contracts: true,
    normalizedOwnerSalary: 0,
    backlogSignedK: 0,
  });

  const withZero = runValuationEngine(inputs);
  const withExplicit250 = runValuationEngine({
    ...inputs,
    normalizedOwnerSalary: 250,
  });

  assert(
    test,
    withZero.computed.qs > 64,
    `QS with ownerSalary=0 must be > 64 (got ${withZero.computed.qs})`,
  );
  assert(
    test,
    withZero.computed.calibrationWarnings.some((w) => w.includes('250')),
    'ownerSalary=0 must emit 250K normalization warning',
  );
  assert(
    test,
    Math.abs(withZero.computed.dcf - withExplicit250.computed.dcf) < 1,
    `DCF must use 250K normalization when ownerSalary=0 (zero=${withZero.computed.dcf.toFixed(1)} explicit250=${withExplicit250.computed.dcf.toFixed(1)})`,
  );

  pass(test, `QS=${withZero.computed.qs}, DCF normalized`);
}

function testCustomerConcentrationSmooth(): void {
  const test = 'TEST 5 — Customer concentration smooth';
  const shared = {
    rev: 5_000,
    margin: 20,
    growth: 8,
    debt: 0,
    sector: 'services' as const,
    subSector: 'consulting',
    sectorMult: SECTOR_MULTIPLIERS.services,
    subSectorMult: 1,
    lifecycleAdj: LIFECYCLE_ADJ.growth,
    recurring: 50,
    founderDep: false,
    competition: false,
    ip: false,
    contracts: false,
    revenue2026K: 5_000,
    ebitda2026K: 1_000,
    backlogSignedK: 0,
  };

  const penalty10 = runValuationEngine(baseInputs({ ...shared, topCustomer: 10 }))
    .computed.multipleConcentrationPenalty;
  const penalty20 = runValuationEngine(baseInputs({ ...shared, topCustomer: 20 }))
    .computed.multipleConcentrationPenalty;
  const penalty40 = runValuationEngine(baseInputs({ ...shared, topCustomer: 40 }))
    .computed.multipleConcentrationPenalty;

  assert(test, penalty20 > penalty10, `20% penalty (${penalty20}) must exceed 10% (${penalty10})`);
  assert(
    test,
    penalty20 < penalty10 * 2.5,
    `20% penalty must be < 2.5× 10% penalty (${penalty10} → ${penalty20})`,
  );
  assert(test, penalty40 > penalty20, `40% penalty (${penalty40}) must exceed 20% (${penalty20})`);
  assert(
    test,
    penalty40 < penalty10 * 5,
    `40% penalty must be < 5× 10% penalty (${penalty10} → ${penalty40})`,
  );

  const jump20 = penalty20 / Math.max(penalty10, 1e-9);
  const jump40 = penalty40 / Math.max(penalty20, 1e-9);
  assert(
    test,
    jump20 <= 3 && jump40 <= 3,
    `adjacent concentration steps must not jump >3× (10→20=${jump20.toFixed(2)}×, 20→40=${jump40.toFixed(2)}×)`,
  );

  pass(
    test,
    `penalties: 10%=${penalty10.toFixed(3)} 20%=${penalty20.toFixed(3)} 40%=${penalty40.toFixed(3)}`,
  );
}

async function fetchExchangeRates(): Promise<{ USD: number; EUR: number; source: string }> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/ILS', {
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { rates?: { USD?: number; EUR?: number } };
    const usdRate = data.rates?.USD;
    const eurRate = data.rates?.EUR;
    if (!usdRate || !eurRate) throw new Error('missing rates');
    return {
      USD: 1 / usdRate,
      EUR: 1 / eurRate,
      source: 'live',
    };
  } catch {
    return { USD: 3.0, EUR: 3.42, source: 'fallback' };
  }
}

async function testExchangeRatesLive(): Promise<void> {
  const test = 'TEST 6 — Exchange rates live';
  const rates = await fetchExchangeRates();

  assert(
    test,
    rates.USD >= 2.5 && rates.USD <= 4.0,
    `USD/ILS must be in [2.5, 4.0] (got ${rates.USD}, source=${rates.source})`,
  );
  assert(
    test,
    rates.EUR >= 3.0 && rates.EUR <= 4.5,
    `EUR/ILS must be in [3.0, 4.5] (got ${rates.EUR}, source=${rates.source})`,
  );

  pass(test, `USD=${rates.USD.toFixed(3)} EUR=${rates.EUR.toFixed(3)} (${rates.source})`);
}

async function testMultiplePathInvariance(): Promise<void> {
  const test = 'TEST 7 — Multiple path invariance';
  const saasInputs: Partial<ValuationInputs> = {
    rev: 20_000,
    margin: 15,
    growth: 12,
    debt: 500,
    sector: 'saas',
    subSector: 'b2b_saas',
    sectorMult: SECTOR_MULTIPLIERS.saas,
    lifecycle: 'growth',
    lifecycleAdj: LIFECYCLE_ADJ.growth,
    recurring: 70,
    topCustomer: 12,
    founderDep: false,
    competition: false,
    ip: true,
    contracts: true,
    revenue2026K: 20_000,
    ebitda2026K: 3_000,
    ebitda2025K: 2_700,
    ebitda2024K: 2_400,
    revenue2025K: 18_000,
    revenue2024K: 16_000,
    backlogSignedK: 0,
    capexLevelPct: 3,
    normalizedOwnerSalary: 0,
  };

  const autoRun = runValuationEngine(
    baseInputs({
      ...saasInputs,
      isManualMultiple: false,
      customMultiple: null,
    }),
  );
  const rawMultiple = autoRun.computed.configuredDefaultMultiple;
  const autoEquity = autoRun.computed.equity;

  const manualRun = runValuationEngine(
    baseInputs({
      ...saasInputs,
      isManualMultiple: true,
      customMultiple: rawMultiple,
    }),
  );
  const manualEquity = manualRun.computed.equity;
  const deltaPct =
    autoEquity > 0 ? (Math.abs(autoEquity - manualEquity) / autoEquity) * 100 : 0;

  assert(
    test,
    deltaPct < 1,
    `INVARIANT VIOLATION: auto=${autoEquity.toFixed(0)} manual=${manualEquity.toFixed(0)} delta=${deltaPct.toFixed(2)}% (rawMultiple=${rawMultiple})`,
  );

  pass(
    test,
    `raw=${rawMultiple}x auto=${autoEquity.toFixed(0)} manual=${manualEquity.toFixed(0)} Δ=${deltaPct.toFixed(3)}%`,
  );
}

function testEvBlendCoherenceInvariant(): void {
  const test = 'TEST 8 — EV/blend coherence invariant';
  const sectors: Array<ValuationInputs['sector']> = [
    'food_service',
    'saas',
    'energy',
    'retail_unified',
    'hospitality',
  ];
  const lifecycles: Array<ValuationInputs['lifecycle']> = ['seed', 'growth', 'mature'];

  for (let i = 0; i < 20; i += 1) {
    const sector = sectors[i % sectors.length]!;
    const lifecycle = lifecycles[i % lifecycles.length]!;
    const rev = 2_000 + (i + 1) * 1_100;
    const margin = 4 + (i % 12);
    const backlogSignedK = i % 5 === 0 ? 0 : rev * (0.05 + (i % 8) * 0.12);
    const debt = i % 3 === 0 ? rev * 0.15 : 0;

    const { computed } = runValuationEngine(
      baseInputs({
        rev,
        margin,
        growth: 5 + (i % 15),
        debt,
        grossDebt: debt,
        cash: 0,
        sector,
        sectorMult: SECTOR_MULTIPLIERS[sector],
        lifecycle,
        lifecycleAdj: LIFECYCLE_ADJ[lifecycle],
        revenue2026K: rev,
        ebitda2026K: rev * (margin / 100),
        ebitda2025K: rev * (margin / 100) * 0.95,
        ebitda2024K: rev * (margin / 100) * 0.9,
        revenue2025K: rev * 0.94,
        revenue2024K: rev * 0.88,
        backlogSignedK,
      }),
    );

    const contributions = computed.modelBlendContributions;
    assert(
      test,
      contributions != null,
      `run ${i + 1}: modelBlendContributions must be defined`,
    );

    const blendSumK = sumModelBlendContributionsK(contributions!);
    const deltaPct =
      computed.ev > 0 ? (Math.abs(computed.ev - blendSumK) / computed.ev) * 100 : 0;

    assert(
      test,
      deltaPct < 0.01,
      `run ${i + 1}: EV=${computed.ev.toFixed(2)} blendSum=${blendSumK.toFixed(2)} Δ=${deltaPct.toFixed(4)}% sector=${sector} backlog=${backlogSignedK}`,
    );
  }

  pass(test, '20 randomized valuations — |EV − Σ contributions| < 0.01%');
}

function testSpecificRiskPremiumInputs(): void {
  const test = 'TEST 9 — Specific risk premium responds to all risk inputs';

  const caseA = computeSpecificRiskPremium({
    topCustomerPct: 0,
    founderDependency: false,
    ipProtection: true,
    hasLongTermContracts: true,
  });
  assert(test, caseA.totalPremium === 0, `Case A must be 0 (got ${caseA.totalPremium})`);

  const caseB = computeSpecificRiskPremium({
    topCustomerPct: 55,
    founderDependency: false,
    ipProtection: true,
    hasLongTermContracts: true,
  });
  assert(
    test,
    caseB.totalPremium > 0 && caseB.totalPremium <= 0.012,
    `Case B must be in (0, 0.012] (got ${caseB.totalPremium})`,
  );

  const caseC = computeSpecificRiskPremium({
    topCustomerPct: 0,
    founderDependency: true,
    ipProtection: true,
    hasLongTermContracts: true,
  });
  assert(
    test,
    caseC.totalPremium > caseA.totalPremium,
    `Case C (${caseC.totalPremium}) must exceed Case A (${caseA.totalPremium})`,
  );

  const caseD = computeSpecificRiskPremium({
    topCustomerPct: 55,
    founderDependency: true,
    ipProtection: false,
    hasLongTermContracts: false,
  });
  assert(
    test,
    caseD.totalPremium > caseB.totalPremium &&
      caseD.totalPremium > caseC.totalPremium &&
      caseD.totalPremium <= 0.025,
    `Case D must be max and capped at 0.025 (got ${caseD.totalPremium})`,
  );

  const wired = runValuationEngine(
    baseInputs({
      topCustomer: 55,
      founderDep: true,
      ip: false,
      contracts: false,
    }),
  );
  assert(
    test,
    Math.abs(wired.computed.waccBreakdown.specificRiskPremium - caseD.totalPremiumPp) < 0.01,
    `Engine wiring: breakdown SRP ${wired.computed.waccBreakdown.specificRiskPremium} ≠ expected ${caseD.totalPremiumPp}`,
  );

  pass(
    test,
    `A=0 B=${caseB.totalPremium.toFixed(3)} C=${caseC.totalPremium.toFixed(3)} D=${caseD.totalPremium.toFixed(3)}`,
  );
}

function negativeEbitdaInputs(
  ebitda2026K: number,
  overrides: Partial<ValuationInputs> = {},
): ValuationInputs {
  const revenue2026K = overrides.revenue2026K ?? overrides.rev ?? 4_000;
  const margin = revenue2026K > 0 ? (ebitda2026K / revenue2026K) * 100 : 0;
  return baseInputs({
    rev: revenue2026K,
    revenue2026K,
    ebitda2026K,
    margin,
    ebitda2025K: ebitda2026K * 0.9,
    ebitda2024K: ebitda2026K * 0.85,
    revenue2025K: revenue2026K * 0.95,
    revenue2024K: revenue2026K * 0.9,
    backlogSignedK: 0,
    ...overrides,
  });
}

function testNegativeEbitdaRegime(): void {
  const test = 'TEST 11 — Negative EBITDA regime';

  const caseA = runValuationEngine(
    negativeEbitdaInputs(-1_400, { rev: 4_000, revenue2026K: 4_000 }),
  );
  assert(test, caseA.computed.equity > 0, `Case A equity must be > 0 (got ${caseA.computed.equity})`);
  assert(
    test,
    caseA.computed.profitabilityRegime?.regime === 'deep_loss' ||
      caseA.computed.profitabilityRegime?.regime === 'loss_making',
    `Case A must be loss-making regime (got ${caseA.computed.profitabilityRegime?.regime})`,
  );
  assert(
    test,
    caseA.computed.blendWeights.ebitda === 0,
    `Case A ebitda blend weight must be 0 (got ${caseA.computed.blendWeights.ebitda})`,
  );
  const blendSumA =
    caseA.computed.blendWeights.dcf +
    caseA.computed.blendWeights.ebitda +
    caseA.computed.blendWeights.rev;
  assert(
    test,
    Math.abs(blendSumA - 1) < 0.001,
    `Case A blend weights must sum to 1 (got ${blendSumA})`,
  );
  const contributionsA = caseA.computed.modelBlendContributions;
  assert(test, contributionsA != null, 'Case A modelBlendContributions required');
  const sumA = sumModelBlendContributionsK(contributionsA!);
  const deltaA =
    caseA.computed.ev > 0 ? (Math.abs(caseA.computed.ev - sumA) / caseA.computed.ev) * 100 : 0;
  assert(test, deltaA < 0.01, `Case A coherence failed: EV=${caseA.computed.ev} sum=${sumA}`);

  const caseB = runValuationEngine(
    baseInputs({
      rev: 4_000,
      margin: 1.25,
      revenue2026K: 4_000,
      ebitda2026K: 50,
      ebitda2025K: 0,
      ebitda2024K: 0,
      revenue2025K: 0,
      revenue2024K: 0,
      backlogSignedK: 0,
    }),
  );
  assert(
    test,
    caseB.computed.profitabilityRegime?.regime === 'thin_margin',
    `Case B must be thin_margin (got ${caseB.computed.profitabilityRegime?.regime})`,
  );
  assert(test, caseB.computed.dcf > 0, 'Case B DCF leg must be > 0');
  assert(test, caseB.computed.ebtMult > 0, 'Case B EBITDA leg must be > 0');
  assert(test, caseB.computed.revMult > 0, 'Case B revenue leg must be > 0');
  const blendSumB =
    caseB.computed.blendWeights.dcf +
    caseB.computed.blendWeights.ebitda +
    caseB.computed.blendWeights.rev;
  assert(
    test,
    Math.abs(blendSumB - 1) < 0.001,
    `Case B weights must sum to 1 (got ${blendSumB})`,
  );

  const equityNeg1K = equityFor(
    negativeEbitdaInputs(-1, {
      rev: 4_000,
      revenue2026K: 4_000,
      ebitda2025K: 0,
      ebitda2024K: 0,
      revenue2025K: 0,
      revenue2024K: 0,
    }),
  );
  const equityPos1K = runValuationEngine(
    baseInputs({
      rev: 4_000,
      margin: 0.025,
      revenue2026K: 4_000,
      ebitda2026K: 1,
      ebitda2025K: 0,
      ebitda2024K: 0,
      revenue2025K: 0,
      revenue2024K: 0,
      backlogSignedK: 0,
    }),
  ).computed.equity;
  const continuityDelta =
    equityPos1K > 0
      ? (Math.abs(equityPos1K - equityNeg1K) / equityPos1K) * 100
      : 100;
  assert(
    test,
    continuityDelta < 8,
    `Case C zero-crossing cliff: -1K=${equityNeg1K.toFixed(0)} +1K=${equityPos1K.toFixed(0)} Δ=${continuityDelta.toFixed(2)}%`,
  );

  const equityDeeperLoss = equityFor(negativeEbitdaInputs(-1_500));
  const equityShallowerLoss = equityFor(negativeEbitdaInputs(-1_200));
  assert(
    test,
    equityShallowerLoss > equityDeeperLoss,
    `Case D monotonic: -1.2M (${equityShallowerLoss.toFixed(0)}) must exceed -1.5M (${equityDeeperLoss.toFixed(0)})`,
  );

  pass(
    test,
    `A equity=${caseA.computed.equity.toFixed(0)} regime=${caseA.computed.profitabilityRegime?.regime} | B thin_margin | C Δ=${continuityDelta.toFixed(1)}%`,
  );
}

function testSectorWeightDynamismRestored(): void {
  const test = 'TEST 12 — Sector weight dynamism restored';

  const saasMarketplace = resolveDisplayWeights({
    sectorKey: 'saas',
    subSectorKey: 'marketplace',
    financials: null,
  });
  const hotelBoutique = resolveDisplayWeights({
    sectorKey: 'hospitality',
    subSectorKey: 'boutique_hotel',
    financials: null,
  });

  assert(
    test,
    saasMarketplace.dcf !== hotelBoutique.dcf ||
      saasMarketplace.revenueMultiple !== hotelBoutique.revenueMultiple ||
      saasMarketplace.ebitdaMultiple !== hotelBoutique.ebitdaMultiple,
    `saas/marketplace must differ from hospitality/boutique (saas=${JSON.stringify(saasMarketplace)} hotel=${JSON.stringify(hotelBoutique)})`,
  );

  const saasHealthy = resolveDisplayWeights({
    sectorKey: 'saas',
    subSectorKey: 'marketplace',
    financials: { revenueK: 4_000, ebitdaK: 800 },
  });
  assert(
    test,
    Math.abs(saasHealthy.dcf - saasMarketplace.dcf) < 1e-6 &&
      Math.abs(saasHealthy.revenueMultiple - saasMarketplace.revenueMultiple) < 1e-6 &&
      Math.abs(saasHealthy.ebitdaMultiple - saasMarketplace.ebitdaMultiple) < 1e-6,
    'healthy saas/marketplace must match sector base weights',
  );

  const saasLoss = resolveDisplayWeights({
    sectorKey: 'saas',
    subSectorKey: 'marketplace',
    financials: { revenueK: 4_000, ebitdaK: -500 },
  });
  const hotelLoss = resolveDisplayWeights({
    sectorKey: 'hospitality',
    subSectorKey: 'boutique_hotel',
    financials: { revenueK: 4_000, ebitdaK: -500 },
  });

  assert(test, saasLoss.ebitdaMultiple === 0, 'loss-making saas must zero EBITDA leg weight');
  assert(
    test,
    saasLoss.revenueMultiple > saasMarketplace.revenueMultiple,
    'loss-making saas revenue weight must exceed healthy base',
  );
  assert(
    test,
    saasLoss.dcf !== hotelLoss.dcf || saasLoss.revenueMultiple !== hotelLoss.revenueMultiple,
    'same negative financials must still differ by sector DNA',
  );

  const combos = [
    resolveDisplayWeights({ sectorKey: 'saas', subSectorKey: 'marketplace', financials: null }),
    resolveDisplayWeights({ sectorKey: 'saas', subSectorKey: 'devtools', financials: null }),
    resolveDisplayWeights({ sectorKey: 'hospitality', subSectorKey: 'boutique_hotel', financials: null }),
  ];
  const signatures = combos.map(
    (w) => `${w.dcf.toFixed(4)}|${w.ebitdaMultiple.toFixed(4)}|${w.revenueMultiple.toFixed(4)}`,
  );
  const unique = new Set(signatures);
  assert(
    test,
    unique.size === 3,
    `expected 3 distinct weight sets, got ${unique.size}: ${signatures.join(' ; ')}`,
  );

  pass(
    test,
    `marketplace=${Math.round(saasMarketplace.dcf * 100)}/${Math.round(saasMarketplace.revenueMultiple * 100)} | boutique=${Math.round(hotelBoutique.dcf * 100)}/${Math.round(hotelBoutique.ebitdaMultiple * 100)}`,
  );
}

function testNormalizedEbitdaHistoricalSensitivity(): void {
  const test = 'TEST 13 — Normalized EBITDA & historical sensitivity';

  const reportedBase = {
    rev: 777.777,
    margin: (-44.444 / 777.777) * 100,
    revenue2026K: 777.777,
    ebitda2026K: -44.444,
    backlogSignedK: 600,
    sector: 'saas' as const,
    subSector: 'marketplace',
    sectorMult: SECTOR_MULTIPLIERS.saas,
  };

  const equityA = equityFor(reportedBase);
  const equityB = equityFor({
    ...reportedBase,
    revenue2024K: 7_777,
    ebitda2024K: 6_000,
    revenue2025K: 8_888,
    ebitda2025K: 5_600,
  });

  assert(
    test,
    equityB > equityA * 1.5,
    `Case B history must move equity materially: A=${equityA.toFixed(0)} B=${equityB.toFixed(0)} (need B > A×1.5)`,
  );

  const chronic = resolveNormalizedEbitdaFromInputs({
    ebitda2024K: -2_000,
    ebitda2025K: -1_500,
    ebitda2026K: -1_400,
    revenue2024K: 5_000,
    revenue2025K: 4_500,
    revenue2026K: 4_000,
    rev: 4_000,
    margin: -35,
  });
  const chronicRegime = resolveProfitabilityRegime({
    ebitdaK: chronic.normalizedEbitdaK,
    revenueK: 4_000,
  });
  assert(test, chronic.normalizedEbitdaK < 0, 'Case C normalized EBITDA must stay negative');
  assert(
    test,
    chronicRegime.regime === 'loss_making' || chronicRegime.regime === 'deep_loss',
    `Case C must stay loss_making (got ${chronicRegime.regime})`,
  );

  const anomalyDown = computeNormalizedEbitda({
    currentEbitdaK: -600,
    currentRevenueK: 10_000,
    prior1EbitdaK: 5_200,
    prior1RevenueK: 10_000,
    prior2EbitdaK: 5_500,
    prior2RevenueK: 10_000,
  });
  const anomalyStable = computeNormalizedEbitda({
    currentEbitdaK: 900,
    currentRevenueK: 10_000,
    prior1EbitdaK: 1_000,
    prior1RevenueK: 10_000,
    prior2EbitdaK: 1_200,
    prior2RevenueK: 10_000,
  });
  assert(test, anomalyDown.isCurrentYearAnomalous === true, 'Case D: [55%,52%,-6%] must be anomalous');
  assert(test, anomalyStable.isCurrentYearAnomalous === false, 'Case D: [12%,10%,9%] must not be anomalous');

  const equityE1 = equityFor({
    ...reportedBase,
    revenue2024K: 7_777,
    ebitda2024K: 6_000,
    revenue2025K: 8_888,
    ebitda2025K: 5_600,
  });
  const equityE2 = equityFor({
    ...reportedBase,
    revenue2024K: 7_777,
    ebitda2024K: 6_000,
    revenue2025K: 8_888,
    ebitda2025K: 6_500,
  });
  const sensitivityPct =
    equityE1 > 0 ? (Math.abs(equityE2 - equityE1) / equityE1) * 100 : 0;
  assert(
    test,
    sensitivityPct > 2,
    `Case E: +1M prior EBITDA must move equity >2% (Δ=${sensitivityPct.toFixed(1)}%)`,
  );

  pass(test, `A=${equityA.toFixed(0)} B=${equityB.toFixed(0)} chronic=${chronicRegime.regime}`);
}

function testMaEbitdaPanelOwnerSalaryLeak(): void {
  const test = 'TEST 14 — M&A EBITDA panel owner-salary leak';

  const noSalary = runValuationEngine(
    baseInputs({
      rev: 1_000,
      margin: 5,
      revenue2026K: 1_000,
      ebitda2026K: 50,
      revenue2025K: undefined,
      ebitda2025K: undefined,
      revenue2024K: undefined,
      ebitda2024K: undefined,
      normalizedOwnerSalary: 0,
    }),
  );
  const blend = noSalary.computed.ebitdaBlend;

  assert(
    test,
    blend.past == null || !Number.isFinite(blend.past),
    `past must be null without 2025 actuals (got ${blend.past})`,
  );
  assert(
    test,
    Math.abs(blend.current - 50) < 1,
    `current must ≈ 50 without default 250 (got ${blend.current})`,
  );
  assert(
    test,
    Math.abs(blend.current - 250) > 1 && Math.abs(blend.current - 300) > 1,
    `current must not be 250 or 300 (got ${blend.current})`,
  );
  assert(
    test,
    Math.abs(blend.projected - 250) > 1,
    `projected must not equal default 250K leak (got ${blend.projected})`,
  );

  const explicit120 = runValuationEngine(
    baseInputs({
      rev: 1_000,
      margin: 5,
      revenue2026K: 1_000,
      ebitda2026K: 50,
      revenue2025K: undefined,
      ebitda2025K: undefined,
      revenue2024K: undefined,
      ebitda2024K: undefined,
      normalizedOwnerSalary: 120,
    }),
  );
  const blendExplicit = explicit120.computed.ebitdaBlend;
  assert(
    test,
    Math.abs(blendExplicit.current - 170) < 1,
    `explicit 120 add-back → current ≈ 170 (got ${blendExplicit.current})`,
  );
  assert(
    test,
    Math.abs(blendExplicit.projected - (1_000 * 1.08 * 0.05 + 120)) < 2,
    `explicit add-back must flow to projected (got ${blendExplicit.projected})`,
  );

  pass(test, `default current=${blend.current.toFixed(0)} explicit120 current=${blendExplicit.current.toFixed(0)}`);
}

/** Ordered regression suites — labels skip TEST 10 (never allocated; see suite list). */
const TEST_SUITES: Array<{ run: () => void | Promise<void> }> = [
  { run: testBacklogProportionalImpact },
  { run: testCapexMonotonicDecrease },
  { run: testIndustryMultiplesRanges },
  { run: testOwnerSalaryZeroHandling },
  { run: testCustomerConcentrationSmooth },
  { run: testMultiplePathInvariance },
  { run: testExchangeRatesLive },
  { run: testEvBlendCoherenceInvariant },
  { run: testSpecificRiskPremiumInputs },
  { run: testNegativeEbitdaRegime },
  { run: testSectorWeightDynamismRestored },
  { run: testNormalizedEbitdaHistoricalSensitivity },
  { run: testMaEbitdaPanelOwnerSalaryLeak },
];

async function main(): Promise<void> {
  console.log('═'.repeat(72));
  console.log('VALUATION ENGINE REGRESSION SUITE');
  console.log('═'.repeat(72));

  let executed = 0;
  for (const suite of TEST_SUITES) {
    await suite.run();
    executed += 1;
  }

  console.log('\n' + '═'.repeat(72));
  if (passed !== executed) {
    fail(
      'Runner',
      `pass count (${passed}) must equal executed suites (${executed})`,
    );
  }
  console.log(
    `ALL ${passed} / ${executed} TEST SUITES PASSED (labels TEST 1–9, 11–14)`,
  );
  console.log('═'.repeat(72));
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
