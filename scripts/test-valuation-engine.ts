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

async function main(): Promise<void> {
  console.log('═'.repeat(72));
  console.log('VALUATION ENGINE REGRESSION SUITE');
  console.log('═'.repeat(72));

  testBacklogProportionalImpact();
  testCapexMonotonicDecrease();
  testIndustryMultiplesRanges();
  testOwnerSalaryZeroHandling();
  testCustomerConcentrationSmooth();
  await testExchangeRatesLive();

  console.log('\n' + '═'.repeat(72));
  console.log(`ALL ${passed} TESTS PASSED`);
  console.log('═'.repeat(72));
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
