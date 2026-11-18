/**
 * Round 4, part A: credit capacity engine (lib/credit/credit_capacity.ts). Pure function, runs in
 * npm test in both methodologies (it does not depend on them).
 *
 *   standard-example: the SBC standard's example. 510,000 a year, 24 years, 4.5%: capacity about
 *     7,393,000, 80% of it about 5,914,000; a loan of 2,860,000 pays about 16,257 a month,
 *     195,083 a year, coverage 2.61. Tolerance 0.1%.
 *   monotonic: more EBITDA never gives less capacity; a higher rate never gives more.
 *   non-positive: EBITDA of zero or below gives capacity 0 and the explanation paragraph, no crash.
 *   owner-loans: net debt with and without owner loans differ by exactly the owner loans.
 */
import {
  computeCreditCapacity,
  monthlyPayment,
  presentValueAnnual,
  type CreditCapacityInput,
} from '../lib/credit/credit_capacity';
import {
  SBC_ESTIMATE_SOURCE,
  SBC_STANDARD_SOURCE,
  SECTOR_CREDIT_TABLE,
  resolveSectorCreditTerms,
} from '../lib/credit/sector_credit_table';
import { BOI_POLICY_RATE, primeRatePct } from '../lib/market-data/boi_policy_rate';
import { Suite, type SuiteResult } from './lib/harness';

const within = (a: number, b: number, tol = 0.001) => Math.abs(a - b) <= Math.abs(b) * tol;

function baseInput(over: Partial<CreditCapacityInput> = {}): CreditCapacityInput {
  return {
    today: { ebitda: 510_000, maintenanceCapex: 0, tax: 0 },
    taxRate: 0.23,
    existingMonthlyDebtService: 0,
    ownerLoans: 0,
    grossDebt: 0,
    cash: 0,
    liens: { has: false },
    terms: resolveSectorCreditTerms('energy', 'solar'),
    primeRatePct: primeRatePct(),
    annualRatePct: 4.5,
    termYears: 24,
    ...over,
  };
}

export function run(): SuiteResult {
  const s = new Suite('credit-capacity');

  // Standard example.
  const ex = computeCreditCapacity(baseInput());
  s.check('standard-example', 'capacity', within(ex.capacity, 7_393_000), `capacity ${ex.capacity.toFixed(0)}`);
  s.check('standard-example', 'ceiling-80', within(ex.ceiling, 5_914_000), `ceiling ${ex.ceiling.toFixed(0)}`);
  const m = monthlyPayment(2_860_000, 4.5, 24);
  s.check('standard-example', 'monthly', within(m, 16_257), `monthly ${m.toFixed(2)}`);
  s.check('standard-example', 'annual', within(m * 12, 195_083), `annual ${(m * 12).toFixed(2)}`);
  const cov = 510_000 / (m * 12);
  s.check('standard-example', 'coverage', within(cov, 2.61, 0.002), `coverage ${cov.toFixed(3)}`);
  s.check('standard-example', 'pv-helper', within(presentValueAnnual(510_000, 4.5, 24), 7_393_000), '');
  // First stage within the ceiling and above the coverage floor.
  s.check('first-stage', 'within-ceiling', ex.firstStage <= ex.ceiling && ex.firstStage > 0, `${ex.firstStage} vs ${ex.ceiling}`);
  s.check('first-stage', 'coverage-floor', ex.dscr != null && ex.dscr >= ex.minDscr - 1e-9, `dscr ${ex.dscr}`);
  // With existing debt, coverage includes it.
  const withDebt = computeCreditCapacity(baseInput({ existingMonthlyDebtService: 25_000 }));
  s.check(
    'first-stage',
    'existing-debt',
    withDebt.dscr != null && withDebt.dscr >= withDebt.minDscr - 1e-9 && withDebt.firstStage < ex.firstStage &&
      within(withDebt.totalAnnualDebtService, 300_000 + withDebt.firstStageAnnual, 1e-9),
    `dscr ${withDebt.dscr}, first ${withDebt.firstStage}`,
  );
  const noRoom = computeCreditCapacity(baseInput({ existingMonthlyDebtService: 40_000 }));
  s.check('first-stage', 'no-room', noRoom.firstStage === 0 && noRoom.status === 'no_room' && !!noRoom.explanationHe, noRoom.status);

  // Monotonic in EBITDA and in the rate.
  let prevCap = -1;
  let prevFirst = -1;
  let okE = true;
  for (let e = -200_000; e <= 3_000_000; e += 50_000) {
    const r = computeCreditCapacity(baseInput({ today: { ebitda: e, maintenanceCapex: 40_000 }, existingMonthlyDebtService: 5_000 }));
    if (r.capacity < prevCap - 1e-6 || r.firstStage < prevFirst) okE = false;
    prevCap = r.capacity;
    prevFirst = r.firstStage;
  }
  s.check('monotonic', 'ebitda', okE, '');
  let prevR = Infinity;
  let prevRF = Infinity;
  let okR = true;
  for (let rate = 2; rate <= 14; rate += 0.25) {
    const r = computeCreditCapacity(baseInput({ annualRatePct: rate, existingMonthlyDebtService: 5_000 }));
    if (r.capacity > prevR + 1e-6 || r.firstStage > prevRF) okR = false;
    prevR = r.capacity;
    prevRF = r.firstStage;
  }
  s.check('monotonic', 'rate', okR, '');

  // EBITDA zero or negative.
  for (const e of [0, -150_000]) {
    let r: ReturnType<typeof computeCreditCapacity> | null = null;
    try {
      r = computeCreditCapacity(baseInput({ today: { ebitda: e, maintenanceCapex: 10_000 } }));
    } catch {
      r = null;
    }
    s.check(
      'non-positive',
      `ebitda ${e}`,
      !!r && r.capacity === 0 && r.firstStage === 0 && r.status === 'no_capacity' && (r.explanationHe?.length ?? 0) > 40,
      r ? r.status : 'threw',
    );
  }

  // Owner loans: the two net debts differ by exactly the owner loans.
  for (const [gross, owner, cash] of [
    [2_000_000, 500_000, 300_000],
    [100_000, 400_000, 0],
    [0, 0, 250_000],
  ]) {
    const r = computeCreditCapacity(baseInput({ grossDebt: gross, ownerLoans: owner, cash }));
    s.check(
      'owner-loans',
      `${gross}/${owner}/${cash}`,
      Math.abs(r.netDebtWithOwnerLoans - r.netDebtWithoutOwnerLoans - owner) < 1e-9 &&
        Math.abs(r.netDebtWithOwnerLoans - (Math.max(gross, owner) - cash)) < 1e-9,
      `${r.netDebtWithOwnerLoans} / ${r.netDebtWithoutOwnerLoans}`,
    );
  }

  // Blocker: floating or all-assets lien of a bank.
  const lien = (type: 'floating' | 'specific' | 'all_assets', holder: 'bank' | 'non_bank' | 'other') =>
    computeCreditCapacity(baseInput({ liens: { has: true, type, holder } })).blocker.active;
  s.check('blocker', 'floating-bank', lien('floating', 'bank'), '');
  s.check('blocker', 'all-assets-bank', lien('all_assets', 'bank'), '');
  s.check('blocker', 'specific-bank', !lien('specific', 'bank'), '');
  s.check('blocker', 'floating-non-bank', !lien('floating', 'non_bank'), '');

  // Table: every sector has a row, every field a source; prime from the Bank of Israel file.
  for (const [k, t] of Object.entries(SECTOR_CREDIT_TABLE)) {
    const okSrc = Object.values(t.sources).every((v) => v === SBC_ESTIMATE_SOURCE || v === SBC_STANDARD_SOURCE);
    const okDscr = t.minDscr === (t.volatility === 'stable' ? 1.25 : 1.5);
    s.check('table', k, okSrc && okDscr && t.termYears > 0 && t.spreadOverPrimePp[0] <= t.spreadOverPrimePp[1], '');
  }
  const solar = resolveSectorCreditTerms('energy', 'solar');
  s.check('table', 'solar', solar.termYears === 25 && solar.ceilingPctOfCapacity === 0.8 && solar.setupCostFinancingPct === 0.8 && solar.sources.termYears === SBC_STANDARD_SOURCE, '');
  s.check('table', 'prime', primeRatePct() === BOI_POLICY_RATE.valuePct + 1.5 && BOI_POLICY_RATE.dataDate.length === 10, `${primeRatePct()}`);
  const rr = computeCreditCapacity(baseInput({ annualRatePct: undefined }));
  s.check('table', 'rate-range', rr.rateRangePct[0] < rr.rateRangePct[1] && rr.ratePct >= rr.rateRangePct[0] && rr.ratePct <= rr.rateRangePct[1], `${rr.rateRangePct}`);

  return s.result;
}

if (require.main === module) {
  const r = run();
  console.log(`credit-capacity: ${r.passed} passed, ${r.failures.length} failed`);
  for (const f of r.failures) console.log(`  FAIL ${f}`);
  process.exit(r.failures.length ? 1 : 0);
}
