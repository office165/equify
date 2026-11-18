import { NextResponse } from 'next/server';
import { appRouteMethodNotAllowed, jsonError } from '../../../lib/api/http';
import { isFlagOn } from '../../../lib/flags/round1_flags';
import {
  readReportAccessToken,
  verifyReportAccessToken,
} from '../../../lib/auth/report_access_token';
import { buildPdfHtml, reportPageCount } from '../../../lib/pdf-template';
import {
  buildContentDisposition,
  defaultUtf8PdfFilename,
  resolveValuationDataFromBody,
  snapshotResponseHeaders,
  type GenerateReportBody,
} from '../../../lib/pdf-template/resolve-pdf-request';
import { renderHtmlToPdfBuffer } from '../../../lib/pdf/render_html_pdf';
import { scheduleProductEvent } from '../../../lib/analytics/track_event';
import {
  REPORT_BLOCKED_CUSTOMER_MESSAGE_EN,
  REPORT_BLOCKED_CUSTOMER_MESSAGE_HE,
  ValuationReportCoherenceError,
  alertOfficeReportBlocked,
} from '../../../lib/pdf-template/validate-valuation-data';
import { withReportNarrative } from '../../../lib/narrative/opus_narrative';

export const runtime = 'nodejs';
export const maxDuration = 60;

function countReportPages(html: string): number {
  return (html.match(/class="page(?:\s|")/g) ?? []).length;
}

function pdfResponse(
  buffer: Buffer,
  filename: string,
  pages: number,
  extraHeaders: Record<string, string>,
): NextResponse {
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': buildContentDisposition(filename),
      'X-Pdf-Engine': 'puppeteer',
      'X-Report-Pages': String(pages),
      ...extraHeaders,
    },
  });
}

/** 8-page A4 PDF via Puppeteer — uses equify-report-source print CSS (.page page-break-after). */
export async function POST(request: Request) {
  let body: GenerateReportBody;
  try {
    body = (await request.json()) as GenerateReportBody;
  } catch {
    return jsonError('Invalid JSON body.', 400, 'INVALID_JSON');
  }

  if (isFlagOn('PAYWALL_V2')) {
    const token = readReportAccessToken(request, body as { reportAccessToken?: unknown });
    if (!token || !verifyReportAccessToken(token)) {
      return jsonError('Signed payment token required.', 402, 'PAYMENT_REQUIRED');
    }
  }

  const resolved = await resolveValuationDataFromBody(body);
  if ('error' in resolved) {
    const status = resolved.code === 'STALE_SNAPSHOT' ? 409 : 400;
    return jsonError(resolved.error, status, resolved.code ?? 'VALIDATION_ERROR');
  }

  const valuationData = await withReportNarrative(resolved.valuationData);
  const utf8Filename =
    body.filename ?? defaultUtf8PdfFilename(valuationData.companyName);

  let html: string;
  try {
    html = buildPdfHtml(valuationData);
  } catch (err) {
    console.error('[generate-pdf] HTML build failed', err);
    if (err instanceof ValuationReportCoherenceError) {
      alertOfficeReportBlocked(valuationData.reportId, err, 'api/generate-pdf');
      return jsonError(
        valuationData.locale === 'en' ? REPORT_BLOCKED_CUSTOMER_MESSAGE_EN : REPORT_BLOCKED_CUSTOMER_MESSAGE_HE,
        422,
        'REPORT_COHERENCE_BLOCKED',
      );
    }
    const message = err instanceof Error ? err.message : 'Report HTML build failed.';
    return jsonError(message, 500, 'REPORT_HTML_BUILD_FAILED');
  }

  const pages = countReportPages(html);
  if (pages !== reportPageCount(valuationData)) {
    console.warn(
      `[generate-pdf] Expected ${reportPageCount(valuationData)} pages, built ${pages} for ${valuationData.reportId}`,
    );
  }

  try {
    const buffer = await renderHtmlToPdfBuffer(html);
    scheduleProductEvent({
      eventType: 'pdf_downloaded',
      metadata: {
        reportId: valuationData.reportId,
        companyName: valuationData.companyName,
        pages,
        source: 'api/generate-pdf',
      },
    });
    return pdfResponse(buffer, utf8Filename, pages, snapshotResponseHeaders(resolved));
  } catch (err) {
    console.error('[generate-pdf] Puppeteer render failed', err);
    const message = err instanceof Error ? err.message : 'PDF render failed.';
    return jsonError(
      `${message} You can use Download HTML and print to PDF from your browser.`,
      503,
      'PDF_RENDER_FAILED',
    );
  }
}

export function GET() {
  return appRouteMethodNotAllowed(['POST']);
}
