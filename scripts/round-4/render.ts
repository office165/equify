/**
 * Round 4: PDFs and pixel checks.
 *   npx tsx scripts/round-4/render.ts v1-identity
 *     The 13 baseline cases with METHOD_V2 off and CREDIT_CHAPTER off, compared page by page with
 *     reports/round-2/pdf-after/<id>-pN.png (round 3 equals round 2 in pixels). Files are rendered
 *     to a temporary folder and not kept. Optional: PAGES_EXCEPT=5 skips a page that changed on
 *     purpose (part D), and reports its diff separately.
 *   npx tsx scripts/round-4/render.ts credit
 *     4 cases with CREDIT_CHAPTER on (restaurant, factory, SaaS, and the case with a subsidiary and
 *     owner loans) to reports/round-4/pdf-credit/, with the layout check.
 *   npx tsx scripts/round-4/render.ts page5 <before|after>
 *     Page 5 of one case (the restaurant) to reports/round-4/page5-<before|after>.png and .pdf
 *     ("before" was rendered from the round 3 commit, the same day, with this mode).
 * A pixel differs when any channel differs by more than 24 (same rule as rounds 2 and 3).
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import sharp from 'sharp';
import { CREDIT_FULL_CASE_ID, ROOT, caseHtml, checkLayout, expectedPages, launch, pdfCases, rasterizerStatus, renderCase } from '../../tests/pdf/pdf_harness';

const ROUND2 = path.join(ROOT, 'reports', 'round-2', 'pdf-after');
const OUT = path.join(ROOT, 'reports', 'round-4');

export async function diffPct(a: string, b: string): Promise<number | null> {
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

function setFlags(credit: boolean, v2: boolean): void {
  process.env.CREDIT_CHAPTER = credit ? 'on' : 'off';
  process.env.METHOD_V2 = v2 ? 'on' : 'off';
  delete process.env.NEXT_PUBLIC_CREDIT_CHAPTER;
}

async function v1Identity(): Promise<number> {
  setFlags(false, false);
  const except = new Set((process.env.PAGES_EXCEPT ?? '').split(',').map((x) => Number(x.trim())).filter(Boolean));
  const dir = process.env.RENDER_DIR ?? fs.mkdtempSync(path.join(os.tmpdir(), 'equify-r4-v1-'));
  fs.mkdirSync(dir, { recursive: true });
  // BASELINE_DIR: compare with a render of the round 3 commit made the same day (the report date
  // is printed on pages 1, 2 and 8, so the round 2 files differ by the date alone).
  const base = process.env.BASELINE_DIR ?? ROUND2;
  const browser = await launch();
  let changed = 0;
  const rows: string[] = [];
  try {
    for (const spec of pdfCases()) {
      const pages = await renderCase(browser, spec, dir, spec.id);
      const diffs: string[] = [];
      for (let p = 1; p <= 8; p += 1) {
        const d = await diffPct(path.join(dir, `${spec.id}-p${p}.png`), path.join(base, `${spec.id}-p${p}.png`));
        const shown = d == null ? 'n/a' : d === 0 ? '0' : d.toFixed(3);
        diffs.push(shown);
        if (!except.has(p) && (d == null || d > 0)) changed += 1;
      }
      rows.push(`${spec.id} (${pages} pages): ${diffs.join(' | ')}`);
      console.log(rows.at(-1));
    }
  } finally {
    await browser.close();
  }
  console.log(`v1-identity: ${changed} page(s) changed outside PAGES_EXCEPT (${[...except].join(',') || 'none'}), ${rasterizerStatus()}`);
  return changed;
}

async function credit(): Promise<number> {
  setFlags(true, false);
  const ids = ['anchor-1-restaurant', 'golden-manufacturing', 'golden-b2b-saas', CREDIT_FULL_CASE_ID];
  const outDir = path.join(OUT, 'pdf-credit');
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await launch();
  let bad = 0;
  try {
    for (const spec of pdfCases().filter((c) => ids.includes(c.id))) {
      const layout = await checkLayout(browser, caseHtml(spec));
      const pages = await renderCase(browser, spec, outDir, spec.id);
      const expected = expectedPages(spec);
      const problems = [
        ...(pages !== expected ? [`${pages} pages, expected ${expected}`] : []),
        ...layout.issues.map((i) => `page ${i.page} ${i.kind}: ${i.detail}`),
      ];
      if (problems.length) bad += 1;
      console.log(`${problems.length ? 'BAD' : 'OK '} ${spec.id} (${pages} pages)${problems.length ? `: ${problems.join('; ')}` : ''}`);
    }
  } finally {
    await browser.close();
  }
  // Keep the PDFs and the chapter page PNG; drop the other PNGs.
  for (const f of fs.readdirSync(outDir)) {
    if (f.endsWith('.png') && !/-p(2|4)\.png$/.test(f)) fs.unlinkSync(path.join(outDir, f));
  }
  return bad;
}

async function page5(which: string): Promise<number> {
  setFlags(false, false);
  const spec = pdfCases().find((c) => c.id === 'anchor-1-restaurant')!;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'equify-r4-p5-'));
  const browser = await launch();
  try {
    await renderCase(browser, spec, dir, spec.id);
  } finally {
    await browser.close();
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.copyFileSync(path.join(dir, `${spec.id}-p5.png`), path.join(OUT, `page5-${which}.png`));
  // Page 5 alone (scripts/round-4/extract-page.swift, compiled to tmp/extract-page).
  const extractor = path.join(ROOT, 'tmp', 'extract-page');
  execFileSync('swiftc', ['-O', path.join(__dirname, 'extract-page.swift'), '-o', extractor], { stdio: 'pipe' });
  execFileSync(extractor, [path.join(dir, `${spec.id}.pdf`), path.join(OUT, `page5-${which}.pdf`), '5']);
  console.log(`page5-${which}: written`);
  return 0;
}

async function main(): Promise<void> {
  const mode = process.argv[2];
  const code = mode === 'v1-identity' ? await v1Identity() : mode === 'credit' ? await credit() : mode === 'page5' ? await page5(process.argv[3] ?? 'after') : -1;
  if (code === -1) console.log('usage: render.ts v1-identity | credit | page5 <before|after>');
  process.exit(code === 0 ? 0 : 1);
}

if (require.main === module) void main();
