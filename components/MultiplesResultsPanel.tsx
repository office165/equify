'use client';

import React from 'react';
import type { MultiplesAnalysisSnapshot } from '../valuation_forecast';
import type { ValuationLocale } from '../api_client';
import { formatILS } from '../lib/utils/formatCurrency';

function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

function formatRangePair(
  range: [number, number] | undefined,
  locale: ValuationLocale,
): string {
  if (!range) return '—';
  return `${range[0].toFixed(1)}x – ${range[1].toFixed(1)}x`;
}

export interface MultiplesResultsPanelProps {
  analysis: MultiplesAnalysisSnapshot;
  locale: ValuationLocale;
  className?: string;
}

export function MultiplesResultsPanel({
  analysis,
  locale,
  className,
}: MultiplesResultsPanelProps) {
  const isHe = locale === 'he';
  const { valuationRange, selectedMultiple, multiplesUsed } = analysis;

  return (
    <section
      aria-label={isHe ? 'הערכת מכפילים ישראלית' : 'Israeli multiples valuation'}
      className={cn(
        'rounded-2xl border border-[#00bfa5]/25 bg-[#051c14]/70 p-6 shadow-[0_22px_70px_4px_rgba(0,0,0,0.45)] backdrop-blur-xl',
        className,
      )}
    >
      <header className="mb-5">
        <h2 className="text-lg font-bold text-[#00bfa5]">
          {isHe ? 'מסגרת מכפילים — שוק ישראל 2024–2026' : 'Multiples Framework — Israel 2024–2026'}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          {analysis.methodologyNote}
        </p>
      </header>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
          <p className="text-xs uppercase tracking-wider text-slate-500">
            {isHe ? 'נמוך' : 'Low'}
          </p>
          <p className="mt-2 font-mono text-xl font-bold text-rose-300">
            {formatILS(valuationRange.low, { short: true })}
          </p>
        </div>
        <div className="rounded-xl border border-[#00bfa5]/30 bg-[#00bfa5]/5 p-4 text-center">
          <p className="text-xs uppercase tracking-wider text-[#00bfa5]">
            {isHe ? 'בסיס' : 'Base'}
          </p>
          <p className="mt-2 font-mono text-2xl font-bold text-emerald-200">
            {formatILS(valuationRange.base, { short: true })}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
          <p className="text-xs uppercase tracking-wider text-slate-500">
            {isHe ? 'גבוה' : 'High'}
          </p>
          <p className="mt-2 font-mono text-xl font-bold text-mint-400/90">
            {formatILS(valuationRange.high, { short: true })}
          </p>
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {isHe ? 'מכפיל נבחר' : 'Selected multiple'}
          </p>
          <p className="mt-1 font-semibold text-slate-100">
            {selectedMultiple.label}{' '}
            <span className="text-slate-400">({analysis.medianMultiple.toFixed(1)}x חציון)</span>
          </p>
          <p className="mt-1 text-slate-400">{selectedMultiple.rationale}</p>
        </div>

        <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {isHe ? 'טווחי מכפילים לענף' : 'Industry multiple ranges'}
          </p>
          <ul className="mt-2 grid gap-1 text-slate-300 sm:grid-cols-2">
            <li>EV/EBITDA: {formatRangePair(multiplesUsed.evEbitda, locale)}</li>
            <li>EV/EBITA: {formatRangePair(multiplesUsed.evEbita, locale)}</li>
            <li>EV/Sales: {formatRangePair(multiplesUsed.evSales, locale)}</li>
            {multiplesUsed.pe && (
              <li>P/E: {formatRangePair(multiplesUsed.pe, locale)}</li>
            )}
            {multiplesUsed.pbv && (
              <li>P/BV: {formatRangePair(multiplesUsed.pbv, locale)}</li>
            )}
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            {isHe ? 'קבוצת השוואה:' : 'Comparison group:'} {analysis.comparisonGroup}
          </p>
        </div>

        <p className="text-xs text-slate-500" role="note">
          {analysis.sanityCheck}
        </p>
      </div>
    </section>
  );
}
