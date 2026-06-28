import { NextResponse } from 'next/server';
import { appRouteMethodNotAllowed, jsonError } from '../../../lib/api/http';
import { buildPdfHtml, PDF_PAGE_COUNT } from '../../../lib/pdf-template';
import {
  buildContentDisposition,
  defaultUtf8PdfFilename,
  resolveValuationDataFromBody,
  snapshotResponseHeaders,
  type GenerateReportBody,
} from '../../../lib/pdf-template/resolve-pdf-request';
import { renderHtmlToPdfBuffer } from '../../../lib/pdf/render_html_pdf';

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

  const resolved = await resolveValuationDataFromBody(body);
  if ('error' in resolved) {
    const status = resolved.code === 'STALE_SNAPSHOT' ? 409 : 400;
    return jsonError(resolved.error, status, resolved.code ?? 'VALIDATION_ERROR');
  }

  const { valuationData } = resolved;
  const utf8Filename =
    body.filename ?? defaultUtf8PdfFilename(valuationData.companyName);

  let html: string;
  try {
    html = buildPdfHtml(valuationData);
  } catch (err) {
    console.error('[generate-pdf] HTML build failed', err);
    const message = err instanceof Error ? err.message : 'Report HTML build failed.';
    return jsonError(message, 500, 'REPORT_HTML_BUILD_FAILED');
  }

  const pages = countReportPages(html);
  if (pages !== PDF_PAGE_COUNT) {
    console.warn(
      `[generate-pdf] Expected ${PDF_PAGE_COUNT} pages, built ${pages} for ${valuationData.reportId}`,
    );
  }

  try {
    const buffer = await renderHtmlToPdfBuffer(html);
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
