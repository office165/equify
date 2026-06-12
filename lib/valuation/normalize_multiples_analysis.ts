import type { MultiplesAnalysisSnapshot } from './engine';
import {
  ISRAEL_MULTIPLES_2026,
  selectPrimaryMultiple,
  type Industry,
  type LifecycleStage,
  type MultiplesRange,
  type ValuationRangeResult,
} from './multiples';

const LIFECYCLE_STAGES: LifecycleStage[] = [
  'seed',
  'early',
  'growth',
  'mature',
  'distressed',
];

const DEFAULT_INDUSTRY: Industry = 'other';

function isIndustry(value: unknown): value is Industry {
  return typeof value === 'string' && value in ISRAEL_MULTIPLES_2026;
}

function asLifecycleStage(value: unknown): LifecycleStage {
  if (
    typeof value === 'string' &&
    LIFECYCLE_STAGES.includes(value as LifecycleStage)
  ) {
    return value as LifecycleStage;
  }
  return 'growth';
}

function asTuple(
  value: unknown,
  fallback: [number, number],
): [number, number] {
  if (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    Number.isFinite(value[0]) &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[1])
  ) {
    return [value[0], value[1]];
  }
  return fallback;
}

function asMultiplesRange(
  raw: unknown,
  industry: Industry,
): MultiplesRange {
  const defaults = ISRAEL_MULTIPLES_2026[industry];
  const source =
    raw && typeof raw === 'object'
      ? (raw as Record<string, unknown>)
      : {};

  const range: MultiplesRange = {
    evEbitda: asTuple(source.evEbitda, defaults.evEbitda),
    evEbita: asTuple(source.evEbita, defaults.evEbita),
    evSales: asTuple(source.evSales, defaults.evSales),
  };

  if (source.pe || defaults.pe) {
    range.pe = asTuple(source.pe, defaults.pe ?? [10, 18]);
  }
  if (source.pbv || defaults.pbv) {
    range.pbv = asTuple(source.pbv, defaults.pbv ?? [0.8, 1.8]);
  }

  return range;
}

function asValuationRange(raw: unknown): ValuationRangeResult {
  const source =
    raw && typeof raw === 'object'
      ? (raw as Record<string, unknown>)
      : {};

  const read = (key: 'low' | 'base' | 'high'): number => {
    const value = source[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  };

  return {
    low: read('low'),
    base: read('base'),
    high: read('high'),
  };
}

function asFiniteNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/**
 * Coerce partial / legacy multiples_analysis payloads from session storage or API
 * into a shape safe for PDF mapping and dashboard panels.
 */
export function normalizeMultiplesAnalysis(
  raw: unknown,
): MultiplesAnalysisSnapshot | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const source = raw as Record<string, unknown>;
  const industry = isIndustry(source.industry)
    ? source.industry
    : DEFAULT_INDUSTRY;
  const lifecycleStage = asLifecycleStage(source.lifecycleStage);
  const multiplesUsed = asMultiplesRange(source.multiplesUsed, industry);
  const valuationRange = asValuationRange(source.valuationRange);

  const selectedRaw = source.selectedMultiple;
  let selectedMultiple = selectPrimaryMultiple(lifecycleStage, true, true, true);
  if (selectedRaw && typeof selectedRaw === 'object') {
    const rawMultiple = (selectedRaw as { multiple?: unknown }).multiple;
    const multipleKey =
      rawMultiple === 'evEbitda' ||
      rawMultiple === 'evEbita' ||
      rawMultiple === 'evSales'
        ? rawMultiple
        : selectedMultiple.multiple;
    selectedMultiple = {
      multiple: multipleKey,
      label: asString(
        (selectedRaw as { label?: unknown }).label,
        selectedMultiple.label,
      ),
      rationale: asString(
        (selectedRaw as { rationale?: unknown }).rationale,
        selectedMultiple.rationale,
      ),
    };
  }

  const normalizedEbitda = asFiniteNumber(source.normalizedEbitda);
  const forwardEbitda = asFiniteNumber(
    source.forwardEbitda,
    normalizedEbitda,
  );

  return {
    valuationRange,
    selectedMultiple,
    multiplesUsed,
    industry,
    lifecycleStage,
    metricValue: asFiniteNumber(source.metricValue),
    medianMultiple: asFiniteNumber(source.medianMultiple),
    normalizedEbitda,
    forwardEbitda,
    comparisonGroup: asString(
      source.comparisonGroup,
      industry === DEFAULT_INDUSTRY ? 'כללי · צמיחה' : `${industry} · growth`,
    ),
    sanityCheck: asString(
      source.sanityCheck,
      'אימות מכפילים — נתוני שוק ישראלי 2024–2026.',
    ),
    methodologyNote: asString(
      source.methodologyNote,
      'הערכה זו מבוססת על נתוני שוק ישראלי 2024–2026 ומשקפת פרמיית אי-סחירות של 20%',
    ),
  };
}
