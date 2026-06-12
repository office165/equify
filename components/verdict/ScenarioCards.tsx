'use client';

import React from 'react';
import type { ValuationLocale } from '../../api_client';
import type { ScenarioEquitySlice } from '../../lib/valuation/equity_bridge';
import { MetricNumber } from '../../lib/typography/numeric';
import { DUR, EASE } from '../../lib/motion';
import { motion } from 'framer-motion';

export type ScenarioKey = 'bear' | 'base' | 'bull';

const META: Record<
  ScenarioKey,
  { nameHe: string; nameEn: string; moodHe: string; moodEn: string; driverHe: string; driverEn: string }
> = {
  bear: {
    nameHe: 'דובי',
    nameEn: 'Bear',
    moodHe: 'שמרני',
    moodEn: 'Conservative',
    driverHe: 'צמיחה שמרנית',
    driverEn: 'Conservative growth assumptions',
  },
  base: {
    nameHe: 'בסיס',
    nameEn: 'Base',
    moodHe: 'מאוזן',
    moodEn: 'Balanced',
    driverHe: 'תחזית מאוזנת',
    driverEn: 'Balanced forecast',
  },
  bull: {
    nameHe: 'שורי',
    nameEn: 'Bull',
    moodHe: 'אופטימי',
    moodEn: 'Optimistic',
    driverHe: 'צמיחה מואצת',
    driverEn: 'Accelerated growth',
  },
};

function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

function deltaGlyph(equity: number, baseEquity: number): { symbol: string; className: string } | null {
  const diff = equity - baseEquity;
  const pct = baseEquity !== 0 ? (diff / baseEquity) * 100 : 0;
  if (Math.abs(pct) < 0.5) return null;
  if (diff > 0) {
    return { symbol: `▲ ${Math.abs(pct).toFixed(0)}%`, className: 'text-[#6ee7b7]/70' };
  }
  return { symbol: `▼ ${Math.abs(pct).toFixed(0)}%`, className: 'text-white/40' };
}

export interface ScenarioCardsProps {
  scenarios: Record<ScenarioKey, ScenarioEquitySlice>;
  selected: ScenarioKey;
  onSelect: (key: ScenarioKey) => void;
  currency?: string;
  locale?: ValuationLocale;
  className?: string;
}

export function ScenarioCards({
  scenarios,
  selected,
  onSelect,
  currency = 'ILS',
  locale = 'he',
  className,
}: ScenarioCardsProps) {
  const isHe = locale === 'he';
  const baseEquity = scenarios.base.final_equity_value;

  return (
    <section
      className={cn('pdf-block-contain-spaced my-8', className)}
      aria-label={isHe ? 'תרחישי הערכה' : 'Valuation scenarios'}
    >
      <p className="mb-5 text-center text-sm leading-relaxed text-white/65">
        {isHe
          ? 'שלושה תרחישים — אותו מנוע. ההבדל: הנחות הצמיחה והסיכון.'
          : 'Three scenarios — same engine. Difference: growth and risk assumptions.'}
      </p>

      <div className="pdf-scenario-grid grid gap-4 md:grid-cols-3">
        {(Object.keys(META) as ScenarioKey[]).map((key) => {
          const meta = META[key];
          const slice = scenarios[key];
          const isBase = key === 'base';
          const isSelected = selected === key;
          const delta = !isBase ? deltaGlyph(slice.final_equity_value, baseEquity) : null;

          return (
            <motion.button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              aria-pressed={isSelected}
              className={cn(
                'bento-grid-item pdf-card-break relative w-full rounded-2xl border p-5 text-start backdrop-blur-sm transition',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34d399]/50',
                isBase
                  ? 'border-emerald-500/40 bg-emerald-950/25 shadow-[0_0_40px_rgba(52,211,153,0.1)] md:scale-[1.03]'
                  : 'border-white/10 bg-white/[0.04]',
                isSelected && !isBase && 'ring-1 ring-white/20',
              )}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: DUR.fast, ease: EASE }}
            >
              {isBase ? (
                <span className="mb-3 inline-block rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#6ee7b7]">
                  {isHe ? 'ההערכה המומלצת' : 'Recommended'}
                </span>
              ) : null}

              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <p className="text-base font-semibold text-white">
                    {isHe ? meta.nameHe : meta.nameEn}
                  </p>
                  <p className="text-xs text-white/50">
                    {isHe ? meta.moodHe : meta.moodEn}
                  </p>
                </div>
                {delta ? (
                  <span className={cn('font-mono text-[10px] tabular-nums', delta.className)}>
                    {delta.symbol}
                  </span>
                ) : null}
              </div>

              <div className="mt-4">
                <MetricNumber
                  value={slice.final_equity_value}
                  currency={currency}
                  locale={locale}
                  scale="metric"
                  animate={isSelected}
                  className="text-white/95"
                />
              </div>

              <p className="mt-2 text-xs text-white/55">
                {isHe ? meta.driverHe : meta.driverEn}
              </p>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
