'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { ValuationLocale } from '../../api_client';
import { EquifyLogo } from '../brand/EquifyLogo';
import { usePdfExportMode } from '../../lib/pdf/usePdfExportMode';
import { buildVerdictMetrics } from '../../lib/valuation/verdict_metrics';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import { MetricNumber } from '../../lib/typography/numeric';
import { valuationCopy } from '../../lib/brand/valuation_copy';
import { VerdictMarketContext } from './VerdictMarketContext';

function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export interface VerdictHeroProps {
  matrix: ForecastMatrixWithDiagnostics;
  currency?: string;
  locale?: ValuationLocale;
  className?: string;
  enterpriseValue?: number;
  bearEquity?: number;
  baseEquity?: number;
  bullEquity?: number;
  /** King number — defaults to baseEquity / metrics.equityValue */
  equityValue?: number;
  variant?: 'dark' | 'print';
  /** Landing / marketing — show demoted market context below king */
  showMarketContext?: boolean;
}

export function VerdictHero({
  matrix,
  currency = matrix.meta.currency ?? 'ILS',
  locale = 'he',
  className,
  enterpriseValue,
  bearEquity,
  baseEquity,
  bullEquity,
  equityValue: equityValueProp,
  variant = 'dark',
  showMarketContext = false,
}: VerdictHeroProps) {
  const isHe = locale === 'he';
  const pdfMode = usePdfExportMode();
  const isPrint = variant === 'print' || pdfMode;

  const metrics = useMemo(
    () =>
      buildVerdictMetrics(matrix, {
        enterpriseValue,
        bearEquity,
        baseEquity,
        bullEquity,
      }),
    [matrix, enterpriseValue, bearEquity, baseEquity, bullEquity],
  );

  if (!metrics) return null;

  const kingEquity = equityValueProp ?? metrics.equityValue;

  return (
    <motion.section
      initial={false}
      className={cn(
        'pdf-card-break pdf-block-contain-spaced relative overflow-visible rounded-3xl border p-6 sm:p-8',
        isPrint
          ? 'border-[#0d1b2a]/15 bg-white text-[#0d1b2a]'
          : 'border-[#34d399]/25 bg-gradient-to-br from-[#051c14]/90 via-[#0b2c24]/80 to-[#020617]/90 shadow-[0_0_40px_rgba(52,211,153,0.12)]',
        className,
      )}
      aria-label={valuationCopy(locale, 'conclusionAria')}
    >
      {isPrint ? (
        <div className="pdf-card-break mb-4 flex items-start justify-between gap-4 border-b border-[#0d1b2a]/10 pb-4">
          <EquifyLogo variant="light-bg" className="max-w-[200px]" />
        </div>
      ) : (
        <div
          className="pointer-events-none absolute -end-20 -top-20 h-56 w-56 rounded-full bg-[#34d399]/10 blur-3xl"
          aria-hidden
        />
      )}

      <p
        className={cn(
          'text-center text-sm font-light tracking-[0.12em] uppercase',
          isPrint ? 'text-[#64748b]' : 'text-[#6ee7b7]/90',
        )}
      >
        {valuationCopy(locale, 'conclusionEyebrow')}
      </p>

      <div className="mt-3 w-full min-w-0 px-1 text-center sm:px-2">
        <MetricNumber
          value={kingEquity}
          currency={currency}
          locale={locale}
          scale="display"
          glow={!isPrint}
          animate={!isPrint}
          instant={isPrint}
          pdfDataAttr
          className={cn(
            'w-full max-w-full text-2xl font-black tracking-tight sm:text-3xl md:text-5xl',
            '!leading-tight',
            isPrint && '!text-[#0d1b2a] !bg-none !drop-shadow-none',
          )}
        />
      </div>

      <p
        className={cn(
          'mx-auto mt-4 max-w-xl text-center text-sm leading-relaxed',
          isPrint ? 'text-[#475569]' : 'text-white/72',
        )}
      >
        {valuationCopy(locale, 'equityHeadlineSubtitle')}
      </p>

      {showMarketContext ? (
        <VerdictMarketContext
          metrics={metrics}
          locale={locale}
          variant={isPrint ? 'print' : 'dark'}
          className="mt-6 border-0 bg-transparent p-0"
        />
      ) : null}
    </motion.section>
  );
}
