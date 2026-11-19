/**
 * Round 11: screenshots of a page, day and night, desktop and phone.
 *   npx tsx scripts/round-11/shots.ts <base> <out dir> <prefix> [paths...]
 * Sets the theme through localStorage `equify-theme` (SITE_V2) and, for sites with another key, through `sbc-theme`.
 */
import fs from 'fs';
import path from 'path';
import { launch } from '../../tests/pdf/pdf_harness';

async function main(): Promise<void> {
  const [base, out, prefix, ...paths] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const browser = await launch({ webgl: true });
  try {
    for (const p of paths.length ? paths : ['/']) {
      for (const theme of ['dark', 'light'] as const) {
        for (const [vp, w, h, mobile] of [['desktop', 1440, 900, false], ['mobile', 390, 844, true]] as const) {
          const ctx = await browser.createBrowserContext();
          const page = await ctx.newPage();
          await page.setViewport({ width: w, height: h, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
          await page.evaluateOnNewDocument((t) => {
            try {
              localStorage.setItem('equify-theme', t);
              localStorage.setItem('sbc-theme', t);
              localStorage.setItem('equify-consent', JSON.stringify({ v: 1, a: false, m: false, t: new Date().toISOString() }));
              localStorage.setItem('sbc-consent', JSON.stringify({ v: 1, a: false, m: false, t: new Date().toISOString() }));
            } catch {}
          }, theme);
          // /results reads the wizard state from this browser; SEED_STATE is a JSON file of fixture data (scripts/round-11/golden-state.ts).
          if (process.env.SEED_STATE) {
            const seed = JSON.parse(fs.readFileSync(process.env.SEED_STATE, 'utf8')).state;
            await page.evaluateOnNewDocument((st) => {
              try {
                if (!sessionStorage.getItem('seeded')) {
                  sessionStorage.setItem('valubot.equifyWizardState', JSON.stringify(st));
                  sessionStorage.setItem('seeded', '1');
                }
              } catch {}
            }, seed);
          }
          await page.goto(`${base}${p}`, { waitUntil: 'networkidle0', timeout: 90_000 });
          await new Promise((r) => setTimeout(r, Number(process.env.SHOT_WAIT ?? 3500)));
          // Sections that reveal on scroll: go down the page once, then back to the top.
          await page.evaluate(async () => {
            for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
              window.scrollTo(0, y);
              await new Promise((r) => setTimeout(r, 120));
            }
            window.scrollTo(0, 0);
            await new Promise((r) => setTimeout(r, 600));
          });
          const name = `${prefix}-${p === '/' ? 'home' : p.replace(/\W+/g, '-').replace(/^-|-$/g, '')}-${theme}-${vp}.png`;
          await page.screenshot({ path: path.join(out, name), fullPage: vp === 'desktop' ? false : false });
          await page.screenshot({ path: path.join(out, name.replace('.png', '-full.png')), fullPage: true });
          console.log(name);
          await ctx.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}
void main();
