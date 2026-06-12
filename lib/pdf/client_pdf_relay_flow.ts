/**
 * PDF export controller — pipeline: server Puppeteer (primary) → client html2pdf (fallback).
 */

import type { ValuationLocale } from '../../api_client';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import {
  postUnifiedBackupRelayWithRetry,
  type UnifiedBackupRelayInput,
} from './backup_mirror';
import {
  tryGenerateValuationReportPdfClient,
  triggerPdfDownloadFromBase64,
  type SafePdfClientResult,
  type ValuationPdfClientOptions,
} from './generate_client_pdf';
import { queueLeadPersistenceBeforeExport } from './lead_persistence_queue';
import type { ReportDataOverrides } from './map_matrix_to_report_data';
import type { PdfClientIdentity } from './types';
import { VALUATION_REPORT_FILENAME } from './theme';

export interface ClientPdfRelayInput {
  captureRoot: HTMLElement | null;
  identity: PdfClientIdentity;
  valuationMidpoint: number;
  locale?: ValuationLocale;
  filename?: string;
  matrix?: ForecastMatrixWithDiagnostics;
  overrides?: ReportDataOverrides;
  industry?: string;
  sectorLabel?: string;
  sessionId?: string;
}

export interface ClientPdfRelayResult {
  pdf: SafePdfClientResult;
  relayDispatched: boolean;
}

function enablePdfCaptureMode(root: HTMLElement | null): void {
  root?.classList.add('pdf-mode', 'valubot-pdf-capturing');
  document.documentElement.classList.add('pdf-mode');
}

function disablePdfCaptureMode(root: HTMLElement | null): void {
  root?.classList.remove('pdf-mode', 'valubot-pdf-capturing');
  document.documentElement.classList.remove('pdf-mode');
}

/**
 * 1. Queue lead persistence (non-blocking, retry ×3)
 * 2. Generate PDF (Puppeteer → html2pdf fallback)
 * 3. Await backup-relay with PDF (retry ×3) — before file save
 * 4. Trigger browser download
 */
export async function executeClientPdfAndRelay(
  input: ClientPdfRelayInput,
): Promise<ClientPdfRelayResult> {
  const filename = input.filename ?? VALUATION_REPORT_FILENAME;

  queueLeadPersistenceBeforeExport({
    fullName: input.identity.fullName,
    companyName: input.identity.companyName,
    nationalId: input.identity.nationalId,
    corporateTaxId: input.identity.corporateTaxId,
    userPhone: input.identity.userPhone,
    userEmail: input.identity.userEmail,
    valuationMidpoint: input.valuationMidpoint,
    industry: input.industry,
    sectorLabel: input.sectorLabel,
    locale: input.locale,
    sessionId: input.sessionId,
  });

  enablePdfCaptureMode(input.captureRoot);

  const pdfOptions: ValuationPdfClientOptions = {
    filename,
    matrix: input.matrix,
    locale: input.locale,
    deferBrowserDownload: true,
    overrides: {
      ...input.overrides,
      clientIdentity: input.identity,
    },
  };

  let pdf: SafePdfClientResult;
  try {
    pdf = await tryGenerateValuationReportPdfClient(
      input.captureRoot,
      pdfOptions,
    );
  } finally {
    disablePdfCaptureMode(input.captureRoot);
  }

  const relayPayload: UnifiedBackupRelayInput = {
    fullName: input.identity.fullName,
    companyName: input.identity.companyName,
    nationalId: input.identity.nationalId,
    corporateTaxId: input.identity.corporateTaxId,
    userPhone: input.identity.userPhone,
    userEmail: input.identity.userEmail,
    valuationMidpoint: input.valuationMidpoint,
    industry: input.industry,
    sectorLabel: input.sectorLabel,
    locale: input.locale,
    pdfBase64: pdf.pdfBase64,
  };

  let relayDispatched = false;
  if (pdf.ok && pdf.pdfBase64) {
    const relayResult = await postUnifiedBackupRelayWithRetry(relayPayload).catch(
      (error) => {
        console.error('[PDF] backup-relay failed after retries', error);
        return null;
      },
    );
    relayDispatched = Boolean(relayResult?.response.ok);
    triggerPdfDownloadFromBase64(pdf.pdfBase64, filename);
  }

  return {
    pdf,
    relayDispatched,
  };
}
