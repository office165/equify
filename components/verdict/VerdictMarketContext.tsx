'use client';

import React from 'react';
import type { ValuationLocale } from '../../api_client';
import {
  statusArrow,
  VERDICT_SANITY_NOTE_HE,
  verdictRangeMarkerPct,
  type VerdictMetrics,
  type VerdictMultiplePill,
} from '../../lib/valuation/verdict_metrics';
import { valuationCopy } from '../../lib/brand/valuation_copy';
import { MetricPlain } from '../../lib/typography/numeric';

function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

function MultiplePill({
  pill,
  primary = false,
  locale,
  isPrint,
}: {
  pill: VerdictMultiplePill;
  primary?: boolean;
  locale: ValuationLocale;
  isPrint?: boolean;
}) {
  const isHe = locale === 'he';
  const fmt = (n: number) => (Number.isFinite(n) && n > 0 ? `${n.toFixed(1)}x` : '—');
  const noteText = pill.sanityNoteHe ?? VERDICT_SANITY_NOTE_HE;

  return (
    <div
      className={cn(
        'pdf-card-break rounded-full border px-3 py-1.5 text-center',
        primary
          ? isPrint
            ? 'border-[#34d399] bg-[#ecfdf5] text-[#0d1b2a]'
            : 'border-[#34d399]/35 bg-white/[0.04] text-emerald-50/90'
          : isPrint
            ? 'border-[#cbd5e1] bg-[#f8fafc] text-[#334155]'
            : 'border-white/10 bg-white/[0.03] text-emerald-50/75',
      )}
    >
      {pill.useSanityNote ? (
        <p className="text-xs font-medium">{noteText}</p>
      ) : (
        <>
          <p className="text-xs font-medium">
            {isHe ? pill.labelHe : pill.id.toUpperCase()}{' '}
            <MetricPlain scale="metric-sm">{fmt(pill.implied)}</MetricPlain>
          </p>
          <p
            className={cn(
              'mt-0.5 text-[10px]',
              isPrint ? 'text-[#64748b]' : 'text-white/45',
            )}
          >
            {isHe ? 'חציון ענף' : 'Sector median'}:{' '}
            <MetricPlain scale="metric-sm" className="inline">
              {fmt(pill.median)}
            </MetricPlain>{' '}
            <span aria-hidden>{statusArrow(pill.status)}</span>
          </p>
        </>
      )}
    </div>
  );
}

function RangeBar({
  metrics,
  locale,
  isPrint,
}: {
  metrics: VerdictMetrics;
  locale: ValuationLocale;
  isPrint?: boolean;
}) {
  const isHe = locale === 'he';
  const markerPct = verdictRangeMarkerPct(metrics);

  return (
    <div className="pdf-card-break mt-4 space-y-2">
      <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'linear-gradient(90deg, rgba(148,163,184,0.35) 0%, rgba(52,211,153,0.65) 50%, rgba(148,163,184,0.35) 100%)',
          }}
        />
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border border-white/80 bg-[#34d399]/90"
          style={{ insetInlineStart: `calc(${markerPct}% - 7px)` }}
          aria-hidden
        />
      </div>
      <div
        className={cn(
          'flex justify-between text-[10px] font-medium uppercase tracking-wider',
          isPrint ? 'text-[#94a3b8]' : 'text-white/40',
        )}
      >
        <span>{isHe ? 'שמרני' : 'Bear'}</span>
        <span className="text-[#6ee7b7]/80">{isHe ? 'בסיס' : 'Base'}</span>
        <span>{isHe ? 'אופטימי' : 'Bull'}</span>
      </div>
    </div>
  );
}

export interface VerdictMarketContextProps {
  metrics: VerdictMetrics;
  locale?: ValuationLocale;
  variant?: 'dark' | 'print';
  className?: string;
}

/** Demoted market context — multiples + scenario range (never competes with king number). */
export function VerdictMarketContext({
  metrics,
  locale = 'he',
  variant = 'dark',
  className,
}: VerdictMarketContextProps) {
  const isHe = locale === 'he';
  const isPrint = variant === 'print';

  return (
    <section
      className={cn(
        'pdf-block-contain-spaced rounded-2xl border p-5',
        isPrint
          ? 'border-[#e2e8f0] bg-[#fafafa]'
          : 'border-white/[0.06] bg-white/[0.02]',
        className,
      )}
      aria-label={valuationCopy(locale, 'weightedIndication')}
    >
      <p
        className={cn(
          'mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.18em]',
          isPrint ? 'text-[#64748b]' : 'text-white/40',
        )}
      >
        {valuationCopy(locale, 'weightedIndication')}
      </p>

      <div className="flex flex-col items-center gap-2">
        {metrics.primaryPill ? (
          <MultiplePill pill={metrics.primaryPill} primary locale={locale} isPrint={isPrint} />
        ) : null}
        <div className="flex flex-wrap justify-center gap-2">
          {metrics.revenuePill && !metrics.revenuePill.useSanityNote ? (
            <MultiplePill pill={metrics.revenuePill} locale={locale} isPrint={isPrint} />
          ) : null}
          {metrics.pePill && !metrics.pePill.useSanityNote ? (
            <MultiplePill pill={metrics.pePill} locale={locale} isPrint={isPrint} />
          ) : null}
        </div>
      </div>

      <RangeBar metrics={metrics} locale={locale} isPrint={isPrint} />
    </section>
  );
}
