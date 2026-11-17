/**
 * Renders the 13 PDF cases (7 anchors, 6 golden) to <outDir> as PDF and 110 dpi PNG per page.
 * Usage: npx tsx tests/pdf/render.ts reports/round-2/pdf-before
 */
import path from 'path';
import { EXPECTED_PAGES, ROOT, launch, pdfCases, rasterizerStatus, renderCase } from './pdf_harness';

async function main(): Promise<void> {
  const outDir = path.resolve(ROOT, process.argv[2] ?? 'tmp/pdf-render');
  const browser = await launch();
  console.log(`render: ${rasterizerStatus()}`);
  let bad = 0;
  try {
    for (const spec of pdfCases()) {
      const t0 = Date.now();
      const pages = await renderCase(browser, spec, outDir);
      if (pages !== EXPECTED_PAGES) bad += 1;
      console.log(`${pages === EXPECTED_PAGES ? 'OK ' : 'BAD'} ${spec.id}: ${pages} pages (${Date.now() - t0}ms)`);
    }
  } finally {
    await browser.close();
  }
  console.log(`written to ${path.relative(ROOT, outDir)}`);
  process.exit(bad ? 1 : 0);
}

void main();
