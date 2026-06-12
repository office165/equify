import type { ValuationLocale } from '../../api_client';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import { getBrowser } from './getBrowser';
import { buildPrintReportHtml } from './print/build_print_report_html';
import type { ValuationReportData } from './types';

const PDF_VIEWPORT_WIDTH = 794;
const PDF_VIEWPORT_HEIGHT = 1123;

export interface RenderPdfOptions {
  matrix: ForecastMatrixWithDiagnostics;
  locale?: ValuationLocale;
}

export async function renderValuationPdfBuffer(
  data: ValuationReportData,
  options: RenderPdfOptions,
): Promise<Buffer> {
  const locale = options.locale ?? 'he';
  const html = buildPrintReportHtml(data, {
    matrix: options.matrix,
    locale,
  });

  const browser = await getBrowser();

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: PDF_VIEWPORT_WIDTH,
      height: PDF_VIEWPORT_HEIGHT,
      deviceScaleFactor: 1,
    });
    await page.emulateMediaType('print');

    await page.setContent(html, {
      waitUntil: 'networkidle0' as 'load',
      timeout: 45_000,
    });

    const fontsReadyHandle = await page.evaluateHandle(
      () => document.fonts.ready,
    );
    await fontsReadyHandle.evaluate(async (ready) => {
      await (ready as unknown as Promise<FontFaceSet>);
    });
    await fontsReadyHandle.dispose();

    await new Promise((resolve) => setTimeout(resolve, 200));

    const pdfUint8 = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      },
    });

    return Buffer.from(pdfUint8);
  } finally {
    await browser.close();
  }
}
