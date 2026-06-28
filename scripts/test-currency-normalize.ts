/**
 * Currency normalization — ILS-only engine path verification.
 * Usage: npx tsx scripts/test-currency-normalize.ts
 */

import {
  formatValuationOutputSync,
  getIlsPerForeignUnit,
  normalizeValuationInputsToIls,
} from '../lib/currency-normalize';
import {
  LIFECYCLE_ADJ,
  runValuationEngine,
  STATIC_FX_FROM_ILS,
  type ValuationInputs,
} from '../lib/valuation';
import { buildValuationInputsFromEquifyState } from '../lib/wizard/build_valuation_inputs';
import type { EquifyWizardState } from '../lib/wizard/map_equify_wizard';

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

const FALLBACK_RATES = {
  fromIls: { ...STATIC_FX_FROM_ILS },
  source: 'fallback' as const,
  asOf: 'static',
  fetchedAt: Date.now(),
};

function pitaBaseState(currency: 'ILS' | 'USD'): EquifyWizardState {
  const usdPerIls = STATIC_FX_FROM_ILS.USD;
  const ilsPerUsd = 1 / usdPerIls;
  const scale = currency === 'ILS' ? 1 : usdPerIls;

  const revenueK = 4100 * scale;
  const ebitdaK = Math.round(revenueK * 0.15);
  const grossDebtK = 800 * scale;
  const cashK = 200 * scale;

  return {
    profile: {
      fullName: 'Test Owner',
      userEmail: 'test@example.com',
      userMobilePhone: '050-0000000',
      companyName: currency === 'ILS' ? 'Pita Israelit' : 'Pita Americait',
      userNationalId: '',
      userCorporateTaxId: '51-000-0001',
      foundedYear: '2015',
      sector: 'food_service',
      subSector: 'restaurants-fb',
      lifecycle: 'mature',
      customLogoDataUrl: '',
      qualitativeDescription: '',
      currency,
      fiscalYear: '2026',
    },
    financials: {
      y2024: { revenueK: 3600 * scale, ebitdaK: 520 * scale },
      y2025: { revenueK: 3850 * scale, ebitdaK: 560 * scale },
      y2026: { revenueK: revenueK, ebitdaK },
      rev: revenueK,
      margin: (ebitdaK / revenueK) * 100,
      growth: 6,
      grossDebtK,
      cashK,
      normalizedOwnerSalaryK: 250 * scale,
      capexLevelPct: 4,
      projectedEbitdaK: [ebitdaK * 1.05, 0, 0],
      backlogSignedK: 0,
      debt: grossDebtK - cashK,
      customMultiple: null,
      isManualMultiple: false,
    },
    risk: {
      recurring: 35,
      topCustomer: 22,
      founderDep: true,
      competition: true,
      ip: false,
      contracts: false,
    },
    goal: 'negotiation',
    agreedToTerms: true,
  };
}

function testIlsUsdEquityParity(): void {
  const ilsInputs = buildValuationInputsFromEquifyState(pitaBaseState('ILS'), FALLBACK_RATES);
  const usdInputs = buildValuationInputsFromEquifyState(pitaBaseState('USD'), FALLBACK_RATES);

  assert(
    Math.abs(ilsInputs.rev - usdInputs.rev) < 1,
    `Normalized revenue must match: ILS ${ilsInputs.rev} vs USD-path ${usdInputs.rev}`,
  );

  const ilsResult = runValuationEngine(ilsInputs).computed;
  const usdResult = runValuationEngine(usdInputs).computed;

  assert(
    Math.abs(ilsResult.equity - usdResult.equity) < 0.5,
    `Equity parity: ILS ${ilsResult.equity}K vs USD-input ${usdResult.equity}K`,
  );

  console.log(
    `✓ ILS/USD input parity — equity ₪${Math.round(ilsResult.equity)}K (both paths)`,
  );
}

function testOutputConversion(): void {
  const equityIls = 1_800_000;
  const out = formatValuationOutputSync(equityIls, FALLBACK_RATES);
  const usdRate = getIlsPerForeignUnit('USD', FALLBACK_RATES);
  const expectedUsd = equityIls / usdRate;

  assert(out.primary_ils.includes('₪'), 'Primary output must be ILS formatted');
  assert(out.secondary_usd.includes('$'), 'Secondary USD must include $');
  assert(out.secondary_eur.includes('€'), 'Secondary EUR must include €');
  assert(
    Math.abs(out.equity_usd - expectedUsd) < 1000,
    `USD output ~${expectedUsd}, got ${out.equity_usd}`,
  );

  console.log(
    `✓ Output conversion — ${out.primary_ils} · ${out.secondary_usd} · ${out.secondary_eur}`,
  );
}

function testNormalizeValuationInputs(): void {
  const base: ValuationInputs = {
    rev: 1110,
    margin: 15,
    growth: 6,
    debt: 600,
    grossDebt: 800,
    cash: 200,
    sector: 'food_service',
    subSector: 'restaurants-fb',
    sectorMult: 1,
    subSectorMult: 1,
    lifecycle: 'mature',
    lifecycleAdj: LIFECYCLE_ADJ.mature,
    recurring: 35,
    topCustomer: 22,
    founderDep: true,
    competition: true,
    ip: false,
    contracts: false,
    revenue2026K: 1110,
    ebitda2026K: 166,
  };

  const normalized = normalizeValuationInputsToIls(base, 'USD', FALLBACK_RATES);
  assert(Math.abs(normalized.rev - 4162.5) < 1, '1110 USD K → ~4162.5 ILS K at 3.75');
  console.log('✓ normalizeValuationInputsToIls scales monetary fields');
}

try {
  testNormalizeValuationInputs();
  testIlsUsdEquityParity();
  testOutputConversion();
  console.log('\nAll currency normalization tests passed.');
} catch (err) {
  console.error('\nCurrency normalization test failed:', err);
  process.exit(1);
}
