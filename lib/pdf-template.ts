import { escHtml } from './pdf/print/print_formatters';
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
 * בונה HTML מלא להדפסה — 7 עמודי A4 (equify-pdf.html) עם SVG דינמי.
 * מיועד לשימוש עם Puppeteer ב-`app/api/generate-pdf/route.ts`.
 */
export function buildPdfHtml(data: ValuationData): string {
  const title = `equify — דוח הערכת שווי — ${escHtml(data.companyName)}`;
  const css = buildEquifyPdfCss();
  const pages = buildEquifyPdfPages(data);

  return `<!DOCTYPE html>
<html lang="${data.locale ?? 'he'}" dir="rtl">
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
