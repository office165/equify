import type { Metadata } from 'next';
import { PostIndex } from '../../components/content-hub/PostIndex';
import { HUB } from '../../lib/content/hub';
import { hubMetadata, listFor, requireHub } from '../../lib/content/pages';

/** Round 12 (CONTENT_HUB): /articles. A new row in equify_posts shows within REVALIDATE_SECONDS, without a deploy. */
export const revalidate = 600;

export function generateMetadata(): Metadata {
  return hubMetadata('articles');
}

export default async function Page() {
  requireHub();
  const posts = await listFor('articles');
  return <PostIndex title={HUB.articles.title} lede={HUB.articles.lede} path={HUB.articles.path} posts={posts} empty={'עוד אין כתבות.'} />;
}
