/**
 * Round 12: CONTENT_HUB.
 *   bundle:     with no table (no Supabase settings, or a read that fails) the hub is built from content/posts.json.
 *   table:      a published row wins over the bundled copy of the same slug; a draft row is not shown (and hides the bundled copy).
 *   jsonld:     every post page has Article and BreadcrumbList, and FAQPage when the post has questions; all parse.
 *   sitemap, feed, llms: the posts are listed when the flag is on; /feed and the llms route are a 404 when it is off.
 *   flag-off:   the pages call notFound(), and neither home page links to them.
 *   writing:    the bundled guides follow the rules: no forbidden marks, no promises, a source for every outside number, the wizard link.
 */
import '../lib/css_stub';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Suite, type SuiteResult } from '../lib/harness';
import { renderHomeV2, renderLanding, visibleText } from '../lib/render_site';
import { withQuietConsole } from '../lib/quiet';
import { __setPostsFetcher, allPosts, BUNDLED_POSTS, postBySlug } from '../../lib/content/posts';
import { sanitizePostHtml } from '../../lib/content/sanitize';
import { indexNowBody, indexNowEnabled, submitIndexNow } from '../../lib/content/indexnow';
import { FORBIDDEN_MARKS } from '../../lib/copy/marks';
import { FEATURE_FLAGS } from '../../lib/flags/registry';

const ENV_KEYS = ['CONTENT_HUB', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'EQUIFY_POSTS_SUPABASE_URL', 'EQUIFY_POSTS_ANON_KEY', 'CONTENT_REVALIDATE_SECRET'];
async function withEnv<T>(env: Record<string, string | undefined>, fn: () => Promise<T>): Promise<T> {
  const prev = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
  for (const [k, v] of Object.entries(env)) if (v !== undefined) process.env[k] = v;
  try {
    return await fn();
  } finally {
    for (const k of ENV_KEYS) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
  }
}
const TABLE = { EQUIFY_POSTS_SUPABASE_URL: 'https://example.invalid', EQUIFY_POSTS_ANON_KEY: 'test-anon-key-not-a-secret' };
const row = (o: Record<string, unknown>) => ({ excerpt: 'x', featured_image_url: null, featured_image_alt: '', meta_title: null, meta_description: null, updated_at: null, author_name: 'הסוכן העיתונאי', content_html: '<p>גוף</p>', ...o });
const g0 = BUNDLED_POSTS[0];
const ROWS = [
  row({ slug: g0.slug, title: 'כותרת מהטבלה', desk: 'guide', status: 'published', published_at: '2026-11-19T08:00:00Z' }),
  row({ slug: 'new-article-one', title: 'כתבה חדשה', desk: 'valuation', status: 'published', published_at: '2026-11-20T08:00:00Z', faq: [{ q: 'שאלה?', a: 'תשובה.' }] }),
  row({ slug: 'draft-article', title: 'טיוטה', desk: 'market', status: 'draft', published_at: '2026-11-21T08:00:00Z' }),
  row({ slug: BUNDLED_POSTS[1].slug, title: 'טיוטה שמסתירה', desk: 'guide', status: 'draft', published_at: '2026-11-19T08:00:00Z' }),
];
/** A fake PostgREST: published rows only, as RLS answers the anon key (the draft rows are in ROWS to show the code also filters). */
function fakeTable(rlsFilters = true) {
  __setPostsFetcher(async (url) => {
    const u = new URL(url);
    let rows = ROWS.filter((r) => !rlsFilters || r.status === 'published');
    const slug = u.searchParams.get('slug');
    if (slug) rows = rows.filter((r) => `eq.${r.slug}` === slug);
    return new Response(JSON.stringify(rows), { status: 200, headers: { 'content-type': 'application/json' } });
  });
}
const isNotFound = async (fn: () => unknown): Promise<boolean> => {
  try {
    await fn();
    return false;
  } catch (e) {
    return String((e as { digest?: string }).digest ?? e).includes('NEXT_NOT_FOUND');
  }
};
const ldBlocks = (html: string) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]) as Record<string, unknown>);

export async function run(): Promise<SuiteResult> {
  const s = new Suite('round12');
  (globalThis as unknown as { React: typeof React }).React = React;
  s.check('flags', 'in-registry', (FEATURE_FLAGS as readonly string[]).includes('CONTENT_HUB'));

  // bundle
  await withEnv({}, async () => {
    __setPostsFetcher(null);
    const all = await allPosts();
    s.check('bundle', 'no-table', all.length === 8 && all.every((p) => p.desk === 'guide' && p.author_name === 'מערכת equify'), String(all.length));
  });
  await withEnv(TABLE, async () => {
    __setPostsFetcher(async () => new Response('relation "equify_posts" does not exist', { status: 404 }));
    s.check('bundle', 'table-missing', (await allPosts()).length === 8);
    __setPostsFetcher(async () => {
      throw new Error('network');
    });
    s.check('bundle', 'network-error', (await allPosts()).length === 8 && (await postBySlug(g0.slug))?.title === g0.title);
  });

  // table
  for (const rls of [true, false]) {
    await withEnv(TABLE, async () => {
      fakeTable(rls);
      const all = await allPosts();
      const bySlug = new Map(all.map((p) => [p.slug, p]));
      s.check('table', `row-wins rls=${rls}`, bySlug.get(g0.slug)?.title === 'כותרת מהטבלה');
      s.check('table', `new-row rls=${rls}`, bySlug.has('new-article-one') && all[0].slug === 'new-article-one');
      s.check('table', `draft-not-shown rls=${rls}`, !bySlug.has('draft-article') && (await postBySlug('draft-article')) === null);
      s.check('table', `journalist-signed rls=${rls}`, bySlug.get('new-article-one')?.author_name === 'מערכת equify');
      if (!rls) s.check('table', 'draft-row-hides-bundle', !bySlug.has(BUNDLED_POSTS[1].slug));
    });
  }
  __setPostsFetcher(null);

  // pages with the flag on
  const guidesIndex = (await import('../../app/(he)/guides/page')).default;
  const guidePage = (await import('../../app/(he)/guides/[slug]/page')).default;
  const articlesIndex = (await import('../../app/(he)/articles/page')).default;
  const articlePage = (await import('../../app/(he)/articles/[slug]/page')).default;
  const sitemap = (await import('../../app/sitemap')).default;
  const feed = await import('../../app/feed/route');
  const llms = await import('../../app/api/llms/route');
  const revalidate = await import('../../app/api/content/revalidate/route');
  const render = async (el: unknown) => withQuietConsole(() => renderToString((el as React.ReactElement)));

  await withEnv({ CONTENT_HUB: 'on' }, async () => {
    const idx = await render(await guidesIndex());
    s.check('pages', 'guides-index', BUNDLED_POSTS.every((p) => idx.includes(p.title)) && idx.includes('href="/wizard"'));
    const one = await render(await guidePage({ params: { slug: g0.slug } }));
    const lds = ldBlocks(one);
    const types = lds.map((d) => d['@type']);
    s.check('jsonld', 'article', types.includes('Article') && types.includes('BreadcrumbList') && types.includes('FAQPage'), JSON.stringify(types));
    const art = lds.find((d) => d['@type'] === 'Article') as Record<string, unknown>;
    s.check('jsonld', 'article-fields', art.headline === g0.title && !!art.datePublished && (art.author as { name: string }).name === 'מערכת equify' && String(art.url).endsWith(`/guides/${g0.slug}`));
    const bc = lds.find((d) => d['@type'] === 'BreadcrumbList') as { itemListElement: unknown[] };
    s.check('jsonld', 'breadcrumbs', bc.itemListElement.length === 3);
    s.check('pages', 'post-has-wizard-and-related', one.includes('href="/wizard"') && one.includes('עוד באותו נושא') && (one.match(/class="hub-card"/g) ?? []).length === 3);
    s.check('pages', 'guide-not-under-articles', await isNotFound(() => articlePage({ params: { slug: g0.slug } })));
    s.check('pages', 'unknown-slug-404', await isNotFound(() => guidePage({ params: { slug: 'no-such-post' } })));
    s.check('pages', 'articles-empty-ok', (await render(await articlesIndex())).includes('עוד אין כתבות'));

    const map = await sitemap();
    s.check('sitemap', 'posts-on', BUNDLED_POSTS.every((p) => map.some((e) => e.url.endsWith(`/guides/${p.slug}`))) && map.some((e) => e.url.endsWith('/guides')) && map.some((e) => e.url.endsWith('/articles')));
    const rss = await (await feed.GET()).text();
    s.check('feed', 'rss-on', rss.startsWith('<?xml') && (rss.match(/<item>/g) ?? []).length === 8 && rss.includes('<language>he-IL</language>'));
    const txt = await (await llms.GET()).text();
    s.check('llms', 'posts-listed', txt.includes('## מדריכים') && BUNDLED_POSTS.every((p) => txt.includes(`/guides/${p.slug}`)) && txt.startsWith('# '));
    s.check('revalidate', 'no-secret-401', (await revalidate.POST(new Request('http://x/api/content/revalidate', { method: 'POST' }))).status === 401);

    // a table row shows as an article, with its FAQ in JSON-LD
    await withEnv({ CONTENT_HUB: 'on', ...TABLE }, async () => {
      fakeTable(true);
      const a = await render(await articlePage({ params: { slug: 'new-article-one' } }));
      s.check('table', 'article-page', a.includes('כתבה חדשה') && ldBlocks(a).some((d) => d['@type'] === 'FAQPage'));
      s.check('table', 'sitemap-has-row', (await sitemap()).some((e) => e.url.endsWith('/articles/new-article-one')));
      __setPostsFetcher(null);
    });
  });

  // flag off
  await withEnv({}, async () => {
    s.check('flag-off', 'pages-404', (await isNotFound(() => guidesIndex())) && (await isNotFound(() => articlesIndex())) && (await isNotFound(() => guidePage({ params: { slug: g0.slug } }))) && (await isNotFound(() => articlePage({ params: { slug: 'x' } }))));
    s.check('flag-off', 'feed-404', (await feed.GET()).status === 404 && (await llms.GET()).status === 404);
    const map = await sitemap();
    s.check('flag-off', 'sitemap-unchanged', map.length === 4 && !map.some((e) => /guides|articles/.test(e.url)));
    s.check('flag-off', 'no-links', !/href="\/(guides|articles)"/.test(renderLanding(null)) && !/href="\/(guides|articles)"/.test(renderHomeV2({})));
  });
  s.check('flag-on', 'links', /href="\/guides"/.test(renderLanding({ contentHub: true })) && /href="\/articles"/.test(renderHomeV2({ contentHub: true })));

  // writing rules of the bundle
  const PROMISE = /(מבטיח|מובטח|בוודאות|תקבלו שווי|אישור תוך|100%|תיווך)/;
  for (const p of BUNDLED_POSTS) {
    const text = visibleText(p.content_html) + ' ' + p.title + ' ' + p.excerpt + ' ' + (p.summary ?? '') + ' ' + (p.faq ?? []).map((f) => f.q + ' ' + f.a).join(' ');
    s.check('writing', `marks ${p.slug}`, !FORBIDDEN_MARKS.test(text), (text.match(new RegExp(`.{0,25}(${FORBIDDEN_MARKS.source}).{0,25}`)) ?? [''])[0]);
    s.check('writing', `promises ${p.slug}`, !PROMISE.test(text), (text.match(PROMISE) ?? [''])[0]);
    s.check('writing', `wizard-link ${p.slug}`, p.content_html.includes('href="/wizard"'));
    // A percentage that is not one of equify's own parameters (2.5% growth, the 30/50/20 EBITDA weights) needs a source on the page.
    const outside = (text.match(/\d+(\.\d+)?%/g) ?? []).filter((x) => !['2.5%', '30%', '50%', '20%'].includes(x));
    s.check('writing', `sources ${p.slug}`, outside.length === 0 || p.content_html.includes('<h2>מקורות</h2>'), outside.join(' '));
    s.check('writing', `no-people-images ${p.slug}`, p.featured_image_url === null && !/<img/i.test(p.content_html));
  }
  s.check('writing', 'eight-topics', BUNDLED_POSTS.length === 8);

  // sanitizer and IndexNow
  const dirty = '<p onclick="x()">a<script>alert(1)</script><a href="javascript:alert(1)">b</a><a href="https://example.com/x">c</a><iframe src="x"></iframe><img src=x onerror=y></p>';
  const clean = sanitizePostHtml(dirty);
  s.check('sanitize', 'net', !/script|onclick|javascript:|iframe|<img|onerror/i.test(clean) && clean.includes('target="_blank"') && clean.includes('>c</a>'), clean);
  s.check('indexnow', 'off-by-default', !indexNowEnabled({} as NodeJS.ProcessEnv) && !(await submitIndexNow(['https://equify.co.il/guides'], {} as NodeJS.ProcessEnv)).sent);
  s.check('indexnow', 'own-host-only', indexNowBody(['https://equify.co.il/a', 'https://evil.example/b', 'not a url']).urlList.length === 1);
  return s.result;
}
