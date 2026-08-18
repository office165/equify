import { buildPdfHtml } from '../pdf-template';
import type { ValuationData } from '../pdf-template/types';
import { renderHtmlToPdfBuffer } from '../pdf/render_html_pdf';

/** Shared Puppeteer render used by deliver + dispatch. */
export async function renderEquifyReportPdfBuffer(
  valuationData: ValuationData,
): Promise<Buffer> {
  const html = buildPdfHtml(valuationData);
  return renderHtmlToPdfBuffer(html);
}
