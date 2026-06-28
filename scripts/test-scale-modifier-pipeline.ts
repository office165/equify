/**
 * Scale Modifier Pipeline — SMB vs enterprise adaptive checks.
 * Usage: npx tsx scripts/test-scale-modifier-pipeline.ts
 */

import {
  LIFECYCLE_ADJ,
  runValuationEngine,
  resolveScaleModifierProfile,
  applyScaleAdjustedBlendWeights,
  DEFAULT_VALUATION_BLEND_WEIGHTS,
  type ValuationInputs,
} from '../lib/valuation';
import { resolveSectorMethodologyConfig } from '../lib/valuation/sector_methodology_resolver';

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

function baseInputs(overrides: Partial<ValuationInputs>): ValuationInputs {
  return {
    rev: 5_000,
    margin: 12,
    growth: 8,
    debt: 500,
    grossDebt: 800,
    cash: 300,
    sector: 'services',
    sectorMult: 1,
    subSectorMult: 1,
    subSector: 'svc-professional',
    lifecycleAdj: LIFECYCLE_ADJ.early,
    recurring: 40,
    topCustomer: 25,
    founderDep: true,
    competition: true,
    ip: false,
    contracts: false,
    revenue2026K: 5_000,
    ebitda2026K: 600,
    ...overrides,
  };
}

function testScaleProfiles(): void {
  const seedSmb = resolveScaleModifierProfile({
    lifecycle: 'seed',
    lifecycleAdj: LIFECYCLE_ADJ.seed,
    rev: 2_000,
    revenue2026K: 2_000,
  });
  assert(seedSmb.tier === 'smb', 'seed + low revenue → smb tier');
  assert(
    seedSmb.waccSizePremiumOverlayPp >= 3.0 && seedSmb.waccSizePremiumOverlayPp <= 5.0,
    'SMB WACC overlay in +3..+5 pp band',
  );
  assert(seedSmb.multipleDampener < 1, 'SMB multiple dampener < 1');
  assert(seedSmb.blendTargets.multiple >= 0.65, 'SMB targets multiple-heavy blend');

  const matureEnterprise = resolveScaleModifierProfile({
    lifecycle: 'mature',
    lifecycleAdj: LIFECYCLE_ADJ.mature,
    rev: 200_000,
    revenue2026K: 200_000,
  });
  assert(matureEnterprise.tier === 'enterprise', 'mature + high revenue → enterprise tier');
  assert(
    matureEnterprise.waccSizePremiumOverlayPp <= 0,
    'enterprise WACC overlay optimized (≤ 0 pp)',
  );
  assert(matureEnterprise.multipleDampener >= 1, 'enterprise prime multiple coefficient ≥ 1');
  assert(matureEnterprise.blendTargets.dcf >= 0.6, 'enterprise targets DCF-heavy blend');
}

function testBlendWeightShift(): void {
  const profile = resolveScaleModifierProfile({
    lifecycle: 'seed',
    lifecycleAdj: LIFECYCLE_ADJ.seed,
    rev: 1_500,
    revenue2026K: 1_500,
  });
  const sectorConfig = resolveSectorMethodologyConfig('services', 'svc-professional');
  const adjusted = applyScaleAdjustedBlendWeights(
    DEFAULT_VALUATION_BLEND_WEIGHTS,
    profile,
    sectorConfig.strategy,
  );
  assert(adjusted.dcf < DEFAULT_VALUATION_BLEND_WEIGHTS.dcf, 'SMB lowers DCF weight vs default');
  assert(
    adjusted.ebitda + adjusted.rev > DEFAULT_VALUATION_BLEND_WEIGHTS.ebitda,
    'SMB raises multiple-leg weight vs default',
  );
}

function testEngineIntegration(): void {
  const smb = runValuationEngine(
    baseInputs({
      lifecycle: 'seed',
      lifecycleAdj: LIFECYCLE_ADJ.seed,
      rev: 3_000,
      revenue2026K: 3_000,
    }),
  ).computed;
  const enterprise = runValuationEngine(
    baseInputs({
      lifecycle: 'mature',
      lifecycleAdj: LIFECYCLE_ADJ.mature,
      rev: 180_000,
      revenue2026K: 180_000,
      ebitda2026K: 22_000,
      growth: 5,
    }),
  ).computed;

  assert(
    smb.blendWeights.dcf < enterprise.blendWeights.dcf,
    'engine: SMB DCF weight < enterprise DCF weight',
  );
  assert(smb.wacc > enterprise.wacc, 'engine: SMB WACC > enterprise WACC');
}

function main(): void {
  testScaleProfiles();
  testBlendWeightShift();
  testEngineIntegration();
  console.log('Scale Modifier Pipeline: all checks passed.');
}

main();
