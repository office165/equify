import type { Metadata } from 'next';
import { PostIndex } from '../../../components/content-hub/PostIndex';
import { HUB } from '../../../lib/content/hub';
import { hubMetadata, listFor, requireHub } from '../../../lib/content/pages';

/** Round 12 (CONTENT_HUB): /guides. A new row in equify_posts shows within REVALIDATE_SECONDS, without a deploy. */
export const revalidate = 600;

export function generateMetadata(): Metadata {
  return hubMetadata('guides');
}

export default async function Page() {
  requireHub();
  const posts = await listFor('guides');
  return <PostIndex title={HUB.guides.title} lede={HUB.guides.lede} path={HUB.guides.path} posts={posts} empty={'עוד אין מדריכים.'} />;
}
