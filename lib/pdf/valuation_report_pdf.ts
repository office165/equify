import type { ValuationLocale } from '../../api_client';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import { buildPdfHtml } from './buildPdfHtml';
import {
  mapMatrixToReportData,
  type ReportDataOverrides,
} from './map_matrix_to_report_data';
import { renderValuationPdfBuffer } from './render_pdf_puppeteer';

export const CLIENT_PDF_REQUIRED_MESSAGE =
  'Valuation PDF generation failed. Retry download or contact support.';

export { buildPdfHtml };
export type { ValuationReportData, PdfClientIdentity } from './types';

export async function buildValuationReportPdf(
  matrix: ForecastMatrixWithDiagnostics,
  locale: ValuationLocale = 'he',
  overrides: ReportDataOverrides = {},
): Promise<Buffer> {
  const data = mapMatrixToReportData(matrix, locale, overrides);
  return renderValuationPdfBuffer(data, { matrix, locale });
}
