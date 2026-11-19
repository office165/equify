/**
 * Round 13: EN_SITE.
 *   routes:    /en exists only with EN_SITE on (no params and a notFound guard otherwise); Hebrew has no prefix.
 *   languages: every language file has the same keys; English has no forbidden marks, no false claims, the price $349, and says
 *              "algorithmic indication, not a valuation opinion".
 *   home:      the English home page is LTR, links to /en/wizard, shows $349, and has no Hebrew left; the Hebrew one is unchanged.
 *   seo:       hreflang between the home pages (he, en, x-default); the Hebrew home page adds it only with the flag on; the sitemap
 *              lists /en only with the flag on; JSON-LD of /en offers 349 USD; llms.txt names the English price.
 *   payment:   English checkout uses the USD button when it is set; the webhook accepts $349 and not $299.
 *   report:    the English PDF of a golden case has English on pages 1, 2, 4, 5 and 6 (the page fit runs in pdf-layout, PDF_LOCALE=en).
 */
import fs from 'fs';
import path from 'path';
import '../lib/css_stub';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Suite, type SuiteResult } from '../lib/harness';
import { renderHomeV2, visibleText } from '../lib/render_site';
import { withQuietConsole } from '../lib/quiet';
import { SiteFlagsProvider } from '../../components/shared/SiteFlagsContext';
import { HomeV2 } from '../../components/site-v2/HomeV2';
import { PostIndex } from '../../components/content-hub/PostIndex';
import { SITE_FLAGS_OFF, readSiteFlags } from '../../lib/flags/site_flags';
import { FEATURE_FLAGS } from '../../lib/flags/registry';
import { LANGS, PREFIXED_LANGS, SITE_LANGUAGES, siteLanguage } from '../../lib/i18n/site';
import { langAllowed, langStaticParams } from '../../lib/i18n/site/routes';
import { homeLanguages, langHomeJsonLd } from '../../lib/i18n/site/seo';
import { FORBIDDEN_MARKS } from '../../lib/copy/marks';
import { checkoutButton } from '../../lib/payments/paypal_hosted_button_ids';
import { evaluatePaypalAmount } from '../../lib/payments/paypal_amount_policy';
import { buildLlms } from '../../lib/content/feeds';
import { GOLDEN_CASES } from '../lib/golden';
import { buildWizardState } from '../lib/fixtures';
import { mapWizardToValuationData } from '../../lib/pdf-template/map-from-wizard';
import { buildPdfHtml } from '../../lib/pdf-template';
import { TEST_FX } from '../lib/run_case';

const ROOT = path.join(__dirname, '..', '..');
const HEB = /[֐-׿]/;
function keys(v: unknown, prefix = ''): string[] {
  if (Array.isArray(v) || v === null || typeof v !== 'object') return [prefix];
  return Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => keys(x, prefix ? `${prefix}.${k}` : k));
}
const strings = (v: unknown): string[] => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : []);

export async function run(): Promise<SuiteResult> {
  const s = new Suite('round13');
  (globalThis as unknown as { React: typeof React }).React = React;

  // flags and routes
  s.check('flags', 'in-registry-and-off', (FEATURE_FLAGS as readonly string[]).includes('EN_SITE') && !readSiteFlags({} as NodeJS.ProcessEnv).enSite);
  s.check('routes', 'off-no-params', langStaticParams({ enSite: false }).length === 0 && !langAllowed('en', { enSite: false }));
  s.check('routes', 'on-en', JSON.stringify(langStaticParams({ enSite: true })) === '[{"lang":"en"}]' && langAllowed('en', { enSite: true }) && !langAllowed('he', { enSite: true }) && !langAllowed('xx', { enSite: true }));
  s.check('routes', 'layout-guards', /langAllowed\(params\.lang, flags\)\) notFound\(\)/.test(fs.readFileSync(path.join(ROOT, 'app', '(intl)', '[lang]', 'layout.tsx'), 'utf8')) && /dynamicParams = false/.test(fs.readFileSync(path.join(ROOT, 'app', '(intl)', '[lang]', 'layout.tsx'), 'utf8')));
  s.check('languages', 'list', LANGS.map((l) => l.code).join(',') === 'he,en' && PREFIXED_LANGS.join(',') === 'en' && siteLanguage('en').def.dir === 'ltr' && siteLanguage('he').def.dir === 'rtl');

  // every language file has the same keys
  const heKeys = keys(siteLanguage('he').dict(true)).sort().join('|');
  for (const L of SITE_LANGUAGES) {
    s.check('languages', `same-keys ${L.def.code}`, keys(L.dict(true)).sort().join('|') === heKeys);
    const lists = L.lists(true);
    s.check('languages', `lists ${L.def.code}`, lists.faq.length >= 4 && lists.models.length >= 3 && lists.steps.length === 4 && lists.pricing.length >= 3);
  }

  // English words
  const en = siteLanguage('en');
  const enText = [...strings(en.dict(true)), ...strings(en.lists(true))];
  const bad = enText.filter((x) => FORBIDDEN_MARKS.test(x) || /—|–/.test(x));
  s.check('english', 'no-forbidden-marks', bad.length === 0, JSON.stringify(bad.slice(0, 3)));
  const claims = enText.filter((x) => /12 (M&A )?deals|transactions in Israel|asset[- ]based|Israeli multiples|guarantee|guaranteed|brokerage/i.test(x));
  s.check('english', 'no-false-claims', claims.length === 0, JSON.stringify(claims));
  s.check('english', 'indication-not-opinion', enText.some((x) => x.includes('algorithmic indication, not a valuation opinion')));
  s.check('english', 'price', en.def.price.amount === 349 && en.def.price.currency === 'USD' && en.dict(true).price.now === '$349' && !enText.some((x) => /\$299|299\$/.test(x)));
  s.check('english', 'no-hebrew', !enText.some((x) => HEB.test(x)));

  // the English home page
  const flagsOn = { ...SITE_FLAGS_OFF, siteV2: true, enSite: true, contentHub: true, consentBanner: true };
  const enHome = withQuietConsole(() => renderToString(React.createElement(SiteFlagsProvider, { value: flagsOn }, React.createElement(HomeV2, { lang: 'en' }))));
  const enVisible = visibleText(enHome);
  s.check('home', 'ltr', enHome.includes('dir="ltr"') && enHome.includes('lang="en"'));
  s.check('home', 'links-en', (enHome.match(/href="\/en\/wizard"/g) ?? []).length >= 4 && !/href="\/wizard"/.test(enHome) && enHome.includes('href="/en/guides"'));
  s.check('home', 'price', enVisible.includes('$349') && !enVisible.includes('₪999'));
  s.check('home', 'no-hebrew-text', !HEB.test(enVisible), (enVisible.match(/\S*[֐-׿]+\S*/g) ?? []).slice(0, 5).join(' '));
  s.check('home', 'no-hebrew-placeholders', !/placeholder="[^"]*[֐-׿]/.test(enHome) && !/aria-label="[^"]*[֐-׿]/.test(enHome));
  s.check('home', 'hebrew-unchanged', renderHomeV2({}) === withQuietConsole(() => renderToString(React.createElement(SiteFlagsProvider, { value: { ...SITE_FLAGS_OFF, siteV2: true } }, React.createElement(HomeV2)))));
  const enHub = withQuietConsole(() => renderToString(React.createElement(SiteFlagsProvider, { value: flagsOn }, React.createElement(PostIndex, { lang: 'en', title: 'Guides', lede: 'x', path: '/en/guides', posts: [], empty: en.dict(true).hub.noGuides }))));
  s.check('hub', 'en-infrastructure', enHub.includes('No guides in English yet.') && enHub.includes('dir="ltr"') && enHub.includes('href="/en/wizard"') && !HEB.test(visibleText(enHub)));

  // SEO
  const langs = homeLanguages();
  s.check('seo', 'hreflang', langs.he?.endsWith('/') && langs.en?.endsWith('/en') && !!langs['x-default'] && Object.keys(langs).length === 3, JSON.stringify(langs));
  s.check('seo', 'he-home-guarded', /readSiteFlags\(\)\.enSite \? \{ \.\.\.homeMetadata, alternates: \{ \.\.\.homeMetadata\.alternates, languages: homeLanguages\(\) \} \} : homeMetadata/.test(fs.readFileSync(path.join(ROOT, 'app', '(he)', 'page.tsx'), 'utf8')));
  const ld = langHomeJsonLd('en');
  const service = ld.find((d) => d['@type'] === 'Service') as { offers: { price: number; priceCurrency: string } };
  s.check('seo', 'jsonld-price', service.offers.price === 349 && service.offers.priceCurrency === 'USD' && ld.every((d) => typeof JSON.parse(JSON.stringify(d)) === 'object'));
  s.check('seo', 'jsonld-faq-en', (ld.find((d) => d['@type'] === 'FAQPage') as { mainEntity: unknown[] }).mainEntity.length === en.lists(true).faq.length);
  const prev = process.env.EN_SITE;
  const sitemap = (await import('../../app/sitemap')).default;
  try {
    delete process.env.EN_SITE;
    const off = await sitemap();
    process.env.EN_SITE = 'on';
    const on = await sitemap();
    s.check('seo', 'sitemap', off.length === 4 && !off.some((e) => e.url.endsWith('/en')) && on.some((e) => e.url.endsWith('/en') && !!e.alternates?.languages));
  } finally {
    if (prev === undefined) delete process.env.EN_SITE;
    else process.env.EN_SITE = prev;
  }
  const llms = await buildLlms({ hub: false, enSite: true });
  s.check('seo', 'llms-en', llms.includes('$349') && llms.includes('/en') && llms.startsWith(fs.readFileSync(path.join(ROOT, 'public', 'llms.txt'), 'utf8').replace(/\s+$/, '')));

  // payment
  s.check('payment', 'usd-button', checkoutButton('en', true, 'USDBTN').currency === 'USD' && checkoutButton('en', true, 'USDBTN').id === 'USDBTN');
  s.check('payment', 'ils-otherwise', checkoutButton('en', false, 'USDBTN').currency === 'ILS' && checkoutButton('he', true, 'USDBTN').currency === 'ILS' && checkoutButton('en', true, '').currency === 'ILS');
  s.check('payment', 'webhook-349', evaluatePaypalAmount(349, 'USD', {} as NodeJS.ProcessEnv).kind === 'paid' && evaluatePaypalAmount(299, 'USD', {} as NodeJS.ProcessEnv).kind === 'underpaid');

  // the English report
  const spec = GOLDEN_CASES[0];
  const st = buildWizardState(spec);
  const html = withQuietConsole(() => buildPdfHtml(mapWizardToValuationData(st, 'TEST-EN', 'en', TEST_FX)));
  const pages = html.split(/<div class="page(?: [^"]*)?">/).slice(1).map((p) => visibleText(p));
  s.check('report', 'eight-pages', pages.length === 8, String(pages.length));
  const want: Array<[number, string]> = [[0, 'Valuation report'], [1, 'Executive summary'], [3, 'Effective WACC'], [4, 'Position against sector multiples'], [5, 'Equity range by scenario']];
  for (const [i, w] of want) s.check('report', `page-${i + 1}-english`, (pages[i] ?? '').includes(w));
  for (const i of [0, 3, 4]) {
    const heb = (pages[i] ?? '').match(/\S*[֐-׿]+\S*/g) ?? [];
    s.check('report', `page-${i + 1}-no-hebrew`, heb.length === 0, heb.slice(0, 6).join(' '));
  }
  s.check('report', 'opinion-disclaimer', (pages[1] ?? '').includes('not a valuation opinion'));
  return s.result;
}
