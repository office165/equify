import bundled from '../../content/posts.json';

/**
 * Round 12 (CONTENT_HUB): the guides and the articles, in the mechanism of the SBC site (sbc-site/lib/posts.ts).
 * The source is the `equify_posts` table in equify's Supabase (SBC's journalist agent writes there), read with the public key:
 * only rows with status = 'published' are readable (RLS, supabase/migrations/20261119_equify_posts.sql). The first guides are also
 * bundled with the site (content/posts.json), so the hub is never empty: while the table is not there, cannot be read, or has no rows,
 * the bundle is shown. A row in the table wins over the bundled copy of the same slug (a draft row hides it).
 * Every read is cached for REVALIDATE_SECONDS and tagged POSTS_TAG, so a new article appears without a deploy (and at once through
 * POST /api/content/revalidate).
 */
export type EquifyPost = {
  slug: string;
  title: string;
  content_html: string;
  excerpt: string;
  featured_image_url: string | null;
  featured_image_alt: string;
  meta_title: string | null;
  meta_description: string | null;
  /** 'guide' for the guides (/guides); any other desk is an article (/articles). */
  desk: string;
  published_at: string;
  updated_at: string | null;
  author_name: string;
  status: string;
  summary?: string | null;
  faq?: { q: string; a: string }[] | null;
  seo_title?: string | null;
  /** Round 13: the post's language ('he' when absent). /en/guides and /en/articles show only posts with lang 'en'. */
  lang?: string | null;
};
export type PostMeta = Omit<EquifyPost, 'content_html'>;

export const POSTS_TABLE = 'equify_posts';
export const POSTS_TAG = 'equify-posts';
export const REVALIDATE_SECONDS = 600;
export const GUIDE_DESK = 'guide';

/** The desks the journalist may use (reports/round-12/journalist-handoff.md). An unknown desk is shown as "כתבה". */
export const DESKS = [
  { id: 'guide', label: 'מדריך' },
  { id: 'valuation', label: 'הערכות שווי' },
  { id: 'deals', label: 'מכירה ורכישה' },
  { id: 'finance', label: 'מימון ואשראי' },
  { id: 'market', label: 'שוק ונתונים' },
] as const;
export const deskLabel = (id: string | null | undefined): string => DESKS.find((d) => d.id === id)?.label ?? 'כתבה';

/** The journalist's articles are signed by the editorial board. */
export const AUTHOR_DISPLAY = 'מערכת equify';
export const displayAuthor = (name: string | null | undefined): string =>
  !name || /^(הסוכן העיתונאי|journalist)$/i.test(name.trim()) ? AUTHOR_DISPLAY : name;

const BUNDLE: EquifyPost[] = (bundled as EquifyPost[]).map((p) => ({ ...p, status: p.status || 'published' }));

const LIST_COLUMNS = 'slug,title,excerpt,featured_image_url,featured_image_alt,meta_title,meta_description,desk,published_at,updated_at,author_name,status';
const EXTRA_COLUMNS = 'summary,faq,seo_title,lang';

type Fetcher = (url: string, init: RequestInit & { next?: { revalidate: number; tags: string[] } }) => Promise<Response>;
let fetcher: Fetcher = (url, init) => fetch(url, init as RequestInit);
/** Tests only: replace the network. */
export function __setPostsFetcher(f: Fetcher | null): void {
  fetcher = f ?? ((url, init) => fetch(url, init as RequestInit));
}

function supabaseConfig(env: NodeJS.ProcessEnv = process.env): { base: string; key: string } | null {
  const base = (env.EQUIFY_POSTS_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL)?.trim();
  const key = (env.EQUIFY_POSTS_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY)?.trim();
  return base && key ? { base: base.replace(/\/+$/, ''), key } : null;
}

/** One read of the table, or null when it is not configured, not there, or cannot be read. */
async function readRows<T>(columns: string, query: string): Promise<T[] | null> {
  const cfg = supabaseConfig();
  if (!cfg) return null;
  const read = (cols: string) =>
    fetcher(`${cfg.base}/rest/v1/${POSTS_TABLE}?select=${cols}&${query}`, {
      headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` },
      next: { revalidate: REVALIDATE_SECONDS, tags: [POSTS_TAG] },
    });
  try {
    let res = await read(`${columns},${EXTRA_COLUMNS}`);
    if (res.status === 400) res = await read(columns);
    if (!res.ok) return null;
    const rows = (await res.json()) as T[];
    return Array.isArray(rows) ? rows : null;
  } catch {
    return null;
  }
}

const live = (p: { status: string }): boolean => p.status === 'published';
const normalize = <T extends PostMeta>(p: T): T => ({ ...p, author_name: displayAuthor(p.author_name) });
const withoutBody = ({ content_html: _b, ...meta }: EquifyPost): PostMeta => meta;
const byDate = (a: PostMeta, b: PostMeta): number => b.published_at.localeCompare(a.published_at);

/** Every published post, newest first, without the bodies. */
export async function allPosts(): Promise<PostMeta[]> {
  const rows = await readRows<PostMeta>(LIST_COLUMNS, 'order=published_at.desc&limit=2000');
  const bySlug = new Map<string, PostMeta>();
  for (const p of BUNDLE) bySlug.set(p.slug, normalize(withoutBody(p)));
  for (const p of rows ?? []) bySlug.set(p.slug, normalize(p));
  return [...bySlug.values()].filter(live).sort(byDate);
}

/** One post with its body: the row wins, then the bundle; only published. */
export async function postBySlug(slug: string): Promise<EquifyPost | null> {
  const rows = await readRows<EquifyPost>(`${LIST_COLUMNS},content_html`, `slug=eq.${encodeURIComponent(slug)}&limit=1`);
  const row = rows?.[0];
  const p = row ?? BUNDLE.find((b) => b.slug === slug) ?? null;
  return p && live(p) ? normalize(p) : null;
}

export const isGuide = (p: { desk: string }): boolean => p.desk === GUIDE_DESK;
export const postLang = (p: { lang?: string | null }): string => p.lang?.trim() || 'he';
export const postPath = (p: { slug: string; desk: string }): string => `${isGuide(p) ? '/guides' : '/articles'}/${encodeURIComponent(p.slug)}`;

/** Up to `n` related posts: the same desk first, then the newest, never the post itself. */
export function relatedPosts(all: PostMeta[], current: { slug: string; desk: string }, n = 3): PostMeta[] {
  const others = all.filter((p) => p.slug !== current.slug);
  return [...others.filter((p) => p.desk === current.desk), ...others.filter((p) => p.desk !== current.desk)].slice(0, n);
}

/** The bundled posts, for tests and for the build when the table is empty. */
export const BUNDLED_POSTS: readonly EquifyPost[] = BUNDLE;
