/**
 * Typed entry for the server-side 7-page A4 valuation PDF view layer.
 * Puppeteer renders HTML from `buildValuationPdfTemplateHtml` — not this React tree.
 */
export {
  buildValuationPdfTemplateHtml,
  VALUATION_PDF_SHEET_COUNT,
  type BuildValuationPdfTemplateOptions,
  type ValuationPdfViewModel,
} from '../../lib/pdf/print/valuation_pdf_template';

export type { ValuationReportData as ValuationPdfTemplateData } from '../../lib/pdf/types';
