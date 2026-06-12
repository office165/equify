/**
 * MVP in-memory valuation cache — no PostgreSQL / Supabase required.
 * Survives for the lifetime of the server process (sufficient for single-instance MVP).
 */

import type { ValuationLocale } from '../../api_client';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';

export interface InMemoryValuationRecord {
  valuationId: string;
  forecast_matrix_json: ForecastMatrixWithDiagnostics;
  locale: ValuationLocale;
  companyName: string;
  createdAt: string;
}

const store = new Map<string, InMemoryValuationRecord>();

const MAX_ENTRIES = 500;

export function putInMemoryValuation(record: InMemoryValuationRecord): void {
  if (store.size >= MAX_ENTRIES) {
    const oldestKey = store.keys().next().value;
    if (oldestKey) {
      store.delete(oldestKey);
    }
  }
  store.set(record.valuationId, record);
}

export function getInMemoryValuation(
  valuationId: string,
): InMemoryValuationRecord | null {
  return store.get(valuationId) ?? null;
}

export function hasInMemoryValuation(valuationId: string): boolean {
  return store.has(valuationId);
}
