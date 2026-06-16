/**
 * Generate Hebrew + English sample report PDFs locally via Puppeteer.
 *
 * Requires a Chrome/Chromium binary. If none is installed system-wide, run once:
 *   ./node_modules/.bin/puppeteer browsers install chrome
 *
 * Usage: jiti scripts/test-sample-report-pdf.ts
 */

import fs from 'fs';
import path from 'path';
import { buildPdfHtml, PDF_PAGE_COUNT } from '../lib/pdf-template';
import { mapApiPayloadToValuationData } from '../lib/pdf-template/map-from-api';
import {
  SAMPLE_REPORT_PAYLOAD,
  SAMPLE_REPORT_PAYLOAD_EN,
} from '../lib/pdf-template/sample-report-fixture';
import { renderHtmlToPdfBuffer } from '../lib/pdf/render_html_pdf';
import { getBrowser } from '../lib/pdf/getBrowser';
import { probeLocalChromeExecutable } from '../lib/pdf/resolve_chrome_executable';

async function resolveChromeForLocalPdf(): Promise<void> {
  if (process.env.PUPPETEER_EXECUTABLE_PATH || probeLocalChromeExecutable()) return;
  try {
    const puppeteer = await import('puppeteer');
    const bundled = await puppeteer.default.executablePath();
    const fs = await import('fs');
    if (fs.existsSync(bundled)) {
      process.env.PUPPETEER_EXECUTABLE_PATH = bundled;
    }
  } catch {
    // Fall through to getBrowser() / @sparticuz/chromium
  }
}

async function writePdf(
  label: string,
  payload: typeof SAMPLE_REPORT_PAYLOAD,
  pdfFilename: string,
  htmlFilename: string,
  browser: Awaited<ReturnType<typeof getBrowser>>,
) {
  const valuationData = mapApiPayloadToValuationData(payload);
  const html = buildPdfHtml(valuationData);
  const outDir = path.join(process.cwd(), 'uploads');
  fs.mkdirSync(outDir, { recursive: true });

  const htmlPath = path.join(outDir, htmlFilename);
  fs.writeFileSync(htmlPath, html, 'utf8');

  const pdfBuffer = await renderHtmlToPdfBuffer(html, browser);
  const pdfPath = path.join(outDir, pdfFilename);
  fs.writeFileSync(pdfPath, pdfBuffer);

  const pages = (html.match(/class="page(?:\s|")/g) ?? []).length;
  console.log(`${label}:`);
  console.log(`  HTML: ${htmlPath}`);
  console.log(`  PDF:  ${pdfPath} (${pdfBuffer.length} bytes, ${pages}/${PDF_PAGE_COUNT} pages)`);
  console.log(`  dir=${html.match(/dir="(rtl|ltr)"/)?.[1]} company=${valuationData.companyName}`);
}

async function main() {
  await resolveChromeForLocalPdf();
  const chrome = probeLocalChromeExecutable();
  console.log(
    chrome
      ? `Using Chrome: ${chrome.path} (${chrome.source})`
      : 'No local Chrome found — falling back to @sparticuz/chromium',
  );

  const browser = await getBrowser();
  try {
    await writePdf(
      'Hebrew',
      SAMPLE_REPORT_PAYLOAD,
      'sample-report-he.pdf',
      'sample-report-preview.html',
      browser,
    );
    await writePdf(
      'English',
      SAMPLE_REPORT_PAYLOAD_EN,
      'sample-report-en.pdf',
      'sample-report-preview-en.html',
      browser,
    );
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
