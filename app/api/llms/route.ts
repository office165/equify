import { buildLlms } from '../../../lib/content/feeds';
import { hubOn } from '../../../lib/content/pages';

/**
 * Round 12 (CONTENT_HUB): llms.txt with the guides and articles. With the hub on, next.config.js rewrites /llms.txt here; with it
 * off there is no rewrite and public/llms.txt is served as it was (its text is kept, and the posts follow it).
 */
export const revalidate = 600;

export async function GET() {
  if (!hubOn()) return new Response('Not found', { status: 404 });
  return new Response(await buildLlms(), { headers: { 'content-type': 'text/plain; charset=UTF-8' } });
}
