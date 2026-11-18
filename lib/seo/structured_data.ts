/**
 * Round 6: JSON-LD for the home page. Everything here is already on the site:
 *   Organization  equify BY SBC, with SBC as the parent organization (footer: "equify BY SBC").
 *   WebSite       name and URL.
 *   Service       the report and its price as shown on the pricing card today (₪999, one time).
 *                 The struck-through ₪1,990 is not included, and neither is the feature list of the
 *                 pricing card ("מכפילי שוק ישראליים" there is not accurate, see reports/round-6.md).
 *   FAQPage       only questions that are on the landing page (LANDING_FAQ), word for word, and only
 *                 those whose answer matches the product today. Left out: "DCF לעומת מכפילי שוק" (it
 *                 says the multiples are calibrated on 12 Israeli M&A deals and gives fixed weights;
 *                 neither is true today, see reports/round-6.md) and "אבטחת מידע" (claims not checked).
 * No reviews, ratings or invented questions.
 */
import { LANDING_FAQ } from '../../components/landing/equify/equify-data';
import { BRAND_NAME, HOME_DESCRIPTION } from '../brand/brand-identity';
import { SITE_ORIGIN } from './site';

/** Questions from the landing FAQ that go into FAQPage. */
export const FAQ_JSONLD_QUESTIONS = ['מתודולוגיית השקלול', 'זמן השלמה', 'תוקף משפטי ורגולטורי', 'נתוני קלט נדרשים'] as const;

/** Price as shown on the pricing card (components/landing/equify/sections/PricingSection.tsx). */
export const REPORT_PRICE_ILS = 999;

type Json = Record<string, unknown>;

export function organizationJsonLd(): Json {
  const sbcUrl = process.env.SBC_SITE_URL?.trim();
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_ORIGIN}/#organization`,
    name: BRAND_NAME,
    alternateName: ['equify', 'אקוויפי'],
    url: `${SITE_ORIGIN}/`,
    logo: `${SITE_ORIGIN}/equify-icon-512.png`,
    parentOrganization: { '@type': 'Organization', name: 'SBC', ...(sbcUrl ? { url: sbcUrl } : {}) },
  };
}

export function websiteJsonLd(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_ORIGIN}/#website`,
    name: BRAND_NAME,
    url: `${SITE_ORIGIN}/`,
    inLanguage: 'he-IL',
    publisher: { '@id': `${SITE_ORIGIN}/#organization` },
  };
}

export function serviceJsonLd(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${SITE_ORIGIN}/#valuation-report`,
    name: 'דוח הערכת שווי',
    serviceType: 'הערכת שווי לעסקים',
    description: HOME_DESCRIPTION,
    provider: { '@id': `${SITE_ORIGIN}/#organization` },
    areaServed: { '@type': 'Country', name: 'Israel' },
    inLanguage: 'he-IL',
    url: `${SITE_ORIGIN}/`,
    offers: {
      '@type': 'Offer',
      price: REPORT_PRICE_ILS,
      priceCurrency: 'ILS',
      url: `${SITE_ORIGIN}/#price`,
      availability: 'https://schema.org/InStock',
    },
  };
}

export function faqJsonLd(): Json {
  const items = LANDING_FAQ.filter((f) => (FAQ_JSONLD_QUESTIONS as readonly string[]).includes(f.q));
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function homeJsonLd(): Json[] {
  return [organizationJsonLd(), websiteJsonLd(), serviceJsonLd(), faqJsonLd()];
}

/** JSON for a <script type="application/ld+json">, with "<" escaped so it cannot close the tag. */
export function jsonLdScriptContent(data: Json): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
