/**
 * Round 12 (CONTENT_HUB): data and metadata for the hub pages. With the flag off every page calls notFound() (a 404, as today)
 * and nothing on the site links to them.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { readSiteFlags } from '../flags/site_flags';
import { absoluteUrl } from '../seo/site';
import { allPosts, isGuide, postBySlug, postPath, relatedPosts, type EquifyPost, type PostMeta } from './posts';
import { HUB } from './hub';

export const hubOn = (): boolean => readSiteFlags().contentHub;

export function requireHub(): void {
  if (!hubOn()) notFound();
}

export async function listFor(kind: 'guides' | 'articles'): Promise<PostMeta[]> {
  const all = await allPosts();
  return all.filter((p) => (kind === 'guides' ? isGuide(p) : !isGuide(p)));
}

export async function postFor(kind: 'guides' | 'articles', slug: string): Promise<{ post: EquifyPost; related: PostMeta[] } | null> {
  const post = await postBySlug(decodeURIComponent(slug));
  if (!post || (kind === 'guides') !== isGuide(post)) return null;
  return { post, related: relatedPosts(await allPosts(), post) };
}

export function hubMetadata(kind: 'guides' | 'articles'): Metadata {
  if (!hubOn()) return {};
  const h = HUB[kind];
  return { title: `${h.title} | equify`, description: h.lede, alternates: { canonical: absoluteUrl(h.path) }, openGraph: { title: h.title, description: h.lede, url: absoluteUrl(h.path), locale: 'he_IL', type: 'website' } };
}

export function postMetadata(post: EquifyPost | null): Metadata {
  if (!hubOn() || !post) return {};
  const title = post.meta_title || `${post.seo_title || post.title} | equify`;
  const description = post.meta_description || post.excerpt;
  const url = absoluteUrl(postPath(post));
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title: post.seo_title || post.title, description, url, type: 'article', locale: 'he_IL', publishedTime: post.published_at, modifiedTime: post.updated_at || post.published_at },
  };
}
