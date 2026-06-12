import { NextResponse } from 'next/server';
import { buildPrintReportHtml } from '../../../../lib/pdf/print/build_print_report_html';
import { getStashedPrintPayload } from '../../../../lib/pdf/report_print_cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const payload = getStashedPrintPayload(decodeURIComponent(id));
  if (!payload) {
    return new NextResponse('Report payload not found or expired.', { status: 404 });
  }

  const html = buildPrintReportHtml(payload.data, {
    matrix: payload.matrix,
    locale: payload.locale,
  });

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
