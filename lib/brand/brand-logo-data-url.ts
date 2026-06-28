import fs from 'fs';
import path from 'path';

const PDF_LOGO_FILE = 'equify_print_logo_8x.png';

let cachedPdfDataUrl: string | null = null;

/** Inline PNG data URL for Puppeteer PDF HTML (reliable vs SVG in print). */
export function equifyPdfLogoDataUrl(): string {
  if (cachedPdfDataUrl) return cachedPdfDataUrl;
  const filePath = path.join(process.cwd(), 'public', PDF_LOGO_FILE);
  const buf = fs.readFileSync(filePath);
  cachedPdfDataUrl = `data:image/png;base64,${buf.toString('base64')}`;
  return cachedPdfDataUrl;
}

/** @deprecated Use {@link equifyPdfLogoDataUrl} for PDF output. */
export function equifyStackedLogoDataUrl(): string {
  return equifyPdfLogoDataUrl();
}
