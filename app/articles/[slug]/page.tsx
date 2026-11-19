import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PostView } from '../../../components/content-hub/PostView';
import { hubOn, postFor, postMetadata, requireHub } from '../../../lib/content/pages';
import { BUNDLED_POSTS, isGuide } from '../../../lib/content/posts';

/** Round 12 (CONTENT_HUB): one post under /articles. Revalidated like the index; posts that are not in the build render on first visit. */
export const revalidate = 600;
export const dynamicParams = true;

export function generateStaticParams(): Array<{ slug: string }> {
  if (!hubOn()) return [];
  return BUNDLED_POSTS.filter((p) => !isGuide(p)).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  if (!hubOn()) return {};
  return postMetadata((await postFor('articles', params.slug))?.post ?? null);
}

export default async function Page({ params }: { params: { slug: string } }) {
  requireHub();
  const found = await postFor('articles', params.slug);
  if (!found) notFound();
  return <PostView post={found.post} related={found.related} />;
}
