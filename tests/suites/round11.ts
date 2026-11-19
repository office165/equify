/**
 * Round 11: SITE_V2.
 *   theme:      the boot script picks the stored choice, else the device (prefers-color-scheme), and sets it before paint.
 *   content:    the new home page carries every section, word, number, price and link of today's page (both copy modes).
 *   writing:    with COPY_V2 the new page has none of the forbidden marks.
 *   tokens:     both themes define every token, and the text/ground pairs pass WCAG AA (4.5:1).
 *   flags-off:  with SITE_V2 off the home page is today's page (scripts/round-11/flags-off-identical.ts compares the built site).
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { Suite, type SuiteResult } from '../lib/harness';
import { renderHomeV2, renderLanding, visibleText } from '../lib/render_site';
import { resolveTheme, THEME_BOOT, THEME_KEY } from '../../components/site-v2/theme_boot';
import { landingCopy } from '../../components/landing/equify/use_landing_copy';
import { VALUATION_METHODOLOGY_COPY } from '../../components/landing/equify/equify-data';
import { FORBIDDEN_MARKS } from '../../lib/copy/marks';
import { FEATURE_FLAGS } from '../../lib/flags/registry';

const ROOT = path.join(__dirname, '..', '..');

function runBoot(stored: string | null, prefersLight: boolean): { theme: string | null; classes: string[]; meta: string[] } {
  const attrs: Record<string, string> = {};
  const classes: string[] = [];
  const metas = [{ content: '#020504', setAttribute(_k: string, v: string) { this.content = v; } }, { content: '#020504', setAttribute(_k: string, v: string) { this.content = v; } }];
  const ctx = {
    document: {
      documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v), classList: { add: (c: string) => classes.push(c) } },
      querySelectorAll: () => metas,
    },
    localStorage: { getItem: (k: string) => (k === THEME_KEY ? stored : null) },
    window: { matchMedia: (q: string) => ({ matches: q.includes('light') ? prefersLight : false }) },
  };
  (ctx as unknown as { window: Record<string, unknown> }).window.document = ctx.document;
  vm.runInNewContext(THEME_BOOT, ctx);
  return { theme: attrs['data-eq-theme'] ?? null, classes, meta: metas.map((m) => m.content) };
}

const lum = (hex: string): number => {
  const c = [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a: string, b: string): number => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
/** rgba(r,g,b,a) over a ground, as a hex colour. */
function flat(color: string, ground: string): string {
  const m = color.match(/rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (!m) return color;
  const g = [0, 2, 4].map((i) => parseInt(ground.slice(1 + i, 3 + i), 16));
  const a = Number(m[4]);
  return '#' + [1, 2, 3].map((i, k) => Math.round(Number(m[i]) * a + g[k] * (1 - a)).toString(16).padStart(2, '0')).join('');
}
function tokens(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  const block = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  return Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

export async function run(): Promise<SuiteResult> {
  const s = new Suite('round11');

  s.check('flags', 'in-registry', (FEATURE_FLAGS as readonly string[]).includes('SITE_V2'));

  // theme
  s.check('theme', 'resolve', resolveTheme('light', false) === 'light' && resolveTheme('dark', true) === 'dark' && resolveTheme(null, true) === 'light' && resolveTheme(null, false) === 'dark' && resolveTheme('blue', true) === 'light');
  const b1 = runBoot(null, true), b2 = runBoot(null, false), b3 = runBoot('dark', true), b4 = runBoot('light', false);
  s.check('theme', 'boot-device-light', b1.theme === 'light' && b1.meta.every((m) => m === '#F6FAF9'), JSON.stringify(b1));
  s.check('theme', 'boot-device-dark', b2.theme === 'dark' && b2.meta.every((m) => m === '#050F0D'));
  s.check('theme', 'boot-stored-wins', b3.theme === 'dark' && b4.theme === 'light');
  s.check('theme', 'boot-class', b1.classes.includes('eq-v2'));

  // content: every part of today's page is on the new one
  for (const copyV2 of [false, true]) {
    const html = renderHomeV2({ copyV2 });
    const text = visibleText(html);
    const c = landingCopy(copyV2);
    const missing: string[] = [];
    const need = [
      ...c.marquee,
      ...c.models.flatMap((m) => [m.title, m.body]),
      ...c.faq.flatMap((f) => [f.q, f.a]),
      ...c.steps.flatMap((st) => [...st]),
      ...c.pricing,
      VALUATION_METHODOLOGY_COPY,
      '₪999', '₪1,990', 'דוח Pro מלא', 'שווי העסק שלך.', 'בנתונים.', 'התחל הערכת שווי', 'נסה את הסימולטור', 'התחל בחינם, תשלום בהפקת הדוח',
      'למה equify', 'עמודי דוח PDF', 'שיטות הערכה משוקללות', 'מהזנת נתונים עד דוח', 'תהליך הקלט', 'אינדיקציה מהירה', 'מתודולוגיה', 'שאלות נפוצות',
      'הכנסות שנתיות', 'שיעור EBITDA', 'צמיחה שנתית צפויה', 'תנאי שימוש', 'פרטיות', 'hello@equify.co.il', '© ',
      'איך זה עובד', 'סימולטור שווי', 'המודלים', 'תמחור', 'שאלות', 'התחל הערכה',
    ];
    for (const t of need) if (!text.includes(t.replace(/\s+/g, ' '))) missing.push(t);
    s.check('content', `all-of-today copyV2=${copyV2}`, missing.length === 0, JSON.stringify(missing.slice(0, 6)));
    s.check('content', `links copyV2=${copyV2}`, (html.match(/href="\/wizard"/g) ?? []).length >= 4 && html.includes('href="#calc"') && html.includes('href="/privacy"') && html.includes('href="/terms"'));
    s.check('content', `sections copyV2=${copyV2}`, ['id="how"', 'id="calc"', 'id="models"', 'id="price"', 'id="faq"', 'id="main"'].every((x) => html.includes(x)));
    if (copyV2) {
      const bad = text.match(new RegExp(`.{0,30}(${FORBIDDEN_MARKS.source}).{0,30}`, 'g'));
      s.check('writing', 'no-marks-with-copy-v2', !bad, JSON.stringify(bad?.slice(0, 4)));
    }
  }
  const html = renderHomeV2({});
  s.check('content', 'theme-switch', html.includes('id="themeToggle"') && html.includes('החלפה בין מצב כהה למצב בהיר'));
  s.check('content', 'no-moving-parts', !/id="terrain"|class="marquee"|SCROLL|id="loader"/.test(html));
  s.check('content', 'cookie-link-with-banner', renderHomeV2({ consentBanner: true }).includes('data-cookie-settings') && !html.includes('data-cookie-settings'));
  s.check('flags-off', 'landing-unchanged', renderLanding(null) === renderLanding({ siteV2: false }));

  // tokens and contrast
  const css = fs.readFileSync(path.join(ROOT, 'public', 'site-v2', 'v2.css'), 'utf8');
  const dark = tokens(css, 'html.eq-v2, html.eq-v2[data-eq-theme="dark"]');
  const light = { ...dark, ...tokens(css, 'html.eq-v2[data-eq-theme="light"] {') };
  const names = ['--bg-primary', '--bg-surface', '--bone', '--bone-dim', '--teal', '--gold', '--line', '--line-strong', '--on-accent', '--bg-deep'];
  s.check('tokens', 'both-themes', names.every((n) => dark[n] && light[n]), JSON.stringify(names.filter((n) => !dark[n] || !light[n])));
  s.check('tokens', 'equify-colours', dark['--teal'] === '#00C2B8' && dark['--gold'] === '#00F5A0' && dark['--bg-primary'] === '#050F0D' && dark['--bg-deep'] === '#020504');
  for (const [name, t] of [['dark', dark], ['light', light]] as const) {
    for (const ground of ['--bg-primary', '--bg-surface', '--bg-deep']) {
      for (const fg of ['--bone', '--bone-dim', '--teal', '--gold']) {
        const r = ratio(flat(t[fg], t[ground]), t[ground]);
        s.check('contrast', `${name} ${fg} on ${ground}`, r >= 4.5, r.toFixed(2));
      }
    }
    const r = ratio(t['--on-accent'], t['--teal']);
    s.check('contrast', `${name} button text`, r >= 4.5, r.toFixed(2));
  }
  s.check('tokens', 'no-gradient-buttons', !/\.v2-btn[^{]*\{[^}]*gradient/.test(css));
  s.check('flags-off', 'css-only-in-public', !fs.readFileSync(path.join(ROOT, 'app', 'layout.tsx'), 'utf8').match(/import ['"][^'"]*site-v2[^'"]*\.css/));
  return s.result;
}
