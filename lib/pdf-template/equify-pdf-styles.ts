import fs from 'fs';
import path from 'path';

let cachedCss: string | null = null;

/** Print CSS from equify-report-source.html + dynamic page-builder aliases */
export function buildEquifyPdfCss(): string {
  if (cachedCss) return cachedCss;
  const cssPath = path.join(process.cwd(), 'lib/pdf-template/equify-report-print.css');
  cachedCss = fs.readFileSync(cssPath, 'utf8');
  return cachedCss;
}
