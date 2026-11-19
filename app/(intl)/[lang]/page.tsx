import type { Metadata } from 'next';
import { HomeV2 } from '../../../components/site-v2/HomeV2';
import { siteLanguage } from '../../../lib/i18n/site';
import { homeAlternates, langHomeJsonLd } from '../../../lib/i18n/site/seo';
import { jsonLdScriptContent } from '../../../lib/seo/structured_data';
import { absoluteUrl } from '../../../lib/seo/site';

/** Round 13 (EN_SITE): the home page of a prefixed language (/en), in the new design, with hreflang to every language. */
export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const L = siteLanguage(params.lang);
  const t = L.dict(true).meta;
  const url = absoluteUrl(`/${params.lang}`);
  return {
    title: { absolute: t.title },
    description: t.description,
    alternates: homeAlternates(params.lang),
    openGraph: { title: t.title, description: t.description, url, locale: L.def.ogLocale, type: 'website', siteName: 'equify BY SBC' },
    twitter: { card: 'summary_large_image', title: t.title, description: t.description },
  };
}

export default function Page({ params }: { params: { lang: string } }) {
  return (
    <>
      {langHomeJsonLd(params.lang).map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScriptContent(d) }} />
      ))}
      <HomeV2 lang={params.lang} />
    </>
  );
}
