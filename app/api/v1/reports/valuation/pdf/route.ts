import '@sparticuz/chromium';
import 'puppeteer-core';
import type { ValuationLocale } from '../../../../../../api_client';
import type { ForecastMatrixWithDiagnostics } from '../../../../../../valuation_forecast';
import {
  appRouteMethodNotAllowed,
  jsonError,
} from '../../../../../../lib/api/http';
import type { ReportDataOverrides } from '../../../../../../lib/pdf/map_matrix_to_report_data';
import { buildValuationReportPdf } from '../../../../../../lib/pdf/valuation_report_pdf';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface ValuationPdfRequestBody {
  forecastMatrix?: ForecastMatrixWithDiagnostics;
  locale?: ValuationLocale;
  overrides?: ReportDataOverrides;
}

export async function POST(request: Request) {
  let body: ValuationPdfRequestBody;

  try {
    body = (await request.json()) as ValuationPdfRequestBody;
  } catch {
    return jsonError('Invalid JSON body.', 400, 'INVALID_JSON');
  }

  if (!body.forecastMatrix) {
    return jsonError('forecastMatrix is required.', 400, 'MISSING_MATRIX');
  }

  const locale = body.locale ?? 'he';

  try {
    const pdfBuffer = await buildValuationReportPdf(
      body.forecastMatrix,
      locale,
      body.overrides ?? {},
    );

    if (!pdfBuffer.length) {
      return jsonError('PDF buffer is empty.', 500, 'PDF_EMPTY');
    }

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition':
          'attachment; filename="Equify_Valuation_Report.pdf"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[PDF] Puppeteer generation failed', error);
    return jsonError(
      error instanceof Error ? error.message : 'PDF generation failed.',
      500,
      'PDF_GENERATION_FAILED',
    );
  }
}

export function GET() {
  return appRouteMethodNotAllowed(['POST']);
}
