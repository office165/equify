import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { POSTS_TAG, postPath } from '../../../../lib/content/posts';
import { hubOn } from '../../../../lib/content/pages';
import { submitIndexNow } from '../../../../lib/content/indexnow';
import { absoluteUrl } from '../../../../lib/seo/site';

/**
 * Round 12 (CONTENT_HUB): an immediate refresh after the journalist writes a post, as on the SBC site (app/api/revalidate there):
 * POST with `Authorization: Bearer <CONTENT_REVALIDATE_SECRET>` and `{ "slug": "...", "desk": "..." }`. Without the secret set, or
 * with the hub off, the door is shut. Every hub page refreshes itself every 10 minutes anyway.
 */
export const dynamic = 'force-dynamic';

const same = (a: string, b: string) => timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());

export async function POST(req: Request) {
  const secret = process.env.CONTENT_REVALIDATE_SECRET?.trim();
  const given = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!hubOn() || !secret || !given || !same(given, secret)) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { slug?: unknown; desk?: unknown };
  revalidateTag(POSTS_TAG);
  const paths = ['/guides', '/articles', '/feed', '/sitemap.xml', '/llms.txt'];
  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
  const desk = typeof body.desk === 'string' ? body.desk.trim() : 'valuation';
  if (slug) paths.push(postPath({ slug, desk }));
  for (const p of paths) revalidatePath(p);
  const indexnow = await submitIndexNow([...(slug ? [absoluteUrl(postPath({ slug, desk }))] : []), absoluteUrl('/guides'), absoluteUrl('/articles')]).catch(() => ({ sent: false, count: 0 }));
  return NextResponse.json({ ok: true, revalidated: paths, indexnow });
}
