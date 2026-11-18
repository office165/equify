import { buildPdfHtml } from '../pdf-template';
import type { ValuationData } from '../pdf-template/types';
import { renderHtmlToPdfBuffer } from '../pdf/render_html_pdf';
import { withReportNarrative } from '../narrative/opus_narrative';

/** Shared Puppeteer render used by deliver + dispatch. */
export async function renderEquifyReportPdfBuffer(
  valuationData: ValuationData,
): Promise<Buffer> {
  // Round 7: with OPUS_NARRATIVE on, the same stored narrative as the download (lib/narrative).
  const html = buildPdfHtml(await withReportNarrative(valuationData));
  return renderHtmlToPdfBuffer(html);
}
