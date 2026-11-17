/**
 * Round 3, part D: PDFs and layout after the round.
 *   npx tsx scripts/round-3/render-after.ts
 *
 * 1. The 13 baseline cases with METHOD_V2 off, and 4 with METHOD_V2=on (restaurant, young factory,
 *    SaaS, 1B company), each with the DOM layout check (8 pages, nothing overflows, the page 4
 *    private company lines are one line each).
 * 2. Methodology 1 must not move: every V1 page is compared in pixels with
 *    reports/round-2/pdf-after/<id>-pN.png. The V1 files are rendered to a temporary folder and
 *    not kept (they equal round 2).
 * 3. Methodology 2 PDFs and PNGs go to reports/round-3/pdf-after/<id>-v2.*, compared with
 *    round 2's <id>-v2 pages. Summary in reports/round-3/pdf-compare.md.
 * A pixel differs when any channel differs by more than 24 (same rule as round 2).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import sharp from 'sharp';
import { EXPECTED_PAGES, ROOT, caseHtml, checkLayout, launch, pdfCases, rasterizerStatus, renderCase } from '../../tests/pdf/pdf_harness';

const V2_CASES = ['anchor-1-restaurant', 'anchor-5-young-factory', 'anchor-2-saas', 'golden-large-industrial'];
const ROUND2 = path.join(ROOT, 'reports', 'round-2', 'pdf-after');
const OUT = path.join(ROOT, 'reports', 'round-3', 'pdf-after');

async function diffPct(a: string, b: string): Promise<number | null> {
  if (!fs.existsSync(a) || !fs.existsSync(b)) return null;
  const load = async (f: string) => sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const A = await load(a);
  const B = await load(b);
  if (A.info.width !== B.info.width || A.info.height !== B.info.height) return 100;
  let n = 0;
  for (let i = 0; i < A.data.length; i += 3) {
    if (Math.abs(A.data[i] - B.data[i]) > 24 || Math.abs(A.data[i + 1] - B.data[i + 1]) > 24 || Math.abs(A.data[i + 2] - B.data[i + 2]) > 24) n += 1;
  }
  return (n / (A.data.length / 3)) * 100;
}

async function main(): Promise<void> {
  const v1Dir = fs.mkdtempSync(path.join(os.tmpdir(), 'equify-r3-v1-'));
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch();
  const raster = rasterizerStatus();
  console.log(`render: ${raster}`);
  const lines: string[] = [];
  let bad = 0;
  const original = process.env.METHOD_V2;
  const layoutRows: string[] = [];
  const v1Rows: string[] = [];
  const v2Rows: string[] = [];
  try {
    const jobs = [
      ...pdfCases().map((spec) => ({ spec, v2: false })),
      ...pdfCases().filter((c) => V2_CASES.includes(c.id)).map((spec) => ({ spec, v2: true })),
    ];
    for (const { spec, v2 } of jobs) {
      process.env.METHOD_V2 = v2 ? 'on' : 'off';
      const fileId = v2 ? `${spec.id}-v2` : spec.id;
      const layout = await checkLayout(browser, caseHtml(spec));
      const pages = await renderCase(browser, spec, v2 ? OUT : v1Dir, fileId);
      const problems = [
        ...(pages !== EXPECTED_PAGES ? [`${pages} pages`] : []),
        ...(layout.htmlPages !== EXPECTED_PAGES ? [`${layout.htmlPages} html pages`] : []),
        ...(!layout.assistantLoaded ? ['Assistant not loaded'] : []),
        ...layout.issues.map((i) => `page ${i.page} ${i.kind}: ${i.detail}`),
      ];
      if (problems.length) bad += 1;
      layoutRows.push(`| ${fileId} | ${v2 ? 'V2' : 'V1'} | ${pages} | ${problems.length ? problems.slice(0, 4).join('; ') : 'עובר'} |`);
      console.log(`${problems.length ? 'BAD' : 'OK '} ${fileId}${problems.length ? `: ${problems.slice(0, 6).join('; ')}` : ''}`);

      const diffs: string[] = [];
      for (let p = 1; p <= EXPECTED_PAGES; p += 1) {
        const mine = path.join(v2 ? OUT : v1Dir, `${fileId}-p${p}.png`);
        const theirs = path.join(ROUND2, `${fileId}-p${p}.png`);
        const d = await diffPct(mine, theirs);
        diffs.push(d == null ? 'n/a' : d < 0.005 ? '0' : d.toFixed(2));
      }
      (v2 ? v2Rows : v1Rows).push(`| ${fileId} | ${diffs.join(' | ')} |`);
    }
  } finally {
    if (original === undefined) delete process.env.METHOD_V2;
    else process.env.METHOD_V2 = original;
    await browser.close();
    fs.rmSync(v1Dir, { recursive: true, force: true });
  }

  const head = `| תיק | ${Array.from({ length: EXPECTED_PAGES }, (_, i) => `ע' ${i + 1}`).join(' | ')} |`;
  const sep = `|---|${Array.from({ length: EXPECTED_PAGES }, () => '---').join('|')}|`;
  lines.push(
    '# סבב 3: PDF אחרי הסבב, ובדיקת פריסה',
    '',
    `נוצר על ידי \`npx tsx scripts/round-3/render-after.ts\` (${raster}). פיקסל שונה: ערוץ שזז ביותר מ 24, כמו בסבב 2. הערכים הם אחוז הפיקסלים שהשתנו בעמוד.`,
    '',
    '## בדיקת פריסה (17 הפקות)',
    '',
    '| קובץ | מתודולוגיה | עמודים | תוצאה |',
    '|---|---|---|---|',
    ...layoutRows,
    '',
    '## V1 מול סבב 2 (`reports/round-2/pdf-after/<id>`)',
    '',
    'V1 לא אמור לזוז. קובצי ה V1 של הסבב הזה לא נשמרים, כי הם זהים לסבב 2.',
    '',
    head,
    sep,
    ...v1Rows,
    '',
    '## V2 מול V2 של סבב 2 (`reports/round-2/pdf-after/<id>-v2`)',
    '',
    'הקבצים ב `reports/round-3/pdf-after/`.',
    '',
    head,
    sep,
    ...v2Rows,
    '',
  );
  fs.writeFileSync(path.join(ROOT, 'reports', 'round-3', 'pdf-compare.md'), lines.join('\n'));
  process.exit(bad ? 1 : 0);
}

void main();
