/**
 * Round 13 (EN_SITE): the words of the site (home page, menu, footer, hub, cookie banner, page titles) for one language.
 * One file per language under lib/i18n/site/<code>.ts exports a SiteLanguage; lib/i18n/site/index.ts lists them.
 * The wizard and the report already have their own tables (lib/i18n/equify_wizard_steps.ts, lib/wizard/equify_wizard_copy.ts,
 * lib/i18n/equify_results_strings.ts, valuation_i18n.tsx, lib/i18n/equify_report_copy.ts), keyed by locale.
 */
export type Item = readonly [href: string, label: string];
export type Faq = { q: string; a: string };
export type Model = { title: string; body: string };
export type Step = readonly [num: string, title: string, body: string, tag: string];

/** The landing lists. Hebrew keeps today's text with COPY_V2 off and the corrected text with it on; other languages have one text. */
export type LandingLists = { marquee: readonly string[]; models: readonly Model[]; faq: readonly Faq[]; steps: readonly Step[]; pricing: readonly string[] };

export type SiteDict = {
  skip: string;
  homeAria: string;
  nav: readonly Item[];
  cta: string;
  hero: { label: string; h1a: string; h1b: string; sub: string; start: string; simulator: string; meta: readonly string[] };
  sample: { aria: string; top: string; tag: string; cap: string; ev: string; netDebt: string; equity: string };
  methodsAria: string;
  why: { title: string; pages: string; methodsCount: number; methods: string; methodsSub: string; durationLabel: string; subSectors: string; subSectorsSub: string };
  steps: { label: string; titleA: string; titleHl: string; sub: string };
  calc: { label: string; titleA: string; titleHl: string; sub: string };
  models: { label: string; titleA: string; titleHl: string; sub: string };
  price: { label: string; titleA: string; titleHl: string; flag: string; name: string; old: string; now: string; per: string; cta: string; disc: string };
  faqTitle: { label: string; titleA: string; titleHl: string };
  final: { a: string; b: string; note: string; cta: string };
  footer: { start: string; terms: string; privacy: string; cookies: string; email: string };
  hub: { guides: string; articles: string; guidesLede: string; articlesLede: string; home: string; crumbs: string; noGuides: string; noArticles: string; start: string; related: string; faq: string; disclaimer: string };
  meta: { title: string; description: string };
};

export type LangDef = {
  /** The language code, and the first segment of its addresses (none for the default language). */
  code: string;
  /** Its own name, for the language switch. */
  name: string;
  dir: 'rtl' | 'ltr';
  hreflang: string;
  ogLocale: string;
  /** The wizard and report locale this language uses (the tables there know 'he' and 'en'). */
  appLocale: 'he' | 'en';
  /** The price of the report as shown in this language, and its currency for JSON-LD and checkout. */
  price: { amount: number; currency: 'ILS' | 'USD'; display: string };
};

export type SiteLanguage = { def: LangDef; dict: (copyV2: boolean) => SiteDict; lists: (copyV2: boolean) => LandingLists };
