import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { NextResponse } from 'next/server';
import { appRouteMethodNotAllowed, jsonError } from '../../../lib/api/http';
import { buildPdfHtml } from '../../../lib/pdf-template';
import { mapWizardToValuationData } from '../../../lib/pdf-template/map-from-wizard';
import type { ValuationData } from '../../../lib/pdf-template';
import { renderHtmlToPdfBuffer } from '../../../lib/pdf/render_html_pdf';
import { renderWizardSummaryPdfBuffer } from '../../../lib/pdf/render_wizard_summary_pdf';
import type { EquifyWizardState } from '../../../lib/wizard/map_equify_wizard';
import type { ValuationLocale } from '../../../api_client';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface GeneratePdfBody {
  /** נתוני דוח מלא — עדיפות על state */
  data?: ValuationData;
  /** מצב אשף equify — ימופה ל-ValuationData + נדרש ל-fallback */
  state?: EquifyWizardState;
  reportId?: string;
  filename?: string;
  locale?: ValuationLocale;
}

/** RFC 5987 — HTTP headers are Latin1-only; non-ASCII filenames need filename*. */
function buildContentDisposition(filename: string): string {
  const asciiFallback =
    filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_') || 'report.pdf';
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function pdfResponse(
  buffer: Buffer,
  filename: string,
  engine: 'puppeteer' | 'react-pdf',
): NextResponse {
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': buildContentDisposition(filename),
      'Cache-Control': 'private, no-cache',
      'X-Pdf-Engine': engine,
    },
  });
}

/** יצירת דוח PDF — Puppeteer (7 עמודים) עם fallback ל-@react-pdf/renderer */
export async function POST(request: Request) {
  try {
    let body: GeneratePdfBody;
    try {
      body = (await request.json()) as GeneratePdfBody;
    } catch {
      return jsonError('Invalid JSON body.', 400, 'INVALID_JSON');
    }

    let valuationData: ValuationData;
    let wizardState: EquifyWizardState | undefined = body.state;

    if (body.data?.companyName) {
      valuationData = body.data;
    } else if (body.state?.profile) {
      wizardState = body.state;
      const pdfLocale = body.locale ?? 'he';
      valuationData = mapWizardToValuationData(body.state, body.reportId, pdfLocale);
    } else {
      return jsonError('data or state is required.', 400, 'VALIDATION_ERROR');
    }

    const safeName =
      body.filename ??
      `equify-${valuationData.companyName.replace(/[^\w\u0590-\u05FF]+/g, '-').slice(0, 40)}.pdf`;

    try {
      const html = buildPdfHtml(valuationData);

      let buffer: Buffer;
      if (process.env.VERCEL) {
        const chromiumWithGraphics = chromium as typeof chromium & {
          setGraphicsMode?: (enabled: boolean) => void;
        };
        chromiumWithGraphics.setGraphicsMode?.(false);

        const browser = await puppeteer.launch({
          args: chromium.args,
          executablePath: await chromium.executablePath(),
          headless: true,
        });

        try {
          buffer = await renderHtmlToPdfBuffer(html, browser);
        } finally {
          await browser.close();
        }
      } else {
        buffer = await renderHtmlToPdfBuffer(html);
      }

      return pdfResponse(buffer, safeName, 'puppeteer');
    } catch (puppeteerErr) {
      console.warn(
        '[generate-pdf] Puppeteer unavailable, falling back to react-pdf',
        puppeteerErr,
      );

      if (!wizardState?.profile) {
        return jsonError(
          'Full PDF requires Puppeteer; pass state for react-pdf fallback.',
          503,
          'PDF_ENGINE_UNAVAILABLE',
        );
      }

      const buffer = await renderWizardSummaryPdfBuffer(
        wizardState,
        body.reportId ?? valuationData.reportId,
      );
      return pdfResponse(buffer, safeName, 'react-pdf');
    }
  } catch (err) {
    console.error('[generate-pdf]', err);
    return jsonError(
      err instanceof Error ? err.message : 'PDF generation failed.',
      500,
      'PDF_GENERATION_FAILED',
    );
  }
}

export function GET() {
  return appRouteMethodNotAllowed(['POST']);
}
