import Link from 'next/link';
import { deskLabel, postPath, type EquifyPost, type PostMeta } from '../../lib/content/posts';
import { articleJsonLd, breadcrumbJsonLd, crumbsFor, heDate, postFaqJsonLd } from '../../lib/content/hub';
import { sanitizePostHtml } from '../../lib/content/sanitize';
import { jsonLdScriptContent } from '../../lib/seo/structured_data';
import { HubShell } from './HubShell';
import { langPrefix, siteLanguage } from '../../lib/i18n/site';

/**
 * Round 12: one guide or article, in the manner of sbc-site/app/(he)/[slug]/page.tsx: breadcrumbs, the title, the author and date,
 * the summary, the body, the questions, the way to the wizard, and related posts. JSON-LD: Article, BreadcrumbList, FAQPage when the
 * post has questions.
 */
export function PostView({ post, related, lang = 'he' }: { post: EquifyPost; related: PostMeta[]; lang?: string }) {
  const t = siteLanguage(lang).dict(true).hub;
  const prefix = langPrefix(lang);
  const he = lang === 'he';
  const crumbs = crumbsFor(post, lang);
  const faqLd = postFaqJsonLd(post);
  const lds = [articleJsonLd(post, lang), breadcrumbJsonLd(crumbs), ...(faqLd ? [faqLd] : [])];
  return (
    <HubShell lang={lang}>
      {lds.map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScriptContent(d) }} />
      ))}
      <article className="v2-wrap hub-wrap hub-article">
        <nav className="hub-crumbs" aria-label={t.crumbs}>
          <Link href="/">{crumbs[0].name}</Link>
          <span aria-hidden="true">/</span>
          <Link href={crumbs[1].path}>{crumbs[1].name}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{post.title}</span>
        </nav>
        <h1 className="hub-title">{post.title}</h1>
        <p className="hub-byline">
          <span>{post.author_name}</span>
          <span className="hub-sep" aria-hidden="true" />
          <time dateTime={post.published_at}>{he ? heDate(post.published_at) : post.published_at.slice(0, 10)}</time>
          <span className="hub-sep" aria-hidden="true" />
          <span>{he ? deskLabel(post.desk) : post.desk === 'guide' ? t.guides : t.articles}</span>
        </p>
        {post.summary ? <p className="hub-summary">{post.summary}</p> : null}
        <div className="hub-body" dangerouslySetInnerHTML={{ __html: sanitizePostHtml(post.content_html) }} />
        {post.faq?.length ? (
          <section className="hub-faq" aria-labelledby="hub-faq-h">
            <h2 id="hub-faq-h">{t.faq}</h2>
            {post.faq.map((f) => (
              <details key={f.q} className="v2-q">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </section>
        ) : null}
        <div className="hub-cta">
          <Link className="v2-btn" href={`${prefix}/wizard`}>
            {t.start} <span className="arr">{he ? '←' : '→'}</span>
          </Link>
          <p>{t.disclaimer}</p>
        </div>
      </article>
      {related.length ? (
        <section className="v2-wrap hub-related" aria-labelledby="hub-related-h">
          <h2 id="hub-related-h">{t.related}</h2>
          <ul className="hub-list" data-cols={related.length === 2 ? '2' : '3'}>
            {related.map((p) => (
              <li key={p.slug} className="hub-card">
                <div className="hub-meta">
                  <span className="hub-desk">{he ? deskLabel(p.desk) : p.desk === 'guide' ? t.guides : t.articles}</span>
                  <time dateTime={p.published_at}>{he ? heDate(p.published_at) : p.published_at.slice(0, 10)}</time>
                </div>
                <h3>
                  <Link href={`${prefix}${postPath(p)}`}>{p.title}</Link>
                </h3>
                <p>{p.excerpt}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </HubShell>
  );
}
