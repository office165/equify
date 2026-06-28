import type { ValuationLocale } from '../../api_client';
import type { EquifyWizardState } from '../wizard/map_equify_wizard';
import {
  verifyValuationReportSnapshot,
  type ValuationReportSnapshot,
} from '../results/valuation-report-snapshot';
import { syncFinancialsDerived } from '../wizard/financial_history';
import {
  isEquifyReportApiPayload,
  mapApiPayloadToValuationData,
} from './map-from-api';
import type { ValuationData } from './types';

export interface GenerateReportBody {
  companyName?: string;
  registrationId?: string;
  valuationPurpose?: string;
  valuationDate?: string;
  language?: ValuationLocale;
  sector?: string;
  sectorLabel?: string;
  data?: ValuationData | Record<string, unknown>;
  state?: EquifyWizardState;
  /** Atomic client snapshot — preferred for wizard exports (no server-side recompute). */
  snapshot?: ValuationReportSnapshot;
  reportId?: string;
  filename?: string;
  locale?: ValuationLocale;
}

export interface ResolvedValuationData {
  valuationData: ValuationData;
  snapshotHash?: string;
  renderMode: 'snapshot' | 'api_payload' | 'legacy_state';
}

function isValuationDataShape(data: unknown): data is ValuationData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return typeof d.companyName === 'string' && typeof d.equity === 'number';
}

function isValuationReportSnapshot(value: unknown): value is ValuationReportSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snap = value as ValuationReportSnapshot;
  return (
    snap.version === 1 &&
    typeof snap.snapshotHash === 'string' &&
    typeof snap.inputsDigest === 'string' &&
    isValuationDataShape(snap.valuationData)
  );
}

export async function resolveValuationDataFromBody(body: GenerateReportBody): Promise<
  | ResolvedValuationData
  | { error: string; code?: string }
> {
  if (isEquifyReportApiPayload(body)) {
    return {
      valuationData: mapApiPayloadToValuationData(body),
      renderMode: 'api_payload',
    };
  }

  if (isValuationReportSnapshot(body.snapshot)) {
    const syncedState = body.state
      ? { ...body.state, financials: syncFinancialsDerived(body.state.financials) }
      : null;
    const verification = verifyValuationReportSnapshot(body.snapshot, syncedState);
    if (!verification.ok) {
      return {
        error: verification.reason,
        code: 'STALE_SNAPSHOT',
      };
    }

    return {
      valuationData: body.snapshot.valuationData,
      snapshotHash: body.snapshot.snapshotHash,
      renderMode: 'snapshot',
    };
  }

  if (isValuationDataShape(body.data)) {
    return {
      valuationData: body.data,
      renderMode: 'api_payload',
    };
  }

  if (body.state?.profile) {
    return {
      error:
        'Wizard PDF export requires an atomic snapshot. Refresh the results page and download again.',
      code: 'SNAPSHOT_REQUIRED',
    };
  }

  return {
    error: 'Provide snapshot (wizard), companyName+data (API payload), or data (ValuationData).',
    code: 'VALIDATION_ERROR',
  };
}

/** RFC 5987 — HTTP headers are Latin1-only; never put Hebrew in filename= alone. */
export function buildContentDisposition(filename: string): string {
  const asciiFallback =
    filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_') || 'report';
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export function defaultUtf8PdfFilename(companyName: string): string {
  const safe = companyName.trim() || 'equify';
  return `דוח_${safe}.pdf`;
}

export function defaultUtf8HtmlFilename(companyName: string): string {
  const safe = companyName.trim() || 'equify';
  return `דוח_${safe}.html`;
}

export function snapshotResponseHeaders(
  resolved: ResolvedValuationData,
): Record<string, string> {
  const headers: Record<string, string> = {
    'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    'X-Render-Mode': resolved.renderMode,
  };
  if (resolved.snapshotHash) {
    headers['X-Snapshot-Hash'] = resolved.snapshotHash;
  }
  return headers;
}
