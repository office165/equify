import { buildFeed } from '../../lib/content/feeds';
import { hubOn } from '../../lib/content/pages';

/** Round 12 (CONTENT_HUB): RSS 2.0 at /feed, as on the SBC site: the latest 20 guides and articles. A 404 while the hub is off. */
export const revalidate = 600;

export async function GET() {
  if (!hubOn()) return new Response('Not found', { status: 404 });
  return new Response(await buildFeed(), { headers: { 'content-type': 'application/rss+xml; charset=UTF-8' } });
}
