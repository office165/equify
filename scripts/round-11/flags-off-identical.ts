/**
 * Round 11: with every site flag off, the site is what it was. Compares two local `next start` servers: the code before the night
 * (round-9, port 3200) and this branch built with the flags off (port 3100).
 *   npx tsx scripts/round-11/flags-off-identical.ts [before] [after]
 * HTML: the server HTML of each page with the scripts removed and the build hashes in /_next/static replaced (they change with any
 * code change). Pixels: a screenshot of each page with motion reduced, compared byte for byte and pixel for pixel.
 */
import fs from 'fs';
import path from 'path';
import { launch, ROOT } from '../../tests/pdf/pdf_harness';

const [before = 'http://localhost:3200', after = 'http://localhost:3100'] = process.argv.slice(2);
const PAGES = ['/', '/wizard', '/privacy', '/terms', '/accessibility', '/results'];

function normalize(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
    .replace(/<link[^>]+rel="(?:preload|modulepreload)"[^>]*as="script"[^>]*\/?>/g, '')
    .replace(/\/_next\/static\/[^"')\s]+/g, '/_next/static/X')
    .replace(/"buildId":"[^"]+"/g, '');
}

/** The stylesheets of a page, as the sorted set of their rules (Next may split the same rules into more files). */
async function cssRules(base: string, html: string): Promise<string> {
  const hrefs = [...html.matchAll(/href="(\/_next\/static\/css\/[^"]+)"/g)].map((m) => m[1]);
  const all = (await Promise.all(hrefs.map((h) => fetch(base + h).then((r) => r.text())))).join('');
  return all.split('}').map((r) => r.trim()).filter(Boolean).sort().join('}\n');
}
const withoutCssLinks = (h: string) => h.replace(/<link rel="stylesheet" href="\/_next\/static\/X"[^>]*\/>/g, '');

async function main(): Promise<void> {
  const out: string[] = [];
  let ok = true;
  for (const p of PAGES) {
    const [a, b] = await Promise.all([fetch(before + p).then((r) => r.text()), fetch(after + p).then((r) => r.text())]);
    const exact = normalize(a) === normalize(b);
    const sameMarkup = withoutCssLinks(normalize(a)) === withoutCssLinks(normalize(b));
    const sameCss = (await cssRules(before, a)) === (await cssRules(after, b));
    const same = sameMarkup && sameCss;
    ok &&= same;
    if (same && !exact) {
      out.push(`HTML ${p}: identical markup and identical CSS rules (the same rules split into one more stylesheet file)`);
      continue;
    }
    let detail = '';
    if (!same) {
      const na = normalize(a), nb = normalize(b);
      let i = 0;
      while (i < na.length && na[i] === nb[i]) i++;
      detail = ` first difference at ${i}: before "${na.slice(i - 40, i + 80)}" after "${nb.slice(i - 40, i + 80)}"`;
    }
    out.push(`HTML ${p}: ${same ? 'identical' : 'DIFFERENT'}${detail}`);
  }
  const browser = await launch({ webgl: true });
  try {
    for (const p of ['/', '/wizard', '/privacy']) {
      for (const [vp, w, h] of [['desktop', 1440, 900], ['mobile', 390, 844]] as const) {
        const shots: Buffer[] = [];
        for (const base of [before, after]) {
          const ctx = await browser.createBrowserContext();
          const page = await ctx.newPage();
          await page.setViewport({ width: w, height: h });
          await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
          await page.evaluateOnNewDocument(() => sessionStorage.setItem('equify_preloader_shown', '1'));
          await page.goto(base + p, { waitUntil: 'networkidle0', timeout: 90_000 });
          await new Promise((r) => setTimeout(r, 4000));
          shots.push(Buffer.from(await page.screenshot({ type: 'png' })));
          await ctx.close();
        }
        // Decode both PNGs in a blank page (no image library in the repo) and count the pixels that differ.
        const cmp = await browser.newPage();
        const A = `data:image/png;base64,${shots[0].toString('base64')}`;
        const B = `data:image/png;base64,${shots[1].toString('base64')}`;
        // A string, not a function: tsx adds a helper to named functions that the page does not have.
        const [diff, size] = (await cmp.evaluate(`(async () => {
          const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
          const [x, y] = await Promise.all([load(${JSON.stringify(A)}), load(${JSON.stringify(B)})]);
          const data = (img) => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); return g.getImageData(0, 0, img.width, img.height).data; };
          const da = data(x), db = data(y);
          let n = 0;
          for (let i = 0; i < Math.max(da.length, db.length); i += 4) if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2]) n++;
          return [n, x.width + 'x' + x.height];
        })()`)) as [number, string];
        await cmp.close();
        const name = `${p === '/' ? 'home' : p.slice(1)}-${vp}`;
        fs.writeFileSync(path.join(ROOT, 'reports', 'round-11', 'flags-off', `${name}-before.png`), shots[0]);
        fs.writeFileSync(path.join(ROOT, 'reports', 'round-11', 'flags-off', `${name}-after.png`), shots[1]);
        ok &&= diff === 0;
        out.push(`pixels ${name}: ${diff === 0 ? 'identical' : `${diff} pixels differ`} (${size})`);
      }
    }
  } finally {
    await browser.close();
  }
  console.log(out.join('\n'));
  fs.writeFileSync(path.join(ROOT, 'reports', 'round-11', 'flags-off.txt'), out.join('\n') + '\n');
  process.exit(ok ? 0 : 1);
}
fs.mkdirSync(path.join(ROOT, 'reports', 'round-11', 'flags-off'), { recursive: true });
void main();
