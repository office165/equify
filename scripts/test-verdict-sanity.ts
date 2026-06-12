/**
 * Sanity-guard assertions for verdict_metrics.
 * Usage: npx tsx scripts/test-verdict-sanity.ts
 */

import { createSampleForecastMatrix } from '../forecast_sample';
import type { ForecastMatrixWithDiagnostics } from '../valuation_forecast';
import {
  buildVerdictMetrics,
  VERDICT_SANITY_NOTE_HE,
} from '../lib/valuation/verdict_metrics';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`ASSERT FAILED: ${message}`);
  }
}

function baseMultiplesAnalysis() {
  return {
    comparisonGroup: 'SaaS · growth',
    valuationRange: { low: 85_000_000, base: 102_000_000, high: 128_000_000 },
    selectedMultiple: {
      multiple: 'ev_ebitda' as const,
      label: 'EV/EBITDA',
      rationale: 'Sector median',
    },
    industry: 'saas' as const,
    lifecycleStage: 'growth' as const,
    normalizedEbitda: 3_000_000,
    forwardEbitda: 3_000_000,
    multiplesUsed: {
      evEbitda: [6, 10] as [number, number],
      evEbita: [8, 14] as [number, number],
      evSales: [2, 4] as [number, number],
      pe: [12, 20] as [number, number],
    },
    cards: [],
  };
}

function withMatrix(
  patch: Partial<ForecastMatrixWithDiagnostics>,
): ForecastMatrixWithDiagnostics {
  const sample = createSampleForecastMatrix();
  return {
    ...sample,
    multiples_analysis: baseMultiplesAnalysis(),
    ...patch,
  };
}

function testNegativeEbitda(): void {
  const matrix = withMatrix({
    assumptions: {
      ...createSampleForecastMatrix().assumptions,
      adjusted_ebit: -2_000_000,
      base_revenue: 8_000_000,
    },
    multiples_analysis: {
      ...baseMultiplesAnalysis(),
      normalizedEbitda: -500_000,
      forwardEbitda: -500_000,
    },
  });

  const metrics = buildVerdictMetrics(matrix, { enterpriseValue: 118_500_000 });
  assert(metrics !== null, 'metrics should exist');
  assert(
    metrics!.primaryPill?.useSanityNote === true,
    'negative EBITDA must trigger sanity note',
  );
  assert(
    metrics!.primaryPill?.sanityNoteHe === VERDICT_SANITY_NOTE_HE,
    `expected Hebrew badge "${VERDICT_SANITY_NOTE_HE}"`,
  );
  console.log('[negative EBITDA] sanity guard OK');
}

function testImpliedMultipleAbove3xMedian(): void {
  const sample = createSampleForecastMatrix();
  const matrix = withMatrix({
    assumptions: {
      ...sample.assumptions,
      adjusted_ebit: 2_000_000,
      base_revenue: 10_000_000,
    },
    multiples_analysis: {
      ...baseMultiplesAnalysis(),
      normalizedEbitda: 3_000_000,
      forwardEbitda: 3_000_000,
    },
  });

  const ev = 120_000_000;
  const metrics = buildVerdictMetrics(matrix, { enterpriseValue: ev });
  const implied = ev / 3_000_000;
  const median = 8;

  assert(implied > median * 3, 'test setup: implied must exceed 3× median');
  assert(
    metrics!.primaryPill?.useSanityNote === true,
    'implied > 3× median must trigger sanity note',
  );
  assert(
    metrics!.primaryPill?.sanityNoteHe === VERDICT_SANITY_NOTE_HE,
    `expected Hebrew badge "${VERDICT_SANITY_NOTE_HE}"`,
  );
  console.log('[3× median] sanity guard OK');
}

testNegativeEbitda();
testImpliedMultipleAbove3xMedian();
console.log('All verdict sanity tests passed.');
