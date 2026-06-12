'use client';

import React, { useMemo } from 'react';
import type { ForecastMatrixWithDiagnostics } from '../valuation_forecast';
import type { MultiplesAnalysisSnapshot } from '../lib/valuation/engine';
import type { ValuationLocale } from '../api_client';
import {
  buildMultiplesPanelData,
  type MultipleComparisonCard,
  type MultipleStatus,
  type MultiplesBlendWeights,
} from '../lib/valuation/multiples_panel_data';
import { formatCurrencyShort } from '../lib/utils/formatCurrency';

function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

const STATUS_STYLES: Record<
  MultipleStatus,
  { badge: string; labelHe: string; labelEn: string }
> = {
  in_range: {
    badge: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    labelHe: 'בטווח',
    labelEn: 'In range',
  },
  above: {
    badge: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
    labelHe: 'גבוה מהממוצע',
    labelEn: 'Above median',
  },
  below: {
    badge: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
    labelHe: 'נמוך מהממוצע',
    labelEn: 'Below median',
  },
};

function MultipleCard({
  card,
  currency,
  isHe,
}: {
  card: MultipleComparisonCard;
  currency: string;
  isHe: boolean;
}) {
  const status = STATUS_STYLES[card.status];

  return (
    <article className="pdf-card-contain metric-card diagnostic-block pdf-card-break pdf-block-contain pdf-block-contain-spaced rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow-inner">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-mono text-sm font-bold text-[#00D4C8]">{card.label}</h3>
        <span
          className={cn(
            'shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold',
            status.badge,
          )}
        >
          {isHe ? status.labelHe : status.labelEn}
        </span>
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">
            {isHe ? 'חציון ענף' : 'Industry median'}
          </dt>
          <dd className="font-mono font-semibold tabular-nums text-slate-200">
            {card.industryMedian.toFixed(1)}x
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">{isHe ? 'לחברתך' : 'Your company'}</dt>
          <dd className="font-mono font-semibold tabular-nums text-white">
            {card.companyMultiple.toFixed(1)}x
          </dd>
        </div>
        <div className="flex justify-between gap-2 border-t border-white/8 pt-2">
          <dt className="text-slate-400">
            {isHe ? 'שווי משתמע' : 'Implied value'}
          </dt>
          <dd className="valubot-mono-figure font-mono font-bold tabular-nums text-[#00bfa5]">
            {formatCurrencyShort(card.impliedEv, currency)}
          </dd>
        </div>
      </dl>
    </article>
  );
}

export interface MultiplesAnalysisPanelProps {
  analysis: MultiplesAnalysisSnapshot;
  matrix: ForecastMatrixWithDiagnostics;
  dcfBaseEv: number;
  equityValue: number;
  blendWeights?: MultiplesBlendWeights;
  currency?: string;
  locale: ValuationLocale;
  className?: string;
}

export function MultiplesAnalysisPanel({
  analysis,
  matrix,
  dcfBaseEv,
  equityValue,
  blendWeights,
  currency = 'ILS',
  locale,
  className,
}: MultiplesAnalysisPanelProps) {
  const isHe = locale === 'he';

  const summary = useMemo(
    () =>
      buildMultiplesPanelData(
        analysis,
        matrix,
        dcfBaseEv,
        equityValue,
        blendWeights,
      ),
    [analysis, matrix, dcfBaseEv, equityValue, blendWeights],
  );

  if (summary.cards.length === 0) return null;

  return (
    <section
      dir="rtl"
      lang={isHe ? 'he' : 'en'}
      aria-label={
        isHe ? 'ניתוח מכפילי שוק' : 'Market multiples analysis'
      }
      className={cn(
        'pdf-block-contain-spaced my-6 w-full max-w-full rounded-2xl border border-[#00bfa5]/25 bg-[#051c14]/70 p-4 shadow-[0_22px_70px_4px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-6',
        className,
      )}
    >
      <div className="pdf-section-group">
        <header className="pdf-block-contain pdf-block-contain-spaced mb-6">
          <h2 className="section-header-title text-lg font-bold text-[#00bfa5]">
            {isHe
              ? 'ניתוח מכפילי שוק — השוואה לחברות דומות'
              : 'Market Multiples — Peer Comparison'}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {isHe
              ? `על בסיס נתוני שוק ישראלי 2024–2026, ענף: ${summary.industryName}`
              : `Based on Israeli market data 2024–2026, sector: ${summary.industryName}`}
          </p>
        </header>

        <div className="pdf-diagnostics-grid grid gap-4 sm:grid-cols-2">
        {summary.cards.map((card) => (
          <MultipleCard
            key={card.id}
            card={card}
            currency={currency}
            isHe={isHe}
          />
        ))}
        </div>
      </div>

      <footer className="pdf-card-contain metric-card pdf-card-break pdf-block-contain pdf-block-contain-spaced mt-6 space-y-2 rounded-xl border border-[#00bfa5]/20 bg-[#00bfa5]/5 px-4 py-4 text-sm">
        <p className="font-medium text-slate-200">
          {isHe ? 'טווח שווי ממוצע מכפילים: ' : 'Multiples-implied range: '}
          <span className="valubot-mono-figure font-mono font-bold text-[#00D4C8]">
            {formatCurrencyShort(summary.multiplesLow, currency)}
            {' – '}
            {formatCurrencyShort(summary.multiplesHigh, currency)}
          </span>
        </p>
        <p className="font-medium text-slate-200">
          {isHe ? 'ממוצע DCF + מכפילים: ' : 'DCF + multiples blend: '}
          <span className="valubot-mono-figure font-mono font-bold text-emerald-300">
            {formatCurrencyShort(summary.blendedValue, currency)}
          </span>
        </p>
      </footer>
    </section>
  );
}

export { buildMultiplesPanelData };
