import type { MetadataRoute } from 'next';
import { PUBLIC_PAGES, absoluteUrl } from '../lib/seo/site';
import { hubOn } from '../lib/content/pages';
import { allPosts, postLang, postPath } from '../lib/content/posts';
import { readSiteFlags } from '../lib/flags/site_flags';
import { langPrefix, PREFIXED_LANGS } from '../lib/i18n/site';
import { homeLanguages } from '../lib/i18n/site/seo';
import { HUB } from '../lib/content/hub';

/**
 * Round 6: sitemap.xml with the public pages only. Round 12: with CONTENT_HUB on, also /guides, /articles and every post.
 * Round 13: with EN_SITE on, also /en (and its hub when CONTENT_HUB is on), with hreflang between the home pages.
 */
export const revalidate = 600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = PUBLIC_PAGES.map((p) => ({
    url: absoluteUrl(p.path),
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
  const enSite = readSiteFlags().enSite;
  const langs = enSite ? PREFIXED_LANGS : [];
  if (enSite) {
    pages[0] = { ...pages[0], alternates: { languages: homeLanguages() } };
    for (const l of langs) pages.push({ url: absoluteUrl(`/${l}`), changeFrequency: 'weekly', priority: 0.9, alternates: { languages: homeLanguages() } });
  }
  if (!hubOn()) return pages;
  const posts = (await allPosts()).filter((p) => postLang(p) === 'he' || langs.includes(postLang(p)));
  const hePosts = posts.filter((p) => postLang(p) === 'he');
  return [
    ...pages,
    ...langs.flatMap((l) => [
      { url: absoluteUrl(`/${l}${HUB.guides.path}`), changeFrequency: 'weekly' as const, priority: 0.6 },
      { url: absoluteUrl(`/${l}${HUB.articles.path}`), changeFrequency: 'weekly' as const, priority: 0.6 },
    ]),
    { url: absoluteUrl(HUB.guides.path), changeFrequency: 'weekly', priority: 0.7, lastModified: hePosts.find((p) => p.desk === 'guide')?.published_at },
    { url: absoluteUrl(HUB.articles.path), changeFrequency: 'daily', priority: 0.7, lastModified: hePosts.find((p) => p.desk !== 'guide')?.published_at },
    ...posts.map((p) => ({ url: absoluteUrl(`${langPrefix(postLang(p))}${postPath(p)}`), lastModified: p.updated_at || p.published_at, changeFrequency: 'monthly' as const, priority: 0.6 })),
  ];
}
