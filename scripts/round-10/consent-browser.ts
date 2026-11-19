/**
 * Round 10: the cookie banner in a real browser, against a local `next start` built with CONSENT_BANNER=on and NEXT_PUBLIC_ANALYTICS=on.
 *   npx tsx scripts/round-10/consent-browser.ts [base url]
 * Checks: no analytics request before consent; "אישור הכל" loads it in the same visit; the choice survives a reload; "רק הכרחיות"
 * keeps it off; "הגדרות עוגיות" opens the settings again; the transparency line is in step 1. Screenshots go to reports/round-10/.
 */
import fs from 'fs';
import path from 'path';
import type { Page } from 'puppeteer-core';
import { launch, ROOT } from '../../tests/pdf/pdf_harness';

const base = process.argv[2] ?? 'http://localhost:3100';
const OUT = path.join(ROOT, 'reports', 'round-10');
const isAnalytics = (u: string) => /\/_vercel\/(insights|speed-insights)|vitals\.vercel|va\.vercel-scripts/.test(u);
const results: Array<[string, boolean, string]> = [];
const check = (name: string, ok: boolean, detail = '') => {
  results.push([name, ok, detail]);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? `: ${detail}` : ''}`);
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function watch(page: Page): Promise<string[]> {
  const seen: string[] = [];
  page.on('request', (r) => {
    if (isAnalytics(r.url())) seen.push(r.url());
  });
  return seen;
}

async function clickByText(page: Page, text: string): Promise<boolean> {
  return page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent?.trim() === t);
    if (!b) return false;
    (b as HTMLButtonElement).click();
    return true;
  }, text);
}

async function main(): Promise<void> {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch();
  try {
    // 1. Accept all.
    {
      const ctx = await browser.createBrowserContext();
      const page = await ctx.newPage();
      await page.setViewport({ width: 1366, height: 900 });
      const seen = await watch(page);
      await page.goto(`${base}/`, { waitUntil: 'networkidle0', timeout: 60_000 });
      await wait(4000);
      const banner = await page.$('.eq-cc');
      check('banner shown on first visit', !!banner);
      const buttons = await page.$$eval('.eq-cc button', (bs) => bs.map((b) => b.textContent?.trim()));
      check('three buttons', JSON.stringify(buttons) === JSON.stringify(['אישור הכל', 'הגדרות', 'רק הכרחיות']), JSON.stringify(buttons));
      check('no analytics before consent', seen.length === 0, seen.join(' '));
      const blocks = await page.evaluate(() => {
        const r = document.querySelector('.eq-cc')?.getBoundingClientRect();
        return r ? r.height < window.innerHeight * 0.5 && getComputedStyle(document.querySelector('.eq-cc')!).position === 'fixed' : false;
      });
      check('banner at the bottom, not blocking', blocks);
      await page.screenshot({ path: path.join(OUT, 'banner-desktop.png') });
      await clickByText(page, 'אישור הכל');
      await wait(3000);
      check('analytics after accept, same visit', seen.length > 0, seen.slice(0, 2).join(' '));
      check('banner closed', !(await page.$('.eq-cc')));
      const stored = await page.evaluate(() => localStorage.getItem('equify-consent'));
      check('choice stored', !!stored && JSON.parse(stored).a === true, stored ?? '');
      const seen2 = await watch(page);
      await page.reload({ waitUntil: 'networkidle0' });
      await wait(3000);
      check('no banner after reload', !(await page.$('.eq-cc')));
      check('analytics after reload', seen2.length > 0);
      await ctx.close();
    }
    // 2. Necessary only, then reopen from the footer link on an inner page.
    {
      const ctx = await browser.createBrowserContext();
      const page = await ctx.newPage();
      await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
      const seen = await watch(page);
      await page.goto(`${base}/privacy`, { waitUntil: 'networkidle0', timeout: 60_000 });
      await wait(2000);
      await page.screenshot({ path: path.join(OUT, 'banner-mobile.png') });
      await clickByText(page, 'רק הכרחיות');
      await wait(1000);
      await page.reload({ waitUntil: 'networkidle0' });
      await wait(3000);
      check('necessary only: no analytics, no banner', seen.length === 0 && !(await page.$('.eq-cc')), seen.join(' '));
      const link = await page.$('[data-cookie-settings]');
      check('"הגדרות עוגיות" link at the bottom of an inner page', !!link);
      await link?.click();
      await wait(800);
      const boxes = await page.$$eval('.eq-cc input[type=checkbox]', (xs) => xs.map((x) => (x as HTMLInputElement).checked));
      check('settings reopen with the saved choice', JSON.stringify(boxes) === '[true,false,false]', JSON.stringify(boxes));
      await page.screenshot({ path: path.join(OUT, 'banner-settings-mobile.png') });
      await ctx.close();
    }
    // 3. Step 1 transparency line.
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1366, height: 900 });
      await page.goto(`${base}/wizard`, { waitUntil: 'networkidle0', timeout: 60_000 });
      await wait(4000);
      const note = await page.$eval('[data-testid=step1-privacy-note]', (n) => n.textContent ?? '').catch(() => '');
      check('step 1 transparency line', note.includes('SBC') && note.includes('מדיניות הפרטיות'), note);
      const el = await page.$('[data-testid=step1-privacy-note]');
      await el?.evaluate((n) => n.scrollIntoView({ block: 'center' }));
      await wait(500);
      await page.screenshot({ path: path.join(OUT, 'step1-note.png') });
      await page.close();
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(OUT, 'consent-browser.json'), JSON.stringify(results, null, 1));
  process.exit(results.every((r) => r[1]) ? 0 : 1);
}
void main();
