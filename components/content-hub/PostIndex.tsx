import Link from 'next/link';
import { deskLabel, postPath, type PostMeta } from '../../lib/content/posts';
import { breadcrumbJsonLd, heDate } from '../../lib/content/hub';
import { jsonLdScriptContent } from '../../lib/seo/structured_data';
import { HubShell } from './HubShell';

/**
 * Round 12: the index of the guides or of the articles, in the manner of sbc-site/components/BlogIndex.tsx: breadcrumbs, the title,
 * a lede, then the posts newest first as cards (title, date, desk, excerpt), and the way to the wizard.
 */
export function PostIndex({ title, lede, path, posts, empty }: { title: string; lede: string; path: string; posts: PostMeta[]; empty: string }) {
  const crumbs = [
    { name: 'עמוד הבית', path: '/' },
    { name: title, path },
  ];
  return (
    <HubShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScriptContent(breadcrumbJsonLd(crumbs)) }} />
      <div className="v2-wrap hub-wrap">
        <nav className="hub-crumbs" aria-label="פירורי לחם">
          <Link href="/">עמוד הבית</Link>
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
                  <span className="hub-desk">{deskLabel(p.desk)}</span>
                  <time dateTime={p.published_at}>{heDate(p.published_at)}</time>
                </div>
                <h2>
                  <Link href={postPath(p)}>{p.title}</Link>
                </h2>
                <p>{p.excerpt}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="hub-empty">{empty}</p>
        )}
        <div className="hub-cta">
          <Link className="v2-btn" href="/wizard">
            להתחלת הערכת שווי <span className="arr">←</span>
          </Link>
        </div>
      </div>
    </HubShell>
  );
}
