import Link from 'next/link';
import type { LegalDocument } from '../../lib/legal/types';

export interface LegalDocumentPageProps {
  document: LegalDocument;
}

/** Premium dark-theme legal document layout (Tailwind Typography) */
export function LegalDocumentPage({ document: doc }: LegalDocumentPageProps) {
  return (
    <div className="min-h-[100dvh] bg-[#020504] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050F0D]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="flex items-baseline gap-2 text-lg font-black tracking-tight text-white"
          >
            <span>
              equify<em className="text-[#00C2B8] not-italic">.</em>
            </span>
            <small className="font-mono text-[8px] font-medium tracking-[0.22em] text-[#C49A3C]">
              BY SBC
            </small>
          </Link>
          <Link
            href="/"
            className="shrink-0 text-sm text-slate-400 transition hover:text-[#00C2B8]"
          >
            ← חזרה לדף הבית
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <article
          className="prose prose-invert max-w-none prose-headings:font-bold prose-headings:text-slate-50 prose-h1:text-3xl prose-h2:mt-10 prose-h2:text-xl prose-p:text-slate-300 prose-p:leading-relaxed prose-li:text-slate-300 prose-strong:text-[#9EEEE6] prose-a:text-[#00C2B8] prose-a:no-underline hover:prose-a:underline"
          lang="he"
          dir="rtl"
        >
          <h1>{doc.title}</h1>
          <p className="!mt-2 text-sm text-slate-500">{doc.updated}</p>
          {doc.intro ? <p className="lead text-slate-300">{doc.intro}</p> : null}

          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 48)}>{paragraph}</p>
              ))}
              {section.bullets?.length ? (
                <ul>
                  {section.bullets.map((item) => (
                    <li key={item.slice(0, 48)}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </article>
      </main>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} equify BY SBC
      </footer>
    </div>
  );
}
