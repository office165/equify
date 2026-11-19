/** Round 12 (CONTENT_HUB): the RSS feed and llms.txt, built from the posts (served by app/feed and app/api/llms). */
import fs from 'fs';
import path from 'path';
import { allPosts, postLang, postPath } from './posts';
import { readSiteFlags } from '../flags/site_flags';
import { siteLanguage } from '../i18n/site';
import { HUB } from './hub';
import { SITE_ORIGIN, absoluteUrl } from '../seo/site';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;

export async function buildFeed(): Promise<string> {
  // The Hebrew feed: Hebrew posts only (a post in another language has its own address under /<code>).
  const posts = (await allPosts()).filter((p) => postLang(p) === 'he').slice(0, 20);
  const items = posts
    .map((p) => {
      const link = absoluteUrl(postPath(p));
      return `<item><title>${esc(p.title)}</title><link>${link}</link><guid isPermaLink="true">${link}</guid><pubDate>${new Date(p.published_at).toUTCString()}</pubDate><dc:creator>${cdata(p.author_name)}</dc:creator><category>${esc(p.desk === 'guide' ? HUB.guides.title : HUB.articles.title)}</category><description>${cdata(p.excerpt)}</description></item>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
<title>equify BY SBC, מדריכים וכתבות</title>
<atom:link href="${SITE_ORIGIN}/feed" rel="self" type="application/rss+xml"/>
<link>${SITE_ORIGIN}/</link>
<description>מדריכים וכתבות על הערכת שווי של עסקים פרטיים בישראל</description>
<language>he-IL</language>
<lastBuildDate>${new Date(posts[0]?.published_at ?? Date.now()).toUTCString()}</lastBuildDate>
${items}
</channel>
</rss>`;
}

export async function buildLlms(opts: { hub?: boolean; enSite?: boolean } = {}): Promise<string> {
  const flags = readSiteFlags();
  const hub = opts.hub ?? flags.contentHub;
  const enSite = opts.enSite ?? flags.enSite;
  const base = fs.readFileSync(path.join(process.cwd(), 'public', 'llms.txt'), 'utf8').replace(/\s+$/, '');
  // Round 13: the English site and its price.
  const en = siteLanguage('en');
  const english = enSite
    ? ['', '## English', '', `- [equify BY SBC in English](${absoluteUrl('/en')}): ${en.dict(true).meta.description}`, `- Price in English: ${en.def.price.display} (USD), paid by PayPal. The Hebrew site: ₪999.`]
    : [];
  if (!hub) return [base, ...english, ''].join('\n');
  const posts = (await allPosts()).filter((p) => postLang(p) === 'he');
  const line = (p: { title: string; slug: string; desk: string; excerpt: string }) => `- [${p.title}](${absoluteUrl(postPath(p))}): ${p.excerpt}`;
  const guides = posts.filter((p) => p.desk === 'guide');
  const articles = posts.filter((p) => p.desk !== 'guide');
  return [
    base,
    '',
    '## מדריכים',
    '',
    ...guides.map(line),
    ...(articles.length ? ['', '## כתבות', '', ...articles.slice(0, 50).map(line)] : []),
    ...english,
    '',
    `RSS: ${absoluteUrl('/feed')}`,
    '',
  ].join('\n');
}

