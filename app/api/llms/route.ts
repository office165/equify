import { buildLlms } from '../../../lib/content/feeds';
import { readSiteFlags } from '../../../lib/flags/site_flags';

/**
 * Round 12 (CONTENT_HUB) and 13 (EN_SITE): llms.txt with the guides and articles, and the English site with its price. With either
 * flag on, next.config.js rewrites /llms.txt here; with both off there is no rewrite and public/llms.txt is served as it was.
 */
export const revalidate = 600;

export async function GET() {
  const f = readSiteFlags();
  if (!f.contentHub && !f.enSite) return new Response('Not found', { status: 404 });
  return new Response(await buildLlms(), { headers: { 'content-type': 'text/plain; charset=UTF-8' } });
}
