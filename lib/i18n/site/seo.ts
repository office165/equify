import type { Metadata } from 'next';
import { LANGS, langPrefix, siteLanguage, DEFAULT_LANG } from './index';
import { organizationJsonLd } from '../../seo/structured_data';
import { SITE_ORIGIN, absoluteUrl } from '../../seo/site';
import { BRAND_NAME } from '../../brand/brand-identity';

/**
 * Round 13 (EN_SITE): hreflang and JSON-LD of the home page in every language. The Hebrew home page adds these alternates only
 * when EN_SITE is on, so with the flag off its metadata is what it was.
 */
export function homeLanguages(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of LANGS) out[l.hreflang] = absoluteUrl(langPrefix(l.code) || '/');
  out['x-default'] = absoluteUrl('/');
  return out;
}

export function homeAlternates(lang: string): NonNullable<Metadata['alternates']> {
  return { canonical: absoluteUrl(lang === DEFAULT_LANG ? '/' : `/${lang}`), languages: homeLanguages() };
}

type Json = Record<string, unknown>;

/** Organization (shared), WebSite, Service with this language's price, and FAQPage with this language's questions. */
export function langHomeJsonLd(lang: string): Json[] {
  const L = siteLanguage(lang);
  const t = L.dict(true);
  const url = absoluteUrl(langPrefix(lang) || '/');
  const faq = L.lists(true).faq;
  return [
    organizationJsonLd(),
    { '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${url}#website`, name: BRAND_NAME, url, inLanguage: L.def.hreflang, publisher: { '@id': `${SITE_ORIGIN}/#organization` } },
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      '@id': `${url}#valuation-report`,
      name: t.price.name,
      serviceType: 'Business valuation',
      description: t.meta.description,
      provider: { '@id': `${SITE_ORIGIN}/#organization` },
      areaServed: { '@type': 'Country', name: 'Israel' },
      inLanguage: L.def.hreflang,
      url,
      offers: { '@type': 'Offer', price: L.def.price.amount, priceCurrency: L.def.price.currency, url: `${url}#price`, availability: 'https://schema.org/InStock' },
    },
    { '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: L.def.hreflang, mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ];
}
