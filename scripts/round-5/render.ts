/**
 * Round 5: V1 PDFs of the 5 golden cases (METHOD_V2 off, CREDIT_CHAPTER off).
 *   npx tsx scripts/round-5/render.ts <before|after>
 * Writes reports/round-5/<before|after>/<id>.pdf and <id>-pN.png, and runs the layout check.
 * With "after", prints the per-page pixel diff against "before" (a pixel differs when a channel
 * differs by more than 24, same rule as rounds 2 to 4).
 */
import fs from 'fs';
import path from 'path';
import { ROOT, caseHtml, checkLayout, launch, pdfCases, rasterizerStatus, renderCase } from '../../tests/pdf/pdf_harness';
import { diffPct } from '../round-4/render';
import { GOLDEN5 } from './golden5';

async function main(): Promise<void> {
  const which = process.argv[2];
  if (which !== 'before' && which !== 'after') throw new Error('usage: render.ts <before|after>');
  process.env.METHOD_V2 = 'off';
  process.env.CREDIT_CHAPTER = 'off';
  const outDir = path.join(ROOT, 'reports', 'round-5', which);
  const beforeDir = path.join(ROOT, 'reports', 'round-5', 'before');
  const browser = await launch();
  let bad = 0;
  try {
    for (const spec of pdfCases().filter((c) => GOLDEN5.includes(c.id))) {
      const layout = await checkLayout(browser, caseHtml(spec));
      const pages = await renderCase(browser, spec, outDir, spec.id);
      const issues = layout.issues.map((i) => `page ${i.page} ${i.kind}: ${i.detail}`);
      if (issues.length) bad += 1;
      let diff = '';
      if (which === 'after') {
        const d: string[] = [];
        for (let p = 1; p <= pages; p += 1) {
          const v = await diffPct(path.join(outDir, `${spec.id}-p${p}.png`), path.join(beforeDir, `${spec.id}-p${p}.png`));
          d.push(v == null ? 'n/a' : v === 0 ? '0' : v.toFixed(2));
        }
        diff = ` diff%: ${d.join(' | ')}`;
      }
      console.log(`${issues.length ? 'BAD' : 'OK '} ${spec.id} (${pages} pages)${issues.length ? `: ${issues.join('; ')}` : ''}${diff}`);
    }
  } finally {
    await browser.close();
  }
  console.log(rasterizerStatus());
  process.exitCode = bad ? 1 : 0;
}

void main();
