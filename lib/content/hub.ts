/**
 * Round 12 (CONTENT_HUB): what the hub pages share: the paths, the JSON-LD (Article, FAQPage when the post has questions,
 * BreadcrumbList), and the page titles. Everything signed by the editorial board, publisher equify BY SBC.
 */
import { SITE_ORIGIN, absoluteUrl } from '../seo/site';
import { BRAND_NAME } from '../brand/brand-identity';
import { isGuide, postPath, type EquifyPost, type PostMeta } from './posts';

export const HUB = {
  guides: { path: '/guides', title: 'מדריכים', lede: 'מדריכים קבועים על הערכת שווי של עסק פרטי: השיטות, המונחים והנתונים שעליהם הם נשענים.' },
  articles: { path: '/articles', title: 'כתבות', lede: 'כתבות על שווי, עסקאות, מימון ונתוני שוק, לבעלי עסקים ולמנהלי כספים.' },
} as const;

export { HUB_NAV } from './hub_nav';

type Json = Record<string, unknown>;

const plain = (html: string): string => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

export function articleJsonLd(p: EquifyPost): Json {
  const url = absoluteUrl(postPath(p));
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: (p.seo_title || p.title).slice(0, 110),
    description: p.meta_description || p.excerpt,
    inLanguage: 'he-IL',
    datePublished: p.published_at,
    dateModified: p.updated_at || p.published_at,
    author: { '@type': 'Organization', name: p.author_name, url: `${SITE_ORIGIN}/` },
    publisher: { '@type': 'Organization', name: BRAND_NAME, '@id': `${SITE_ORIGIN}/#organization`, url: `${SITE_ORIGIN}/` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    articleSection: isGuide(p) ? HUB.guides.title : HUB.articles.title,
    ...(p.featured_image_url ? { image: [p.featured_image_url] } : {}),
    wordCount: plain(p.content_html).split(' ').filter(Boolean).length,
  };
}

export function postFaqJsonLd(p: Pick<EquifyPost, 'faq'>): Json | null {
  const faq = (p.faq ?? []).filter((f) => f && f.q && f.a);
  if (!faq.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  };
}

export function crumbsFor(p: Pick<PostMeta, 'title' | 'slug' | 'desk'>): Array<{ name: string; path: string }> {
  const hub = isGuide(p) ? HUB.guides : HUB.articles;
  return [
    { name: 'עמוד הבית', path: '/' },
    { name: hub.title, path: hub.path },
    { name: p.title, path: postPath(p) },
  ];
}

export const heDate = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jerusalem' });
};
