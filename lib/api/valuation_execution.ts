import type { ValuationCalculateRequest, ValuationLocale } from '../../api_client';
import { executeInMemoryValuation } from '../valuation/in_memory_engine';
import type { WizardValuationCalculateRequest } from '../../valuation_live';
import { scheduleValuationMarketingDispatch } from '../dispatch/valuation_marketing_worker';
import { VALUATION_PDF_FILENAME } from './handlers/valuation_generate';

export interface ValuationExecutionContact {
  email?: string | null;
  phoneE164?: string | null;
}

export interface ValuationExecutionResult {
  valuationId: string;
  forecast_matrix_json: Awaited<ReturnType<
    typeof executeInMemoryValuation
  >>['forecast_matrix_json'];
  locale: ValuationLocale;
  companyName: string;
  pdfDownloadUrl: string;
}

export function buildValuationPdfDownloadUrl(
  valuationId: string,
  locale: ValuationLocale,
  baseUrl: string,
): string {
  const root = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${root}/api/v1/reports/valuation/${valuationId}/pdf?locale=${locale}`;
}

export function resolvePublicAppBaseUrl(request?: Request): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/^https?:\/\//, '')}`;
  }
  if (request) {
    const url = new URL(request.url);
    return url.origin;
  }
  return 'http://localhost:3000';
}

/**
 * In-memory valuation pipeline — no database reads or writes.
 * PDF is generated client-side from the live dashboard (html2canvas + jsPDF).
 */
export async function runValuationExecutionPipeline(options: {
  body: ValuationCalculateRequest & { locale?: string };
  contact?: ValuationExecutionContact;
  baseUrl: string;
}): Promise<ValuationExecutionResult> {
  const locale: ValuationLocale = options.body.locale === 'he' ? 'he' : 'en';
  const wizardRequest: WizardValuationCalculateRequest = {
    ...options.body,
    locale: options.body.locale,
    contactEmail: options.contact?.email ?? undefined,
    contactPhoneE164: options.contact?.phoneE164 ?? undefined,
  };

  const result = await executeInMemoryValuation(wizardRequest);
  const companyName =
    options.body.wizard.companyName.trim() || options.body.companyId;
  const pdfDownloadUrl = buildValuationPdfDownloadUrl(
    result.valuationId,
    locale,
    options.baseUrl,
  );

  scheduleValuationMarketingDispatch({
    valuationId: result.valuationId,
    companyName,
    locale,
    forecastMatrix: result.forecast_matrix_json,
    email: options.contact?.email ?? null,
    phoneE164: options.contact?.phoneE164 ?? null,
    pdfDownloadUrl,
    pdfBuffer: null,
    recipientName: options.body.wizard.companyName.trim() || undefined,
  });

  return {
    valuationId: result.valuationId,
    forecast_matrix_json: result.forecast_matrix_json,
    locale,
    companyName,
    pdfDownloadUrl,
  };
}

export function valuationPdfResponseHeaders(valuationId: string): HeadersInit {
  return {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${VALUATION_PDF_FILENAME}"`,
    'Cache-Control': 'private, no-cache',
    'X-Valubot-Valuation-Id': valuationId,
    'X-Valubot-Pdf-Filename': VALUATION_PDF_FILENAME,
  };
}
