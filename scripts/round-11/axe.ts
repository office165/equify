/**
 * Round 11: axe (WCAG 2.0/2.1 A and AA) on the home page and the wizard, day and night, desktop and phone, against a local
 * `next start` built with SITE_V2=on (run it through scripts/round-11/safe-env.sh). With SEED_STATE (scripts/round-11/golden-state.ts) also /results.
 *   npx tsx scripts/round-11/axe.ts <axe.min.js> [base] [out.json]
 */
import fs from 'fs';
import { launch } from '../../tests/pdf/pdf_harness';

async function main(): Promise<void> {
  const [axePath, base = 'http://localhost:3100', out = 'reports/round-11/axe.json'] = process.argv.slice(2);
  const axe = fs.readFileSync(axePath, 'utf8');
  const browser = await launch({ webgl: true });
  const res: Record<string, unknown> = {};
  let total = 0;
  try {
    const seed = process.env.SEED_STATE ? JSON.parse(fs.readFileSync(process.env.SEED_STATE, 'utf8')).state : null;
    // AXE_PAGES="name:/path,name2:/path2" checks other pages instead (round 12: the hub).
    const pages: Array<readonly [string, string]> = process.env.AXE_PAGES
      ? process.env.AXE_PAGES.split(',').map((x) => x.split(':') as [string, string])
      : [['home', '/'], ['wizard', '/wizard'], ...(seed ? ([['results', '/results']] as const) : [])];
    for (const [name, url] of pages) {
      for (const theme of ['dark', 'light'] as const) {
        for (const [vp, w, h] of [['desktop', 1366, 900], ['mobile', 390, 844]] as const) {
          const ctx = await browser.createBrowserContext();
          const page = await ctx.newPage();
          await page.setViewport({ width: w, height: h });
          await page.evaluateOnNewDocument((t) => {
            localStorage.setItem('equify-theme', t);
            localStorage.setItem('equify-consent', JSON.stringify({ v: 1, a: false, m: false, t: new Date().toISOString() }));
          }, theme);
          if (seed && url === '/results') await page.evaluateOnNewDocument((st) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('valubot.equifyWizardState', JSON.stringify(st)); sessionStorage.setItem('seeded', '1'); } }, seed);
          await page.goto(base + url, { waitUntil: 'networkidle0', timeout: 60_000 });
          await new Promise((r) => setTimeout(r, url === '/results' ? 9000 : 3500));
          if (url === '/results') await page.evaluate(`(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 150)); } window.scrollTo(0, 0); })()`);
          await page.addScriptTag({ content: axe });
          const r = (await page.evaluate(`axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa'] } })`)) as {
            violations: Array<{ id: string; impact: string; help: string; nodes: Array<{ target: string[]; html: string; failureSummary?: string }> }>;
            passes: unknown[];
          };
          const key = `${name}-${theme}-${vp}`;
          res[key] = r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, count: v.nodes.length, examples: v.nodes.slice(0, 4).map((n) => ({ target: n.target.join(' '), html: n.html.slice(0, 160), why: (n.failureSummary ?? '').slice(0, 200) })) }));
          total += r.violations.length;
          console.log(`${key}: ${r.violations.length} violated, ${r.passes.length} passed`);
          for (const v of r.violations) console.log(`  [${v.impact}] ${v.id} x${v.nodes.length}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
          await ctx.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
  fs.mkdirSync('reports/round-11', { recursive: true });
  fs.writeFileSync(out, JSON.stringify(res, null, 1));
  process.exit(total ? 1 : 0);
}
void main();
