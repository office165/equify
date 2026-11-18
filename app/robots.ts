import type { MetadataRoute } from 'next';
import { NON_PUBLIC_PATHS, SITE_ORIGIN, isIndexableDeployment } from '../lib/seo/site';

/** Round 6: robots.txt. Public pages only; the wizard, results, report and API are not crawled. */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexableDeployment()) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: [...NON_PUBLIC_PATHS] },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  };
}
