import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PostIndex } from '../../../../components/content-hub/PostIndex';
import { HUB } from '../../../../lib/content/hub';
import { hubMetadataLang, hubOn, listFor } from '../../../../lib/content/pages';
import { langPrefix, siteLanguage } from '../../../../lib/i18n/site';

/** Round 13: /<lang>/guides, the hub's infrastructure in another language (posts with lang = <code>; none yet). Needs CONTENT_HUB too. */
export const revalidate = 600;

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  return hubOn() ? hubMetadataLang('guides', params.lang) : {};
}

export default async function Page({ params }: { params: { lang: string } }) {
  if (!hubOn()) notFound();
  const t = siteLanguage(params.lang).dict(true).hub;
  const posts = await listFor('guides', params.lang);
  return <PostIndex lang={params.lang} title={t.guides} lede={t.guidesLede} path={`${langPrefix(params.lang)}${HUB.guides.path}`} posts={posts} empty={t.noGuides} />;
}
