import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PostView } from '../../../../../components/content-hub/PostView';
import { hubOn, postFor, postMetadata } from '../../../../../lib/content/pages';

/** Round 13: one post in another language (lang = <code> in equify_posts). Rendered on first visit, revalidated like the Hebrew hub. */
export const revalidate = 600;
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: { lang: string; slug: string } }): Promise<Metadata> {
  if (!hubOn()) return {};
  return postMetadata((await postFor('guides', params.slug, params.lang))?.post ?? null, params.lang);
}

export default async function Page({ params }: { params: { lang: string; slug: string } }) {
  if (!hubOn()) notFound();
  const found = await postFor('guides', params.slug, params.lang);
  if (!found) notFound();
  return <PostView post={found.post} related={found.related} lang={params.lang} />;
}
