/**
 * Round 6: SEO and GEO.
 *   robots / sitemap: production rules, preview disallows everything, only public pages listed.
 *   origin: canonical origin is equify.co.il even when NEXT_PUBLIC_SITE_URL is a vercel.app address.
 *   json-ld: each block passes JSON.parse and has the required fields; FAQ answers are word for word
 *     from the landing FAQ; the price is the one on the pricing card.
 *   metadata: every public page has title, description, canonical, Open Graph and Twitter; the
 *     wizard, results and report layouts are noindex; texts follow the writing rules.
 *   llms.txt: exists, links the public pages, says what the report is not, follows the rules.
 *   analytics: off unless NEXT_PUBLIC_ANALYTICS=on; GSC meta only when its variable is set.
 * (HTTP 200 of /robots.txt, /sitemap.xml and /llms.txt is checked against next start, see reports/round-6.md.)
 */
import fs from 'fs';
import path from 'path';
import robots from '../../app/robots';
import sitemap from '../../app/sitemap';
import { rootMetadata } from '../../app/site-metadata';
import { HOME_DESCRIPTION, HOME_TITLE } from '../../lib/brand/brand-identity';
import { LANDING_FAQ } from '../../components/landing/equify/equify-data';
import { analyticsEnabled, SiteAnalytics } from '../../components/analytics/SiteAnalytics';
import { scanText } from '../../lib/report/report_text_rules';
import { NOINDEX_METADATA, PAGE_COPY, publicPageMetadata } from '../../lib/seo/page_metadata';
import { NON_PUBLIC_PATHS, PUBLIC_PAGES, isIndexableDeployment, resolveSiteOrigin } from '../../lib/seo/site';
import { FAQ_JSONLD_QUESTIONS, REPORT_PRICE_ILS, homeJsonLd, jsonLdScriptContent } from '../../lib/seo/structured_data';
import { Suite, type SuiteResult } from '../lib/harness';

const ROOT = path.join(__dirname, '..', '..');
const PROMISE = /מובטח|מבטיח|מבטיחים|הבטחה|guarantee|תיווך|מוסמכת|מדויקת/i;

function withEnv<T>(key: string, value: string | undefined, fn: () => T): T {
  const prev = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env[key];
    else process.env[key] = prev;
  }
}

function textOk(s: Suite, id: string, text: string): void {
  const hits = scanText(text);
  s.check('writing-rules', id, hits.length === 0, hits.map((h) => `${h.rule}: ${h.context}`).join('; '));
  s.check('no-promise', id, !PROMISE.test(text), text.slice(0, 80));
}

export async function run(): Promise<SuiteResult> {
  const s = new Suite('round6');

  // robots.txt
  const prod = withEnv('VERCEL_ENV', 'production', () => robots());
  const rules = Array.isArray(prod.rules) ? prod.rules[0] : prod.rules;
  const disallow = ([] as string[]).concat(rules?.disallow ?? []);
  s.check('robots', 'production-allows-root', rules?.allow === '/');
  for (const p of NON_PUBLIC_PATHS) s.check('robots', `disallow ${p}`, disallow.includes(p));
  s.check('robots', 'sitemap-url', prod.sitemap === 'https://equify.co.il/sitemap.xml', String(prod.sitemap));
  const preview = withEnv('VERCEL_ENV', 'preview', () => robots());
  const pr = Array.isArray(preview.rules) ? preview.rules[0] : preview.rules;
  s.check('robots', 'preview-disallows-all', pr?.disallow === '/' && !preview.sitemap);
  s.check('robots', 'local-is-production-rules', isIndexableDeployment(undefined) && !isIndexableDeployment('development'));

  // sitemap.xml
  const sm = await sitemap(); // async since round 12 (the hub posts)
  s.check('sitemap', 'count', sm.length === PUBLIC_PAGES.length, String(sm.length));
  for (const e of sm) {
    s.check('sitemap', e.url, e.url.startsWith('https://equify.co.il/') && !NON_PUBLIC_PATHS.some((p) => new URL(e.url).pathname.startsWith(p.replace(/\/$/, ''))));
  }

  // canonical origin
  s.check('origin', 'vercel-app-falls-back', resolveSiteOrigin('https://equify-abc.vercel.app') === 'https://equify.co.il');
  s.check('origin', 'www-kept', resolveSiteOrigin('https://www.equify.co.il/') === 'https://www.equify.co.il');
  s.check('origin', 'unset', resolveSiteOrigin(undefined) === 'https://equify.co.il');
  s.check('origin', 'root-metadata-base', String(rootMetadata.metadataBase) === 'https://equify.co.il/', String(rootMetadata.metadataBase));
  s.check('metadata', 'root-no-en-hreflang', !(rootMetadata.alternates as { languages?: unknown } | undefined)?.languages);

  // JSON-LD
  const blocks = homeJsonLd();
  const parsed = blocks.map((b) => JSON.parse(jsonLdScriptContent(b)) as Record<string, any>);
  const byType = (t: string) => parsed.find((p) => p['@type'] === t);
  const org = byType('Organization');
  s.check('json-ld', 'organization', org?.name === 'equify BY SBC' && org?.parentOrganization?.name === 'SBC' && org?.url === 'https://equify.co.il/');
  const site = byType('WebSite');
  s.check('json-ld', 'website', site?.url === 'https://equify.co.il/' && !!site?.name);
  const svc = byType('Service');
  s.check('json-ld', 'service-offer', svc?.offers?.price === 999 && svc?.offers?.priceCurrency === 'ILS' && !!svc?.provider);
  const pricing = fs.readFileSync(path.join(ROOT, 'components/landing/equify/sections/PricingSection.tsx'), 'utf8');
  s.check('json-ld', 'price-is-on-site', pricing.includes(`₪${REPORT_PRICE_ILS}<`), 'PricingSection does not show the price');
  const faq = byType('FAQPage');
  const qs = (faq?.mainEntity ?? []) as Array<{ name: string; acceptedAnswer: { text: string } }>;
  s.check('json-ld', 'faq-count', qs.length === FAQ_JSONLD_QUESTIONS.length, String(qs.length));
  for (const q of qs) {
    const src = LANDING_FAQ.find((f) => f.q === q.name);
    s.check('json-ld', `faq-from-site: ${q.name}`, !!src && src.a === q.acceptedAnswer.text);
  }
  s.check('json-ld', 'no-reviews', !JSON.stringify(parsed).match(/review|aggregateRating/i));
  s.check('json-ld', 'script-safe', blocks.every((b) => !jsonLdScriptContent(b).includes('<')));

  // metadata of public pages
  const pages: Array<[string, string, string, boolean]> = [
    ['/', HOME_TITLE, HOME_DESCRIPTION, true],
    ['/privacy', PAGE_COPY.privacy.title, PAGE_COPY.privacy.description, false],
    ['/terms', PAGE_COPY.terms.title, PAGE_COPY.terms.description, false],
    ['/accessibility', PAGE_COPY.accessibility.title, PAGE_COPY.accessibility.description, false],
  ];
  for (const [p, title, description, full] of pages) {
    const m = publicPageMetadata({ path: p, title, description, fullTitle: full });
    const og = m.openGraph as Record<string, unknown> | undefined;
    const tw = m.twitter as Record<string, unknown> | undefined;
    s.check('metadata', p, !!m.title && m.description === description && m.alternates?.canonical === p && og?.url === p && !!og?.title && !!og?.description && !!tw?.title && tw?.card === 'summary');
    textOk(s, `title ${p}`, String(og?.title));
    textOk(s, `description ${p}`, description);
    if (p !== '/') {
      const src = fs.readFileSync(path.join(ROOT, 'app', p.slice(1), 'page.tsx'), 'utf8');
      s.check('metadata', `wired ${p}`, src.includes(`publicPageMetadata({ path: '${p}'`));
    }
  }
  s.check('metadata', 'wired /', fs.readFileSync(path.join(ROOT, 'app/page.tsx'), 'utf8').includes("publicPageMetadata({ path: '/'"));
  s.check('metadata', 'title-template', (rootMetadata.title as { template?: string }).template === '%s | equify BY SBC');
  for (const d of ['wizard', 'results', 'report']) {
    const src = fs.readFileSync(path.join(ROOT, 'app', d, 'layout.tsx'), 'utf8');
    s.check('noindex', d, src.includes('NOINDEX_METADATA'));
  }
  const nr = NOINDEX_METADATA.robots as { index?: boolean; follow?: boolean };
  s.check('noindex', 'values', nr.index === false && nr.follow === false);
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/manifest.webmanifest'), 'utf8')) as { description: string };
  textOk(s, 'manifest', manifest.description);

  // llms.txt
  const llms = fs.readFileSync(path.join(ROOT, 'public/llms.txt'), 'utf8');
  textOk(s, 'llms.txt', llms.replace(/לא התחייבות לתוצאה/g, ''));
  for (const p of PUBLIC_PAGES) s.check('llms', `link ${p.path}`, llms.includes(`(https://equify.co.il${p.path})`));
  s.check('llms', 'not-an-opinion', llms.includes('לא חוות דעת חתומה') && llms.includes('Damodaran') && llms.includes('999'));

  // analytics flag and Search Console
  s.check('analytics', 'off-by-default', !analyticsEnabled(undefined) && !analyticsEnabled('off') && analyticsEnabled('on'));
  const offRender = await withEnv('NEXT_PUBLIC_ANALYTICS', undefined, () => SiteAnalytics());
  s.check('analytics', 'renders-nothing-when-off', offRender === null);
  s.check('gsc', 'no-meta-without-env', !('verification' in rootMetadata) || !!process.env.NEXT_PUBLIC_GSC_VERIFICATION);
  return s.result;
}
