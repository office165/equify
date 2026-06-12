/**
 * Valuation PDF download — server Puppeteer (primary) with html2canvas fallback.
 */

import type { ValuationLocale } from '../../api_client';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import { VALUATION_PDF_STATELESS_PATH } from '../../api_client';
import {
  captureElementToPdf,
  type CapturePdfOptions,
  type CapturePdfResult,
} from './capture_dashboard_pdf';
import type { ReportDataOverrides } from './map_matrix_to_report_data';
import { blobToPdfBase64 } from './pdf_base64';
import { VALUATION_REPORT_FILENAME } from './theme';

export type { CapturePdfOptions, CapturePdfResult };

export interface ValuationPdfClientOptions extends CapturePdfOptions {
  matrix?: ForecastMatrixWithDiagnostics;
  locale?: ValuationLocale;
  overrides?: ReportDataOverrides;
  /** Generate PDF bytes only — download after backup-relay POST completes. */
  deferBrowserDownload?: boolean;
}

export type SafePdfClientResult =
  | { ok: true; filename: string; pdfBase64: string; source: 'server' | 'client' }
  | {
      ok: false;
      filename: string;
      pdfBase64: '';
      error: unknown;
      source?: 'server' | 'client';
    };

/** Trigger a saved PDF download from a base64 payload (post-relay). */
export function triggerPdfDownloadFromBase64(
  pdfBase64: string,
  filename: string,
): void {
  if (!pdfBase64.trim() || typeof window === 'undefined') return;
  const binary = atob(pdfBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  triggerBrowserDownload(new Blob([bytes], { type: 'application/pdf' }), filename);
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function tryServerPuppeteerPdf(
  options: ValuationPdfClientOptions,
): Promise<SafePdfClientResult> {
  const filename = options.filename ?? VALUATION_REPORT_FILENAME;

  if (!options.matrix) {
    throw new Error('forecastMatrix is required for server PDF generation.');
  }

  const response = await fetch(VALUATION_PDF_STATELESS_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      forecastMatrix: options.matrix,
      locale: options.locale ?? 'he',
      overrides: options.overrides ?? {},
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message =
      (payload as { message?: string; error?: string }).message ??
      (payload as { error?: string }).error ??
      `Server PDF failed (${response.status})`;
    throw new Error(message);
  }

  const blob = await response.blob();
  if (!blob.size) {
    throw new Error('Server returned an empty PDF.');
  }

  const pdfBase64 = await blobToPdfBase64(blob);
  if (!options.deferBrowserDownload) {
    triggerBrowserDownload(blob, filename);
  }

  return { ok: true, filename, pdfBase64, source: 'server' };
}

/**
 * Capture a DOM subtree to PDF and trigger browser download (fallback path).
 */
export async function generateValuationReportPdfClient(
  captureRoot: HTMLElement,
  options: CapturePdfOptions = {},
): Promise<CapturePdfResult> {
  if (typeof window === 'undefined') {
    throw new Error('generateValuationReportPdfClient must run in the browser');
  }
  return captureElementToPdf(captureRoot, options);
}

/**
 * Server Puppeteer first, then canvas capture — never throws.
 */
export async function tryGenerateValuationReportPdfClient(
  captureRoot: HTMLElement | null,
  options: ValuationPdfClientOptions = {},
): Promise<SafePdfClientResult> {
  const filename = options.filename ?? VALUATION_REPORT_FILENAME;

  if (options.matrix) {
    try {
      return await tryServerPuppeteerPdf(options);
    } catch (error) {
      console.warn('[PDF] server Puppeteer failed — falling back to canvas', error);
    }
  }

  if (!captureRoot) {
    return {
      ok: false,
      filename,
      pdfBase64: '',
      error: new Error('No capture root for client PDF fallback.'),
      source: 'client',
    };
  }

  try {
    const result = await generateValuationReportPdfClient(captureRoot, {
      ...options,
      deferBrowserDownload: options.deferBrowserDownload ?? true,
    });
    return {
      ok: true,
      filename: result.filename,
      pdfBase64: result.pdfBase64?.trim() ?? '',
      source: 'client',
    };
  } catch (error) {
    console.error('[PDF] client canvas capture failed', error);
    return { ok: false, filename, pdfBase64: '', error, source: 'client' };
  }
}
