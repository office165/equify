/**
 * Round 8: automatic accessibility check (axe-core, WCAG 2.0/2.1 A and AA rules) on the home page
 * and the start of the wizard, desktop and mobile, against a local `next start`.
 *   npx tsx scripts/round-8/axe.ts <axe.min.js path> [base url]
 * Writes reports/round-8/axe.json. axe finds only part of the issues; a manual check is still needed.
 */
import fs from 'fs';
import path from 'path';
import { launch, ROOT } from '../../tests/pdf/pdf_harness';

async function main(): Promise<void> {
  const axePath = process.argv[2];
  const base = process.argv[3] ?? 'http://localhost:3100';
  if (!axePath) throw new Error('usage: axe.ts <axe.min.js> [base]');
  const axe = fs.readFileSync(axePath, 'utf8');
  const browser = await launch();
  const out: Record<string, unknown> = {};
  try {
    for (const [name, url] of [['home', `${base}/`], ['wizard', `${base}/wizard`]] as const) {
      for (const [vp, w, h] of [['desktop', 1366, 900], ['mobile', 390, 844]] as const) {
        const page = await browser.newPage();
        await page.setViewport({ width: w, height: h });
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60_000 });
        await new Promise((r) => setTimeout(r, 4000)); // intro animation and preloader
        await page.addScriptTag({ content: axe });
        const res = (await page.evaluate(`axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa'] } })`)) as {
          violations: Array<{ id: string; impact: string; help: string; helpUrl: string; nodes: Array<{ target: string[]; html: string }> }>;
          passes: unknown[];
        };
        out[`${name}-${vp}`] = res.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, count: v.nodes.length, examples: v.nodes.slice(0, 3).map((n) => ({ target: n.target.join(' '), html: n.html.slice(0, 160) })) }));
        console.log(`${name}-${vp}: ${res.violations.length} rule(s) violated, ${res.passes.length} passed`);
        for (const v of res.violations) console.log(`  [${v.impact}] ${v.id} x${v.nodes.length}: ${v.help}`);
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(ROOT, 'reports', 'round-8', 'axe.json'), JSON.stringify(out, null, 1));
}
void main();
