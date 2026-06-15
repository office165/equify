import {
  escHtml,
  pdfDocumentDir,
  resolvePdfLocale,
} from './pdf/print/print_formatters';
import { buildEquifyPdfPages, EQUIFY_PDF_PAGE_COUNT } from './pdf-template/equify-pdf-pages';
import { buildEquifyPdfCss } from './pdf-template/equify-pdf-styles';
import type { ValuationData } from './pdf-template/types';

export type { ValuationData } from './pdf-template/types';
export type {
  CompTransactionRow,
  DcfYearRow,
  EbitdaSensitivityMatrix,
  ModelBlendRow,
  MultiplePositionRow,
  QualityFactorRow,
  ScenarioKey,
  ScenarioRow,
  SensitivityMatrix,
  TrajectoryPoint,
  WaccSegment,
} from './pdf-template/types';

export const PDF_PAGE_COUNT = EQUIFY_PDF_PAGE_COUNT;

/**
 * בונה HTML מלא להדפסה — 8 עמודי A4 (equify-report-source) עם SVG דינמי.
 * מיועד לשימוש עם Puppeteer ב-`app/api/generate-pdf/route.ts`.
 */
export function buildPdfHtml(data: ValuationData): string {
  const locale = resolvePdfLocale(data.locale);
  const dir = pdfDocumentDir(locale);
  const title = locale === 'en'
    ? `equify — Valuation Report — ${escHtml(data.companyName)}`
    : `equify — דוח הערכת שווי — ${escHtml(data.companyName)}`;
  const css = buildEquifyPdfCss();
  const pages = buildEquifyPdfPages(data);

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="UTF-8"/>
  <meta name="robots" content="noindex, nofollow"/>
  <title>${title}</title>
  <style>${css}</style>
</head>
<body>
${pages}
</body>
</html>`;
}
