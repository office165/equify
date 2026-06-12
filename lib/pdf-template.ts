import { escHtml } from './pdf/print/print_formatters';
import { buildAllPages, PDF_PAGE_COUNT } from './pdf-template/pages';
import { buildPdfTemplateCss } from './pdf-template/styles';
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

export { PDF_PAGE_COUNT };

/**
 * בונה HTML מלא להדפסה — 8 עמודים עם כל ה-SVG charts.
 * מיועד לשימוש עם Puppeteer/Playwright ב-`app/api/generate-pdf/route.ts`.
 */
export function buildPdfHtml(data: ValuationData): string {
  const title = `equify — דוח הערכת שווי — ${escHtml(data.companyName)}`;
  const css = buildPdfTemplateCss();
  const pages = buildAllPages(data);

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
