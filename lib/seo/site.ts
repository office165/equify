/**
 * Round 6: one canonical origin for canonical URLs, the sitemap, robots and structured data.
 * NEXT_PUBLIC_SITE_URL is used only when it is the equify.co.il domain; any other value (for example
 * a vercel.app address) falls back to https://equify.co.il, so canonical never points to Vercel.
 */
const DEFAULT_ORIGIN = 'https://equify.co.il';

export function resolveSiteOrigin(raw = process.env.NEXT_PUBLIC_SITE_URL): string {
  const v = raw?.trim();
  if (!v) return DEFAULT_ORIGIN;
  try {
    const u = new URL(v);
    if (u.protocol === 'https:' && (u.hostname === 'equify.co.il' || u.hostname.endsWith('.equify.co.il'))) {
      return u.origin;
    }
  } catch {
    // fall through
  }
  return DEFAULT_ORIGIN;
}

export const SITE_ORIGIN = resolveSiteOrigin();

/**
 * Search engines index only production. On a Vercel preview (VERCEL_ENV=preview or development)
 * robots.txt disallows everything. Locally (no VERCEL_ENV) the production rules are served.
 */
export function isIndexableDeployment(env = process.env.VERCEL_ENV): boolean {
  return !env || env === 'production';
}

/** Public pages: in the sitemap, indexable. Everything else (wizard, results, report, API) is not. */
export const PUBLIC_PAGES: ReadonlyArray<{ path: string; priority: number; changeFrequency: 'weekly' | 'monthly' | 'yearly' }> = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/accessibility', priority: 0.3, changeFrequency: 'yearly' },
];

/** Paths crawlers are asked not to visit (robots.txt), and that carry noindex. */
export const NON_PUBLIC_PATHS = ['/api/', '/wizard', '/results', '/report', '/payment'] as const;

export function absoluteUrl(path: string): string {
  return `${SITE_ORIGIN}${path === '/' ? '/' : path}`;
}
