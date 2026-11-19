/**
 * Round 14, stage 2: the credit chapter of CAL-001 in the four combinations of CREDIT_CFADS and
 * CREDIT_DISCOUNTING, as numbers (for reports/round-14/orly-questions.md) and, with --pdf, as PDFs of
 * the chapter page. CAL-001 is a real case: its file and the PDFs stay in sbc_sync/ (outside git).
 *
 *   npx tsx scripts/round-14/credit-cal001.ts [--pdf]
 *
 * Credit answers: CAL-001 has none, so the PDF harness's basic answers are used (a monthly loan
 * payment of 0.6% of the gross debt, no owner loans, no lien) and the case's subsidiary.
 * Methodology 1, CREDIT_CHAPTER=on, static FX.
 */
import fs from 'fs';
import path from 'path';
import { mapWizardToValuationData } from '../../lib/pdf-template/map-from-wizard';
import { buildPdfHtml } from '../../lib/pdf-template';
import { caseStateFor, validateCase } from '../calibration/run';
import { withQuietConsole } from '../../tests/lib/quiet';
import { TEST_FX } from '../../tests/lib/run_case';
import { COMBOS } from '../../tests/suites/round14_credit';

const ROOT = path.join(__dirname, '..', '..');
const CASE = path.join(ROOT, 'sbc_sync', 'calibration', 'CAL-001.json');
const OUT = path.join(ROOT, 'sbc_sync', 'calibration', 'round-14-credit');

async function main() {
  if (!fs.existsSync(CASE)) {
    console.error('CAL-001.json not found (sbc_sync/calibration, outside git).');
    process.exit(2);
  }
  const c = validateCase(JSON.parse(fs.readFileSync(CASE, 'utf8')));
  const pdf = process.argv.includes('--pdf');
  process.env.CREDIT_CHAPTER = 'on';
  process.env.METHOD_V2 = 'off';
  const rows: Array<Record<string, unknown>> = [];
  const htmls: Array<[string, string]> = [];
  for (const combo of COMBOS) {
    process.env.CREDIT_CFADS = combo.cfads;
    process.env.CREDIT_DISCOUNTING = combo.disc;
    const state = caseStateFor(c);
    state.credit = {
      monthlyDebtServiceK: Math.round((state.financials.grossDebtK ?? 0) * 0.006),
      ownerLoans: { has: false, amountK: 0 },
      liens: { has: false, holder: '', type: '' },
      nonOperating: state.credit?.nonOperating ?? { has: false, holdingPct: 0, preTaxProfitK: 0, estimatedValueK: 0 },
    };
    const d = withQuietConsole(() => mapWizardToValuationData(state, 'CAL-001', 'he', TEST_FX));
    const ch = d.creditChapter!;
    rows.push({ combo: `${combo.cfads}/${combo.disc}`, ebitda: ch.today.ebitda, tax: ch.today.tax, capex: ch.today.maintenanceCapex, cfads: ch.today.cfads, capacity: ch.today.capacity, ceiling: ch.ceiling, firstStage: ch.firstStage, monthly: ch.firstStageMonthly, dscr: ch.dscr, minDscr: ch.minDscr, term: ch.termYears, rate: ch.ratePct, binding: ch.binding, equity: d.equity });
    if (pdf) htmls.push([`CAL-001-credit-${combo.cfads}-${combo.disc}`, withQuietConsole(() => buildPdfHtml(d))]);
  }
  console.log(JSON.stringify(rows, null, 1));
  if (!pdf) return;
  const { launch } = await import('../../tests/pdf/pdf_harness');
  const PDF_VIEWPORT_WIDTH = 794; // as lib/pdf/render_html_pdf.ts
  const PDF_VIEWPORT_HEIGHT = 1123;
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch();
  try {
    for (const [name, html] of htmls) {
      // The same settings as renderHtmlToPdfBuffer (/api/generate-pdf), keeping page 4, the chapter.
      const page = await browser.newPage();
      await page.setViewport({ width: PDF_VIEWPORT_WIDTH, height: PDF_VIEWPORT_HEIGHT, deviceScaleFactor: 1 });
      await page.emulateMediaType('print');
      await page.setContent(html, { waitUntil: 'load', timeout: 60_000 });
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      await new Promise((r) => setTimeout(r, 350));
      const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, margin: { top: 0, bottom: 0, left: 0, right: 0 }, pageRanges: '4' });
      await page.close();
      fs.writeFileSync(path.join(OUT, `${name}.pdf`), pdf);
      console.log('wrote', path.relative(ROOT, path.join(OUT, `${name}.pdf`)));
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack : err);
  process.exit(1);
});
