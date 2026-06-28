/**
 * Report financial coherence — EBITDA anchors + blended EV reconciliation.
 * Usage: npm run test:report-coherence
 */

import { buildPdfHtml } from '../lib/pdf-template';
import { mapApiPayloadToValuationData } from '../lib/pdf-template/map-from-api';
import { mapWizardToValuationData } from '../lib/pdf-template/map-from-wizard';
import { SAMPLE_REPORT_PAYLOAD } from '../lib/pdf-template/sample-report-fixture';
import {
  assertValuationDataCoherence,
  collectValuationDataViolations,
} from '../lib/pdf-template/validate-valuation-data';
import type { EquifyWizardState } from '../lib/wizard/map_equify_wizard';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function buildSampleWizardState(): EquifyWizardState {
  return {
    profile: {
      fullName: 'QA Tester',
      userEmail: 'qa@example.com',
      userMobilePhone: '050-0000000',
      companyName: 'Coherence Co',
      userNationalId: '',
      userCorporateTaxId: '51-000-0001',
      foundedYear: '2018',
      sector: 'energy',
      subSector: 'wind',
      lifecycle: 'mature',
      customLogoDataUrl: '',
      qualitativeDescription: '',
      currency: 'USD',
      fiscalYear: '2026',
    },
    financials: {
      y2024: { revenueK: 4200, ebitdaK: 820 },
      y2025: { revenueK: 4800, ebitdaK: 980 },
      y2026: { revenueK: 5400, ebitdaK: 1540 },
      rev: 5400,
      margin: 28.5,
      growth: 12,
      grossDebtK: 900,
      cashK: 200,
      normalizedOwnerSalaryK: 120,
      capexLevelPct: 6,
      projectedEbitdaK: [1720, 0, 0],
      backlogSignedK: 0,
      debt: 700,
      customMultiple: null,
      isManualMultiple: false,
    },
    risk: {
      recurring: 55,
      topCustomer: 18,
      founderDep: false,
      competition: true,
      ip: true,
      contracts: true,
    },
    goal: 'negotiation',
    agreedToTerms: true,
  };
}

function testWizardMappingCoherence(): void {
  const data = mapWizardToValuationData(buildSampleWizardState(), 'VAL-QA-001', 'he');
  assertValuationDataCoherence(data);

  const core = data.financialCore!;
  const trajectory2026 = data.trajectory.find((point) => point.label === '2026');
  assert(Boolean(trajectory2026), 'Expected 2026 trajectory point');
  assert(
    Math.abs(trajectory2026!.ebitdaM * 1_000_000 - core.auditedEbitda2026Abs) < 1000,
    'Trajectory 2026 EBITDA must match auditedEbitda2026Abs',
  );
  assert(
    Math.abs(data.sensitivityEbitdaMult!.baseEbitdaAbs! - core.multipleLegEbitdaBaseAbs) < 1000,
    'Sensitivity matrix base EBITDA must match multiples leg base',
  );
  assert(
    Math.abs(core.ebitdaMultipleEvAbs - core.multipleLegEbitdaBaseAbs * core.effectiveMultiple) <
      core.ebitdaMultipleEvAbs * 0.02,
    'Multiples EV must equal multipleLegEbitdaBase × effectiveMultiple',
  );

  buildPdfHtml(data);
  console.log('✓ wizard ValuationData coherence + PDF build');
}

function testApiPayloadCoherence(): void {
  const data = mapApiPayloadToValuationData(SAMPLE_REPORT_PAYLOAD);
  assertValuationDataCoherence(data);
  buildPdfHtml(data);
  console.log('✓ API ValuationData coherence + PDF build');
}

function testDetectsInjectedDrift(): void {
  const data = mapWizardToValuationData(buildSampleWizardState(), 'VAL-QA-002', 'he');
  data.enterpriseValue += 500_000;
  const violations = collectValuationDataViolations(data);
  assert(violations.length > 0, 'Expected coherence violations after enterpriseValue drift');
  console.log('✓ drift detector catches enterpriseValue mismatch');
}

try {
  testWizardMappingCoherence();
  testApiPayloadCoherence();
  testDetectsInjectedDrift();
  console.log('\nAll report financial coherence tests passed.');
} catch (err) {
  console.error('\nReport financial coherence test failed:', err);
  process.exit(1);
}
