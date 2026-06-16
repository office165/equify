import type { ValuationLocale } from '../../api_client';
import type { EquifyWizardState } from '../wizard/map_equify_wizard';
import { mapWizardToValuationData } from './map-from-wizard';
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
  reportId?: string;
  filename?: string;
  locale?: ValuationLocale;
}

function isValuationDataShape(data: unknown): data is ValuationData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return typeof d.companyName === 'string' && typeof d.equity === 'number';
}

export function resolveValuationDataFromBody(body: GenerateReportBody): {
  valuationData: ValuationData;
} | { error: string } {
  if (isEquifyReportApiPayload(body)) {
    return { valuationData: mapApiPayloadToValuationData(body) };
  }

  if (isValuationDataShape(body.data)) {
    return { valuationData: body.data };
  }

  if (body.state?.profile) {
    const pdfLocale = body.locale ?? body.language ?? 'he';
    return {
      valuationData: mapWizardToValuationData(body.state, body.reportId, pdfLocale),
    };
  }

  return {
    error: 'Provide companyName+data (API payload), data (ValuationData), or state (wizard).',
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
