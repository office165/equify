import type { MetadataRoute } from 'next';
import { PUBLIC_PAGES, absoluteUrl } from '../lib/seo/site';
import { hubOn } from '../lib/content/pages';
import { allPosts, postPath } from '../lib/content/posts';
import { HUB } from '../lib/content/hub';

/** Round 6: sitemap.xml with the public pages only. Round 12: with CONTENT_HUB on, also /guides, /articles and every post. */
export const revalidate = 600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = PUBLIC_PAGES.map((p) => ({
    url: absoluteUrl(p.path),
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
  if (!hubOn()) return pages;
  const posts = await allPosts();
  return [
    ...pages,
    { url: absoluteUrl(HUB.guides.path), changeFrequency: 'weekly', priority: 0.7, lastModified: posts.find((p) => p.desk === 'guide')?.published_at },
    { url: absoluteUrl(HUB.articles.path), changeFrequency: 'daily', priority: 0.7, lastModified: posts.find((p) => p.desk !== 'guide')?.published_at },
    ...posts.map((p) => ({ url: absoluteUrl(postPath(p)), lastModified: p.updated_at || p.published_at, changeFrequency: 'monthly' as const, priority: 0.6 })),
  ];
}
