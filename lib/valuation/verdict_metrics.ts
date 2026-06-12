import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import { getMedianMultiple } from './multiples';
import { normalizeMultiplesAnalysis } from './normalize_multiples_analysis';

export type VerdictMultipleStatus = 'in_range' | 'above' | 'below';

export const VERDICT_SANITY_NOTE_HE =
  'מעל חציון הענף — מבוסס בעיקר על תחזית תזרים (DCF)';

export interface VerdictMultiplePill {
  id: string;
  labelHe: string;
  implied: number;
  median: number;
  status: VerdictMultipleStatus;
  /** Credibility guard — hide raw multiple comparison */
  useSanityNote: boolean;
  sanityNoteHe?: string;
}

export interface VerdictMetrics {
  enterpriseValue: number;
  netDebt: number;
  equityValue: number;
  bearEquity: number;
  baseEquity: number;
  bullEquity: number;
  normalizedEbitda: number;
  revenue: number;
  netIncome: number;
  primaryPill: VerdictMultiplePill | null;
  revenuePill: VerdictMultiplePill | null;
  pePill: VerdictMultiplePill | null;
}

function resolveStatus(
  implied: number,
  range: [number, number] | undefined,
): VerdictMultipleStatus {
  if (!range) return 'in_range';
  const [low, high] = range;
  if (implied >= low && implied <= high) return 'in_range';
  return implied > high ? 'above' : 'below';
}

function shouldUseSanityNote(implied: number, median: number): boolean {
  return median > 0 && implied > median * 3;
}

function buildPill(
  id: string,
  labelHe: string,
  implied: number,
  range: [number, number] | undefined,
  opts?: { forceSanity?: boolean },
): VerdictMultiplePill | null {
  if (!range) return null;
  const median = getMedianMultiple(range);
  if (median <= 0) return null;

  const sanity =
    opts?.forceSanity || (implied > 0 && shouldUseSanityNote(implied, median));

  if (implied <= 0 && !opts?.forceSanity) return null;

  return {
    id,
    labelHe,
    implied: implied > 0 ? implied : 0,
    median,
    status: resolveStatus(implied > 0 ? implied : median * 4, range),
    useSanityNote: sanity,
    sanityNoteHe: sanity ? VERDICT_SANITY_NOTE_HE : undefined,
  };
}

function buildEbitdaPill(
  ev: number,
  ebitda: number,
  range: [number, number] | undefined,
): VerdictMultiplePill | null {
  if (!range) return null;
  const median = getMedianMultiple(range);
  if (median <= 0) return null;

  if (ebitda <= 0) {
    return {
      id: 'ebitda',
      labelHe: 'משקף מכפיל EBITDA',
      implied: 0,
      median,
      status: 'above',
      useSanityNote: true,
      sanityNoteHe: VERDICT_SANITY_NOTE_HE,
    };
  }

  const implied = ev / ebitda;
  const sanity = shouldUseSanityNote(implied, median);
  return {
    id: 'ebitda',
    labelHe: 'משקף מכפיל EBITDA',
    implied,
    median,
    status: resolveStatus(implied, range),
    useSanityNote: sanity,
    sanityNoteHe: sanity ? VERDICT_SANITY_NOTE_HE : undefined,
  };
}

function resolveNetIncome(matrix: ForecastMatrixWithDiagnostics): number {
  const inputs = matrix.diagnostics_inputs;
  const ebit = inputs?.ebit ?? matrix.assumptions.adjusted_ebit;
  const taxRate =
    inputs?.tax_rate ?? matrix.assumptions.effective_tax_rate ?? 0.23;
  return Math.max(ebit * (1 - taxRate), 0);
}

export interface BuildVerdictMetricsOptions {
  enterpriseValue?: number;
  bearEquity?: number;
  /** King-number equity (final_equity_value preferred) */
  baseEquity?: number;
  bullEquity?: number;
}

export function buildVerdictMetrics(
  matrix: ForecastMatrixWithDiagnostics,
  opts: BuildVerdictMetricsOptions = {},
): VerdictMetrics | null {
  const normalized = normalizeMultiplesAnalysis(matrix.multiples_analysis);
  if (!normalized) return null;

  const ev =
    opts.enterpriseValue ??
    matrix.scenarios?.base?.enterprise_value ??
    matrix.enterprise_value ??
    0;

  const netDebt =
    matrix.wizard_context?.net_debt ??
    (matrix.capital_structure?.total_debt ?? 0) -
      (matrix.capital_structure?.cash_and_equivalents ?? 0);

  const bearEquity =
    opts.bearEquity ??
    matrix.scenarios?.bear?.final_equity_value ??
    matrix.scenarios?.bear?.equity_after_dlom ??
    ev - netDebt;

  const baseEquity =
    opts.baseEquity ??
    matrix.scenarios?.base?.final_equity_value ??
    matrix.scenarios?.base?.equity_after_dlom ??
    ev - netDebt;

  const bullEquity =
    opts.bullEquity ??
    matrix.scenarios?.bull?.final_equity_value ??
    matrix.scenarios?.bull?.equity_after_dlom ??
    ev - netDebt;

  const normalizedEbitda =
    normalized.forwardEbitda > 0
      ? normalized.forwardEbitda
      : normalized.normalizedEbitda;

  const revenue = matrix.assumptions?.base_revenue ?? 0;
  const netIncome = resolveNetIncome(matrix);
  const { multiplesUsed } = normalized;

  const primaryPill = buildEbitdaPill(ev, normalizedEbitda, multiplesUsed.evEbitda);

  const revenuePill = buildPill(
    'sales',
    'מכפיל הכנסות',
    revenue > 0 ? ev / revenue : 0,
    multiplesUsed.evSales,
  );

  const pePill =
    netIncome > 0 && multiplesUsed.pe
      ? buildPill('pe', 'P/E', baseEquity / netIncome, multiplesUsed.pe)
      : null;

  return {
    enterpriseValue: ev,
    netDebt,
    equityValue: baseEquity,
    bearEquity,
    baseEquity,
    bullEquity,
    normalizedEbitda,
    revenue,
    netIncome,
    primaryPill,
    revenuePill,
    pePill,
  };
}

export function verdictRangeMarkerPct(metrics: VerdictMetrics): number {
  const { bearEquity, bullEquity, equityValue } = metrics;
  const span = bullEquity - bearEquity;
  if (span <= 0) return 50;
  const pct = ((equityValue - bearEquity) / span) * 100;
  return Math.min(100, Math.max(0, pct));
}

export function statusArrow(status: VerdictMultipleStatus): string {
  if (status === 'above') return '▲';
  if (status === 'below') return '▼';
  return '—';
}
