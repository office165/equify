'use client';

import React from 'react';
import type { ValuationLocale } from '../../api_client';
import {
  HEALTH_COLORS,
  healthStatusLabel,
  type FundamentalAnalysisResult,
} from '../analysis/fundamental_insights';

function emphasizeNumbers(text: string): React.ReactNode {
  const parts = text.split(/(\d+[\d,.]*%?)/g);
  return parts.map((part, index) =>
    /^\d/.test(part) ? (
      <strong key={`${part}-${index}`} className="font-semibold text-white">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

export function FundamentalAnalysisSection({
  analysis,
  locale,
  healthScoreTitle,
}: {
  analysis: FundamentalAnalysisResult;
  locale: ValuationLocale;
  healthScoreTitle: string;
}) {
  const isRtl = locale === 'he';

  return (
    <section
      aria-label={analysis.title}
      className="pdf-block-contain-spaced my-6 mb-8 rounded-2xl border-2 border-[#00bfa5]/35 bg-gradient-to-br from-[#0b2c24] via-slate-900/95 to-slate-950 shadow-2xl"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="pdf-block-contain pdf-block-contain-spaced border-b border-[#00bfa5]/25 bg-[#0b2c24]/80 px-6 py-4">
        <h2 className="section-header-title text-lg font-bold tracking-tight text-[#00bfa5] sm:text-xl">
          {analysis.title}
        </h2>
      </div>

      <ul className="pdf-block-contain pdf-block-contain-spaced space-y-3 px-6 py-6">
        {analysis.paragraphs.map((para) => (
          <li
            key={para.slice(0, 40)}
            className="flex gap-3 text-sm leading-relaxed text-slate-200 sm:text-[15px]"
            style={{ textAlign: isRtl ? 'right' : 'left' }}
          >
            <span className="mt-1.5 shrink-0 text-[#00bfa5]" aria-hidden>
              •
            </span>
            <span className="line-clamp-2">{emphasizeNumbers(para)}</span>
          </li>
        ))}
      </ul>

      <div className="pdf-block-contain pdf-block-contain-spaced border-t border-[#00bfa5]/20 bg-slate-900/50 px-6 py-5">
        <h3 className="section-header-title mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          {healthScoreTitle}
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {analysis.healthScores.map((item) => (
            <div
              key={item.id}
              className="pdf-card-contain metric-card diagnostic-block rounded-xl border border-slate-700/60 bg-slate-800/40 p-4"
            >
              <div className="mb-3 flex w-full items-center justify-between gap-4">
                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-100">
                  <span
                    className="inline-block h-4 w-4 shrink-0 rounded-full shadow-lg"
                    style={{
                      backgroundColor: HEALTH_COLORS[item.status],
                      boxShadow: `0 0 12px ${HEALTH_COLORS[item.status]}88`,
                    }}
                    aria-hidden
                  />
                  <span>{item.label}:</span>
                </span>
                <span
                  className="shrink-0 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: HEALTH_COLORS[item.status] }}
                >
                  {healthStatusLabel(item.status, locale)}
                </span>
              </div>
              <p
                className="text-xs leading-relaxed text-slate-400"
                style={{ textAlign: isRtl ? 'right' : 'left' }}
              >
                {item.summary}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
