import type { MetadataRoute } from 'next';
import { PUBLIC_PAGES, absoluteUrl } from '../lib/seo/site';

/** Round 6: sitemap.xml with the public pages only. */
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((p) => ({
    url: absoluteUrl(p.path),
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
