import type { SiteLanguage } from './types';

/**
 * Round 13 (EN_SITE): English, at /en (LTR). Written from the corrected Hebrew text (COPY_V2), so it carries none of the claims
 * that are not true today. The report is "an algorithmic indication, not a valuation opinion". Price: $349, paid in USD.
 */
const en: SiteLanguage = {
  def: { code: 'en', name: 'English', dir: 'ltr', hreflang: 'en', ogLocale: 'en_US', appLocale: 'en', price: { amount: 349, currency: 'USD', display: '$349' } },
  lists: () => ({
    marquee: ['DCF + WACC', 'EBITDA multiple', 'Revenue multiple', 'Country risk premium (Damodaran)', 'Bear / Base / Bull scenarios', 'Damodaran multiples', 'Quality Score', 'Blended value'],
    models: [
      { title: 'DCF + WACC', body: 'Free cash flows to the firm (FCFF), discounted at a risk-adjusted cost of capital. WACC by CAPM with Damodaran data, and a terminal value at 2.5% growth.' },
      { title: 'EBITDA multiple', body: 'Sector multiples from Damodaran data on public companies, with a marketability and size discount for a private company. Your multiple is set by the quality score.' },
      { title: 'Revenue multiple', body: 'For businesses in growth or before operating profitability. Adjusted to the life stage and the sector.' },
      { title: 'Quality Score', body: 'Customer concentration, founder dependence, recurring revenue, competition, intellectual property, contracts and competitive advantage are combined into one score that calibrates the risk premium.' },
      { title: 'Bear / Base / Bull', body: 'Three scenarios around the base case, and sensitivity tables for WACC and EBITDA, so you can see how the value moves when an assumption moves.' },
    ],
    faq: [
      { q: 'How is the value weighted?', a: 'DCF, the EBITDA multiple and the revenue multiple are combined into one weighted average, and the quality score calibrates the risk premium. The result is one value indication for negotiation, not three separate valuations.' },
      { q: 'How long does it take?', a: 'About 10 minutes. The wizard has four input steps, and you can stop and come back. The PDF report is produced at the end.' },
      { q: 'Legal and regulatory standing', a: 'The report is an algorithmic indication, not a valuation opinion. It suits negotiation, fundraising and internal planning. It is not a signed accounting opinion and is not meant for a court or the tax authority.' },
      { q: 'What data do I need?', a: 'Annual revenue, EBITDA (or normalized operating profit), gross debt, cash and a growth forecast. Reasonable estimates are fine when there is no audited report.' },
      { q: 'Data security', a: 'Data travels over an encrypted connection (HTTPS) and is stored with cloud providers. SBC uses your details to contact you about the report and related services. What is collected, with whom and for how long: in the privacy policy (Hebrew).' },
      { q: 'DCF or market multiples?', a: 'DCF discounts cash flows at the WACC. The multiples are Damodaran\'s. The quality score calibrates the risk. The weight of each method depends on the sector, the life stage and the size of the business.' },
    ],
    steps: [
      ['01', 'Profile', 'Name, company, company number (optional) and contact details. They define the report\'s identity.', 'About 2 minutes'],
      ['02', 'Financials', 'Revenue, EBITDA, net debt and a forecast. The basis for the DCF and the multiples.', 'About 4 minutes'],
      ['03', 'Risk and quality', 'Seven factors: recurring revenue, customer concentration, founder dependence, competition, intellectual property, contracts and competitive advantage.', 'About 3 minutes'],
      ['04', 'Purpose and report', 'Choose the purpose of the valuation, accept the terms and produce the PDF.', 'About 1 minute'],
    ],
    pricing: ['DCF + WACC (Damodaran CRP) and market multiples (Damodaran)', 'Blended value with WACC and EBITDA sensitivity tables', 'A structured 8 page PDF report', 'Bear / Base / Bull scenarios'],
  }),
  dict: () => ({
    skip: 'Skip to main content',
    homeAria: 'equify BY SBC, home page',
    nav: [
      ['#how', 'How it works'],
      ['#calc', 'Value simulator'],
      ['#models', 'Methods'],
      ['#price', 'Pricing'],
      ['#faq', 'FAQ'],
    ],
    cta: 'Start a valuation',
    hero: {
      label: 'equify BY SBC, Israeli market 2026',
      h1a: 'Your business value.',
      h1b: 'In numbers.',
      sub: 'The report combines DCF, market multiples from Damodaran and a quality score. The value shown is a weighted average, and the weight of each method depends on the sector, the life stage and the size of the business.',
      start: 'Start a valuation',
      simulator: 'Try the simulator',
      meta: ['Free to start, pay when the report is produced', '', 'PDF report, 8 pages'],
    },
    sample: { aria: 'An illustration, not a real business', top: 'Equity value, base case', tag: 'An illustration, not a real business', cap: 'Example weights: DCF 50%, EBITDA 30%, revenue 20%. In the report they follow the sector', ev: 'Enterprise value (EV)', netDebt: 'Net debt', equity: 'Equity value' },
    methodsAria: 'Methods in the report',
    why: { title: 'Why equify', pages: 'PDF report pages', methodsCount: 3, methods: 'Weighted valuation methods', methodsSub: 'DCF, EBITDA and revenue', durationLabel: 'From data entry to report', subSectors: 'Sub-sectors', subSectorsSub: 'Each with its own multiples profile' },
    steps: { label: 'The input', titleA: 'Four input steps to a ', titleHl: 'structured valuation report.', sub: 'Profile, financials, risk factors and the purpose of the valuation. The report is produced at the end, with no manual export.' },
    calc: { label: 'Quick indication', titleA: 'EBITDA multiple ', titleHl: 'by sector.', sub: 'A first value indication from market multiples. The full report adds DCF, sensitivity tables and Bear/Base/Bull scenarios.' },
    models: { label: 'Methodology', titleA: 'Combined methodology.', titleHl: ' Weighted value.', sub: 'A valuation report built on three foundations: discounted cash flows (DCF) at a risk-adjusted cost of capital, sector multiples, and a quality score that assesses the stability of the cash flow. The value shown is a weighted average of the methods.' },
    price: { label: 'Pricing', titleA: 'A full valuation ', titleHl: 'report.', flag: 'Recommended', name: 'Full Pro report', old: '', now: '$349', per: 'One time', cta: 'Start a valuation', disc: 'An algorithmic indication, not a valuation opinion. Not investment advice.' },
    faqTitle: { label: 'FAQ', titleA: 'Frequently asked ', titleHl: 'questions.' },
    final: { a: 'Your business value.', b: 'In numbers.', note: 'Includes DCF, market multiples and risk analysis.', cta: 'Start a valuation' },
    footer: { start: 'Start a valuation', terms: 'Terms of use (Hebrew)', privacy: 'Privacy policy (Hebrew)', cookies: 'Cookie settings', email: 'hello@equify.co.il' },
    hub: {
      guides: 'Guides',
      articles: 'Articles',
      guidesLede: 'Guides to valuing a private business: the methods, the terms and the data behind them.',
      articlesLede: 'Articles on value, deals, financing and market data, for business owners and finance managers.',
      home: 'Home',
      crumbs: 'Breadcrumbs',
      noGuides: 'No guides in English yet.',
      noArticles: 'No articles in English yet.',
      start: 'Start a valuation',
      related: 'More on this topic',
      faq: 'Questions and answers',
      disclaimer: 'An algorithmic indication, not a valuation opinion.',
    },
    meta: {
      title: 'equify BY SBC: business valuation for Israeli private companies',
      description: 'An algorithmic value indication for a private business in Israel: DCF, EBITDA and revenue multiples from Damodaran data, and a PDF report. $349. Not a valuation opinion.',
    },
  }),
};
export default en;
