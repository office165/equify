import Link from 'next/link';
import { deskLabel, postPath, type PostMeta } from '../../lib/content/posts';
import { breadcrumbJsonLd, heDate } from '../../lib/content/hub';
import { jsonLdScriptContent } from '../../lib/seo/structured_data';
import { HubShell } from './HubShell';
import { langPrefix, siteLanguage } from '../../lib/i18n/site';

/**
 * Round 12: the index of the guides or of the articles, in the manner of sbc-site/components/BlogIndex.tsx: breadcrumbs, the title,
 * a lede, then the posts newest first as cards (title, date, desk, excerpt), and the way to the wizard.
 */
export function PostIndex({ title, lede, path, posts, empty, lang = 'he' }: { title: string; lede: string; path: string; posts: PostMeta[]; empty: string; lang?: string }) {
  const t = siteLanguage(lang).dict(true).hub;
  const prefix = langPrefix(lang);
  const he = lang === 'he';
  const crumbs = [
    { name: t.home, path: prefix || '/' },
    { name: title, path },
  ];
  return (
    <HubShell lang={lang}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScriptContent(breadcrumbJsonLd(crumbs)) }} />
      <div className="v2-wrap hub-wrap">
        <nav className="hub-crumbs" aria-label={t.crumbs}>
          <Link href={prefix || '/'}>{t.home}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{title}</span>
        </nav>
        <h1 className="hub-title">{title}</h1>
        <p className="hub-lede">{lede}</p>
        {posts.length ? (
          <ul className="hub-list" data-cols={posts.length % 3 === 1 ? '2' : '3'}>
            {posts.map((p) => (
              <li key={p.slug} className="hub-card">
                <div className="hub-meta">
                  <span className="hub-desk">{he ? deskLabel(p.desk) : p.desk === 'guide' ? t.guides : t.articles}</span>
                  <time dateTime={p.published_at}>{he ? heDate(p.published_at) : p.published_at.slice(0, 10)}</time>
                </div>
                <h2>
                  <Link href={`${prefix}${postPath(p)}`}>{p.title}</Link>
                </h2>
                <p>{p.excerpt}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="hub-empty">{empty}</p>
        )}
        <div className="hub-cta">
          <Link className="v2-btn" href={`${prefix}/wizard`}>
            {t.start} <span className="arr">{he ? '←' : '→'}</span>
          </Link>
        </div>
      </div>
    </HubShell>
  );
}
