/**
 * npm run test:pdf-layout: real Chrome layout checks on the 13 PDF cases.
 * Per case: the PDF has exactly 8 pages, no element or text overflows its page, tables and
 * boxes do not scroll, no text is clipped by overflow:hidden, and the Assistant font loaded.
 * Runs separately from npm test (it needs Chrome and Google Fonts, and takes longer than 60s).
 * Without swiftc (outside macOS) it still runs: Puppeteer renders the PDF, the overflow checks run
 * in the DOM, the page count is read from the PDF, and only the PNG images are skipped.
 */
import path from 'path';
import { ROOT, caseHtml, checkLayout, creditMode, expectedPages, launch, pdfCases, rasterizerStatus, renderCase } from './pdf_harness';

async function main(): Promise<void> {
  const t0 = Date.now();
  const browser = await launch();
  const failures: string[] = [];
  console.log(`pdf-layout: ${rasterizerStatus()}${creditMode() ? ', CREDIT_CHAPTER on' : ''}`);
  try {
    for (const spec of pdfCases()) {
      const html = caseHtml(spec);
      const EXPECTED_PAGES = expectedPages(spec);
      const layout = await checkLayout(browser, html);
      const pdfPages = await renderCase(browser, spec, path.join(ROOT, 'tmp', 'pdf-layout'));
      const caseFailures: string[] = [];
      if (pdfPages !== EXPECTED_PAGES) caseFailures.push(`PDF has ${pdfPages} pages, expected ${EXPECTED_PAGES}`);
      if (layout.htmlPages !== EXPECTED_PAGES) caseFailures.push(`HTML has ${layout.htmlPages} .page, expected ${EXPECTED_PAGES}`);
      if (!layout.assistantLoaded) caseFailures.push('Assistant font not loaded');
      for (const i of layout.issues) caseFailures.push(`page ${i.page} ${i.kind}: ${i.detail}`);
      console.log(`[${caseFailures.length ? 'FAIL' : 'PASS'}] ${spec.id}`);
      for (const f of caseFailures.slice(0, 15)) console.log(`    ${f}`);
      if (caseFailures.length > 15) console.log(`    ... ${caseFailures.length - 15} more`);
      failures.push(...caseFailures.map((f) => `${spec.id}: ${f}`));
    }
  } finally {
    await browser.close();
  }
  console.log(`\npdf-layout: ${failures.length} failure(s), ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  process.exit(failures.length ? 1 : 0);
}

void main();
