/**
 * Round 2, part E: PDFs after the round.
 *   npx tsx scripts/round-2/render-after.ts
 * The 13 baseline cases with METHOD_V2 off -> reports/round-2/pdf-after/<id>.pdf (+ PNG),
 * and 4 cases with METHOD_V2=on (restaurant, young factory, SaaS, 1B company) -> <id>-v2.pdf.
 * Every case also runs the DOM layout check (8 pages, nothing overflows).
 */
import path from 'path';
import { EXPECTED_PAGES, ROOT, caseHtml, checkLayout, launch, pdfCases, rasterizerStatus, renderCase } from '../../tests/pdf/pdf_harness';

const V2_CASES = ['anchor-1-restaurant', 'anchor-5-young-factory', 'anchor-2-saas', 'golden-large-industrial'];

async function main(): Promise<void> {
  const outDir = path.join(ROOT, 'reports', 'round-2', 'pdf-after');
  const browser = await launch();
  console.log(`render: ${rasterizerStatus()}`);
  let bad = 0;
  const original = process.env.METHOD_V2;
  try {
    const jobs = [
      ...pdfCases().map((spec) => ({ spec, v2: false })),
      ...pdfCases().filter((c) => V2_CASES.includes(c.id)).map((spec) => ({ spec, v2: true })),
    ];
    for (const { spec, v2 } of jobs) {
      process.env.METHOD_V2 = v2 ? 'on' : 'off';
      // Same case id (and report id in the header) as the methodology 1 PDF; only the file name differs.
      const fileId = v2 ? `${spec.id}-v2` : spec.id;
      const layout = await checkLayout(browser, caseHtml(spec));
      const pages = await renderCase(browser, spec, outDir, fileId);
      const problems = [
        ...(pages !== EXPECTED_PAGES ? [`${pages} pages`] : []),
        ...(layout.htmlPages !== EXPECTED_PAGES ? [`${layout.htmlPages} html pages`] : []),
        ...(!layout.assistantLoaded ? ['Assistant not loaded'] : []),
        ...layout.issues.map((i) => `page ${i.page} ${i.kind}: ${i.detail}`),
      ];
      if (problems.length) bad += 1;
      console.log(`${problems.length ? 'BAD' : 'OK '} ${fileId}${problems.length ? `: ${problems.slice(0, 6).join('; ')}` : ''}`);
    }
  } finally {
    if (original === undefined) delete process.env.METHOD_V2;
    else process.env.METHOD_V2 = original;
    await browser.close();
  }
  process.exit(bad ? 1 : 0);
}

void main();
