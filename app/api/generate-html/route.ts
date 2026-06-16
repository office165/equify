import { NextResponse } from 'next/server';
import { appRouteMethodNotAllowed, jsonError } from '../../../lib/api/http';
import { buildPdfHtml, PDF_PAGE_COUNT } from '../../../lib/pdf-template';
import {
  buildContentDisposition,
  defaultUtf8HtmlFilename,
  resolveValuationDataFromBody,
  type GenerateReportBody,
} from '../../../lib/pdf-template/resolve-pdf-request';

export const runtime = 'nodejs';
export const maxDuration = 30;

function countReportPages(html: string): number {
  return (html.match(/class="page(?:\s|")/g) ?? []).length;
}

/** Returns the full 8-page equify-report-source HTML for browser viewing or archival. */
export async function POST(request: Request) {
  try {
    let body: GenerateReportBody;
    try {
      body = (await request.json()) as GenerateReportBody;
    } catch {
      return jsonError('Invalid JSON body.', 400, 'INVALID_JSON');
    }

    const resolved = resolveValuationDataFromBody(body);
    if ('error' in resolved) {
      return jsonError(resolved.error, 400, 'VALIDATION_ERROR');
    }

    const { valuationData } = resolved;
    const html = buildPdfHtml(valuationData);
    const pages = countReportPages(html);

    if (pages !== PDF_PAGE_COUNT) {
      console.warn(
        `[generate-html] Expected ${PDF_PAGE_COUNT} pages, built ${pages} for ${valuationData.reportId}`,
      );
    }

    const utf8Filename =
      body.filename?.replace(/\.pdf$/i, '.html') ??
      defaultUtf8HtmlFilename(valuationData.companyName);

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': buildContentDisposition(utf8Filename),
        'Cache-Control': 'private, no-cache',
        'X-Report-Pages': String(pages),
      },
    });
  } catch (err) {
    console.error('[generate-html]', err);
    return jsonError(
      err instanceof Error ? err.message : 'HTML generation failed.',
      500,
      'HTML_GENERATION_FAILED',
    );
  }
}

export function GET() {
  return appRouteMethodNotAllowed(['POST']);
}
