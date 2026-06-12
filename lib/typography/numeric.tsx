'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { animate } from 'framer-motion';
import type { ValuationLocale } from '../../api_client';
import { formatValuationCurrency } from '../../valuation_i18n';
import { DUR, EASE } from '../motion';
import { useReducedMotion } from '../../components/landing/motion/useReducedMotion';

export type NumericScale = 'display' | 'metric-lg' | 'metric' | 'metric-sm';

const SCALE_CLASS: Record<NumericScale, string> = {
  display: 'num-display',
  'metric-lg': 'num-metric-lg',
  metric: 'num-metric',
  'metric-sm': 'num-metric-sm',
};

function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

function currencyParts(value: number, currency: string, locale: ValuationLocale) {
  if (!Number.isFinite(value)) {
    return { symbol: '', amount: '—', negative: false };
  }
  const intlLocale = locale === 'he' ? 'he-IL' : 'en-US';
  try {
    const parts = new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).formatToParts(value);
    const symbol = parts.find((p) => p.type === 'currency')?.value ?? '';
    const amount = parts
      .filter((p) => p.type !== 'currency')
      .map((p) => p.value)
      .join('')
      .trim();
    return { symbol, amount, negative: value < 0 };
  } catch {
    const fallback = formatValuationCurrency(value, currency, locale, false);
    return { symbol: '', amount: fallback, negative: value < 0 };
  }
}

export interface MetricNumberProps {
  value: number;
  currency?: string;
  locale?: ValuationLocale;
  scale?: NumericScale;
  /** King-number mint glow — display scale only */
  glow?: boolean;
  className?: string;
  animate?: boolean;
  instant?: boolean;
  /** For PDF capture final value */
  pdfDataAttr?: boolean;
}

export function MetricNumber({
  value,
  currency = 'ILS',
  locale = 'he',
  scale = 'metric',
  glow = false,
  className,
  animate: shouldAnimate = false,
  instant = false,
  pdfDataAttr = false,
}: MetricNumberProps) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!shouldAnimate || reduced || instant) {
      setDisplay(value);
      return;
    }
    setDisplay(0);
    const controls = animate(0, value, {
      duration: DUR.fast,
      ease: EASE,
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, shouldAnimate, reduced, instant]);

  const parts = useMemo(
    () => currencyParts(display, currency, locale),
    [display, currency, locale],
  );

  const formatted = formatValuationCurrency(display, currency, locale, false);

  const glowText =
    'bg-gradient-to-l from-[#34d399] to-[#2dd4bf] bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(52,211,153,0.25)]';

  return (
    <span
      className={cn(
        'num-figure inline-flex max-w-full flex-wrap items-baseline justify-center gap-x-0.5 font-mono tabular-nums',
        SCALE_CLASS[scale],
        !glow && 'text-white',
        className,
      )}
      data-pdf-final={pdfDataAttr ? formatted : undefined}
      aria-live={shouldAnimate ? 'polite' : undefined}
    >
      {parts.symbol ? (
        <span
          className={cn('num-currency-symbol shrink-0', glow && glowText)}
          aria-hidden
        >
          {parts.symbol}
        </span>
      ) : null}
      <span dir="ltr" className={cn('inline-block min-w-0', glow && glowText)}>
        {parts.amount}
      </span>
    </span>
  );
}

/** Percent / multiple — mono, tabular */
export function MetricPlain({
  children,
  scale = 'metric-sm',
  className,
}: {
  children: React.ReactNode;
  scale?: NumericScale;
  className?: string;
}) {
  return (
    <span className={cn('num-figure font-mono tabular-nums', SCALE_CLASS[scale], className)}>
      {children}
    </span>
  );
}
