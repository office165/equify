import Link from 'next/link';
import { deskLabel, postPath, type EquifyPost, type PostMeta } from '../../lib/content/posts';
import { articleJsonLd, breadcrumbJsonLd, crumbsFor, heDate, postFaqJsonLd } from '../../lib/content/hub';
import { sanitizePostHtml } from '../../lib/content/sanitize';
import { jsonLdScriptContent } from '../../lib/seo/structured_data';
import { HubShell } from './HubShell';

/**
 * Round 12: one guide or article, in the manner of sbc-site/app/(he)/[slug]/page.tsx: breadcrumbs, the title, the author and date,
 * the summary, the body, the questions, the way to the wizard, and related posts. JSON-LD: Article, BreadcrumbList, FAQPage when the
 * post has questions.
 */
export function PostView({ post, related }: { post: EquifyPost; related: PostMeta[] }) {
  const crumbs = crumbsFor(post);
  const faqLd = postFaqJsonLd(post);
  const lds = [articleJsonLd(post), breadcrumbJsonLd(crumbs), ...(faqLd ? [faqLd] : [])];
  return (
    <HubShell>
      {lds.map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScriptContent(d) }} />
      ))}
      <article className="v2-wrap hub-wrap hub-article">
        <nav className="hub-crumbs" aria-label="פירורי לחם">
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
          <time dateTime={post.published_at}>{heDate(post.published_at)}</time>
          <span className="hub-sep" aria-hidden="true" />
          <span>{deskLabel(post.desk)}</span>
        </p>
        {post.summary ? <p className="hub-summary">{post.summary}</p> : null}
        <div className="hub-body" dangerouslySetInnerHTML={{ __html: sanitizePostHtml(post.content_html) }} />
        {post.faq?.length ? (
          <section className="hub-faq" aria-labelledby="hub-faq-h">
            <h2 id="hub-faq-h">שאלות ותשובות</h2>
            {post.faq.map((f) => (
              <details key={f.q} className="v2-q">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </section>
        ) : null}
        <div className="hub-cta">
          <Link className="v2-btn" href="/wizard">
            להתחלת הערכת שווי <span className="arr">←</span>
          </Link>
          <p>אינדיקציה אלגוריתמית, לא חוות דעת שמאית.</p>
        </div>
      </article>
      {related.length ? (
        <section className="v2-wrap hub-related" aria-labelledby="hub-related-h">
          <h2 id="hub-related-h">עוד באותו נושא</h2>
          <ul className="hub-list" data-cols={related.length === 2 ? '2' : '3'}>
            {related.map((p) => (
              <li key={p.slug} className="hub-card">
                <div className="hub-meta">
                  <span className="hub-desk">{deskLabel(p.desk)}</span>
                  <time dateTime={p.published_at}>{heDate(p.published_at)}</time>
                </div>
                <h3>
                  <Link href={postPath(p)}>{p.title}</Link>
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
