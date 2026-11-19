/**
 * Round 12 (CONTENT_HUB): data and metadata for the hub pages. With the flag off every page calls notFound() (a 404, as today)
 * and nothing on the site links to them.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { readSiteFlags } from '../flags/site_flags';
import { absoluteUrl } from '../seo/site';
import { allPosts, isGuide, postBySlug, postLang, postPath, relatedPosts, type EquifyPost, type PostMeta } from './posts';
import { langPrefix, siteLanguage } from '../i18n/site';
import { HUB } from './hub';

export const hubOn = (): boolean => readSiteFlags().contentHub;

export function requireHub(): void {
  if (!hubOn()) notFound();
}

export async function listFor(kind: 'guides' | 'articles', lang = 'he'): Promise<PostMeta[]> {
  const all = (await allPosts()).filter((p) => postLang(p) === lang);
  return all.filter((p) => (kind === 'guides' ? isGuide(p) : !isGuide(p)));
}

export async function postFor(kind: 'guides' | 'articles', slug: string, lang = 'he'): Promise<{ post: EquifyPost; related: PostMeta[] } | null> {
  const post = await postBySlug(decodeURIComponent(slug));
  if (!post || (kind === 'guides') !== isGuide(post) || postLang(post) !== lang) return null;
  return { post, related: relatedPosts((await allPosts()).filter((p) => postLang(p) === lang), post) };
}

/** Round 13: the hub index metadata in another language. */
export function hubMetadataLang(kind: 'guides' | 'articles', lang: string): Metadata {
  const L = siteLanguage(lang);
  const t = L.dict(true).hub;
  const title = kind === 'guides' ? t.guides : t.articles;
  const description = kind === 'guides' ? t.guidesLede : t.articlesLede;
  const url = absoluteUrl(`${langPrefix(lang)}${HUB[kind].path}`);
  return { title: `${title} | equify`, description, alternates: { canonical: url }, openGraph: { title, description, url, locale: L.def.ogLocale, type: 'website' } };
}

export function hubMetadata(kind: 'guides' | 'articles'): Metadata {
  if (!hubOn()) return {};
  const h = HUB[kind];
  return { title: `${h.title} | equify`, description: h.lede, alternates: { canonical: absoluteUrl(h.path) }, openGraph: { title: h.title, description: h.lede, url: absoluteUrl(h.path), locale: 'he_IL', type: 'website' } };
}

export function postMetadata(post: EquifyPost | null, lang = 'he'): Metadata {
  if (!hubOn() || !post) return {};
  const title = post.meta_title || `${post.seo_title || post.title} | equify`;
  const description = post.meta_description || post.excerpt;
  const url = absoluteUrl(`${langPrefix(lang)}${postPath(post)}`);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title: post.seo_title || post.title, description, url, type: 'article', locale: siteLanguage(lang).def.ogLocale, publishedTime: post.published_at, modifiedTime: post.updated_at || post.published_at },
  };
}
