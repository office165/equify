/**
 * Round 10: COPY_V2 and CONSENT_BANNER.
 *   flags-off:     every site flag is off by default; with the flags off the home page and step 1 render exactly as without the
 *                  provider (the root layout renders no provider then), and the copy tables are the old ones, object for object.
 *   copy-v2:       the corrected claims are gone (12 M&A deals, fixed 50/30/20 weights, the asset method, "Israeli multiples"),
 *                  and the visible text of the home page and of the wizard strings has none of the forbidden marks.
 *   jsonld:        the FAQPage follows the page: the old answers with COPY_V2 off, the new ones with it on.
 *   consent:       a choice is kept for a year and then asked again; another version is ignored; analytics wait for consent.
 *   step1-note:    the transparency line is in step 1 only with CONSENT_BANNER on.
 */
import { Suite, type SuiteResult } from '../lib/harness';
import { renderLanding, renderStep1, visibleText } from '../lib/render_site';
import { anySiteFlagOn, readSiteFlags, SITE_FLAGS_OFF } from '../../lib/flags/site_flags';
import { FEATURE_FLAGS } from '../../lib/flags/registry';
import { cleanMarks, cleanMarksDeep, FORBIDDEN_MARKS } from '../../lib/copy/marks';
import { landingCopy } from '../../components/landing/equify/use_landing_copy';
import {
  LANDING_FAQ,
  LANDING_FAQ_V2,
  LANDING_MODELS,
  LANDING_STEPS,
  MARQUEE_ITEMS,
  PRICING_FEATURES,
} from '../../components/landing/equify/equify-data';
import { faqJsonLd, FAQ_JSONLD_QUESTIONS } from '../../lib/seo/structured_data';
import { buildEquifyStrings } from '../../lib/i18n/use_equify_strings';
import { getEquifyWizardCopy, EQUIFY_WIZARD_COPY_HE, EQUIFY_WIZARD_COPY_EN } from '../../lib/wizard/equify_wizard_copy';
import { getEquifyWizardStepStrings } from '../../lib/i18n/equify_wizard_steps';
import { CONSENT_KEY, CONSENT_MAX_AGE_MS, parseConsent, readConsent, saveConsent } from '../../lib/consent/consent';
import { STEP1_PRIVACY_NOTE } from '../../lib/consent/privacy_note';
import { CONSENT_TEXT } from '../../components/consent/CookieConsent';

const FALSE_CLAIMS = [/12 עסקאות/, /עסקאות M&A/, /שווי נכסי/, /50% DCF/, /DCF 50% · /, /מכפילי שוק ישראלי/, /מכויל מ/, /נכסים/];

function allStrings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => allStrings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => allStrings(x, out));
  return out;
}

class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.has(k) ? (this.m.get(k) as string) : null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, v);
  }
}

export async function run(): Promise<SuiteResult> {
  const s = new Suite('round10');

  // flags
  const off = readSiteFlags({} as NodeJS.ProcessEnv);
  s.check('flags', 'default-off', JSON.stringify(off) === JSON.stringify(SITE_FLAGS_OFF) && !anySiteFlagOn(off));
  const on = readSiteFlags({ COPY_V2: ' ON ', CONSENT_BANNER: 'on', SITE_V2: 'yes' } as unknown as NodeJS.ProcessEnv);
  s.check('flags', 'parse', on.copyV2 && on.consentBanner && !on.siteV2 && anySiteFlagOn(on));
  s.check('flags', 'in-registry', ['COPY_V2', 'CONSENT_BANNER'].every((f) => (FEATURE_FLAGS as readonly string[]).includes(f)));

  // flags off: identical
  const plain = renderLanding(null);
  s.check('flags-off', 'landing-identical', plain === renderLanding({}), `${plain.length}`);
  s.check('flags-off', 'step1-identical', renderStep1(null) === renderStep1({}));
  const old = landingCopy(false);
  s.check('flags-off', 'landing-copy-same-objects', old.faq === LANDING_FAQ && old.models === LANDING_MODELS && old.steps === LANDING_STEPS && old.marquee === MARQUEE_ITEMS && old.pricing === PRICING_FEATURES);
  s.check('flags-off', 'wizard-copy-same', getEquifyWizardCopy('he') === EQUIFY_WIZARD_COPY_HE && getEquifyWizardCopy('en') === EQUIFY_WIZARD_COPY_EN);
  s.check('flags-off', 'wizard-steps-same', JSON.stringify(buildEquifyStrings('he').steps) === JSON.stringify(getEquifyWizardStepStrings('he')));
  s.check('flags-off', 'old-text-still-there', plain.includes('12 עסקאות M&amp;A') || plain.includes('12 עסקאות M&A'), 'the home page with the flag off keeps today\'s text');

  // copy v2: claims
  const v2 = landingCopy(true);
  const v2text = allStrings(v2).join('\n');
  for (const re of FALSE_CLAIMS) s.check('copy-v2', `no-claim ${re.source}`, !re.test(v2text), (v2text.match(re) ?? [''])[0]);
  s.check('copy-v2', 'no-asset-card', !v2.models.some((m) => m.title === 'שווי נכסי') && LANDING_MODELS.some((m) => m.title === 'שווי נכסי'));
  const landingV2 = renderLanding({ copyV2: true });
  const landingV2Text = visibleText(landingV2);
  for (const re of FALSE_CLAIMS) s.check('copy-v2', `landing-no-claim ${re.source}`, !re.test(landingV2Text), (landingV2Text.match(new RegExp(`.{0,40}${re.source}.{0,40}`)) ?? [''])[0]);
  const marks = landingV2Text.match(new RegExp(`.{0,30}(${FORBIDDEN_MARKS.source}).{0,30}`, 'g'));
  s.check('copy-v2', 'landing-no-marks', !marks, JSON.stringify(marks?.slice(0, 5)));
  s.check('copy-v2', 'landing-weights-not-fixed', landingV2Text.includes('המשקל של כל') && landingV2Text.includes('3'));
  s.check('copy-v2', 'price-unchanged', landingV2Text.includes('₪999') && landingV2Text.includes('₪1,990'));
  // Every visible string of the wizard (shell, steps and results tables) in both languages.
  for (const loc of ['he', 'en'] as const) {
    const strs = allStrings(buildEquifyStrings(loc, true));
    const bad = strs.filter((x) => FORBIDDEN_MARKS.test(x));
    s.check('copy-v2', `wizard-strings-no-marks ${loc}`, bad.length === 0, JSON.stringify(bad.slice(0, 5)));
  }
  s.check('copy-v2', 'wizard-market-headline', !/עסקאות/.test(getEquifyWizardCopy('he', true).reportMarketHeadline));
  s.check('copy-v2', 'wizard-no-fixed-weights', !/50%|30%|20%/.test(Object.values(getEquifyWizardCopy('he', true)).join(' ')));
  const step1v2 = visibleText(renderStep1({ copyV2: true }));
  s.check('copy-v2', 'step1-no-marks', !FORBIDDEN_MARKS.test(step1v2), (step1v2.match(new RegExp(`.{0,30}(${FORBIDDEN_MARKS.source}).{0,30}`)) ?? [''])[0]);

  // the cleaner itself
  const cases: Array<[string, string, 'he' | 'en']> = [
    ['שלב 1 · פרופיל החברה', 'שלב 1, פרופיל החברה', 'he'],
    ['2023–2026', '2023 עד 2026', 'he'],
    ['2.5x – 4x', '2.5x to 4x', 'en'],
    ['equify BY SBC — דף הבית', 'equify BY SBC, דף הבית', 'he'],
    ['חד־פעמי', 'חד פעמי', 'he'],
    ['WACC ו-EBITDA', 'WACC ו EBITDA', 'he'],
    ['050-0000000', '050-0000000', 'he'],
    ['B2B SaaS', 'B2B SaaS', 'en'],
  ];
  for (const [inp, want, loc] of cases) s.check('marks', inp, cleanMarks(inp, loc) === want, cleanMarks(inp, loc));
  s.check('marks', 'deep-keeps-functions', typeof cleanMarksDeep({ f: () => 1 }).f === 'function');

  // JSON-LD follows the page
  const ldOff = faqJsonLd(false) as { mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }> };
  const ldOn = faqJsonLd(true) as typeof ldOff;
  s.check('jsonld', 'off-old-answers', ldOff.mainEntity.every((q) => LANDING_FAQ.some((f) => f.q === q.name && f.a === q.acceptedAnswer.text)));
  s.check('jsonld', 'on-new-answers', ldOn.mainEntity.length === FAQ_JSONLD_QUESTIONS.length && ldOn.mainEntity.every((q) => LANDING_FAQ_V2.some((f) => f.q === q.name && f.a === q.acceptedAnswer.text)));
  s.check('jsonld', 'on-no-marks', !FORBIDDEN_MARKS.test(JSON.stringify(ldOn)));

  // consent
  const now = Date.parse('2026-11-19T00:00:00Z');
  const mem = new MemoryStorage();
  s.check('consent', 'none-at-first', readConsent(mem, now) === null);
  const saved = saveConsent(true, false, mem, now);
  const back = readConsent(mem, now + 1000);
  s.check('consent', 'saved', !!back && back.a === true && back.m === false && back.t === saved.t && mem.getItem(CONSENT_KEY) !== null);
  s.check('consent', 'kept-a-year', readConsent(mem, now + CONSENT_MAX_AGE_MS - 60_000)?.a === true);
  s.check('consent', 'asks-again-after-a-year', readConsent(mem, now + CONSENT_MAX_AGE_MS + 60_000) === null);
  s.check('consent', 'other-version', parseConsent(JSON.stringify({ v: 2, a: true, m: true, t: new Date(now).toISOString() }), now) === null);
  s.check('consent', 'garbage', parseConsent('{oops', now) === null && parseConsent('null', now) === null);
  saveConsent(false, false, mem, now);
  s.check('consent', 'necessary-only', readConsent(mem, now)?.a === false && readConsent(mem, now)?.m === false);
  s.check('consent', 'buttons', CONSENT_TEXT.acceptAll === 'אישור הכל' && CONSENT_TEXT.more === 'הגדרות' && CONSENT_TEXT.necessaryOnly === 'רק הכרחיות');
  s.check('consent', 'text-rules', !allStrings(CONSENT_TEXT).some((x) => FORBIDDEN_MARKS.test(x)) && !allStrings(STEP1_PRIVACY_NOTE).some((x) => FORBIDDEN_MARKS.test(x)));
  // Analytics: the root layout renders the gated component, which renders nothing until consent (no effect runs on the server).
  const { ConsentGatedAnalytics } = await import('../../components/consent/ConsentGatedAnalytics');
  const React = (await import('react')).default;
  const { renderToString } = await import('react-dom/server');
  s.check('consent', 'analytics-not-before-consent', renderToString(React.createElement(ConsentGatedAnalytics)) === '');

  // step 1 line
  const s1on = renderStep1({ consentBanner: true });
  s.check('step1-note', 'on', s1on.includes('step1-privacy-note') && s1on.includes(STEP1_PRIVACY_NOTE.he) && s1on.includes('href="/privacy"'));
  s.check('step1-note', 'off', !renderStep1(null).includes('step1-privacy-note'));
  s.check('step1-note', 'no-checkbox', !/type="checkbox"/.test(s1on.split('step1-privacy-note')[1]?.split('</p>')[0] ?? ''));

  return s.result;
}
