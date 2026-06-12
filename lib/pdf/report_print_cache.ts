import type { ValuationLocale } from '../../api_client';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import type { ValuationReportData } from './types';

interface PrintPayload {
  data: ValuationReportData;
  matrix: ForecastMatrixWithDiagnostics;
  locale: ValuationLocale;
  expires: number;
}

const TTL_MS = 120_000;

function cacheMap(): Map<string, PrintPayload> {
  const g = globalThis as typeof globalThis & {
    __equifyReportPrintCache?: Map<string, PrintPayload>;
  };
  if (!g.__equifyReportPrintCache) {
    g.__equifyReportPrintCache = new Map();
  }
  return g.__equifyReportPrintCache;
}

export function stashPrintPayload(
  id: string,
  payload: Omit<PrintPayload, 'expires'>,
): void {
  cacheMap().set(id, { ...payload, expires: Date.now() + TTL_MS });
}

export function getStashedPrintPayload(id: string): PrintPayload | null {
  const entry = cacheMap().get(id);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    cacheMap().delete(id);
    return null;
  }
  return entry;
}

export function clearStashedPrintPayload(id: string): void {
  cacheMap().delete(id);
}
