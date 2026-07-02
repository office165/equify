'use client';

import { formatNetDebtLine } from '../../lib/format/currency';
import type { WaterfallMetrics } from '../../lib/results/report-view-model';
import { formatCurrencyShort, normalizeCurrencyCode } from '../../lib/utils/formatCurrency';

interface WaterfallBlockProps {
  metrics: WaterfallMetrics;
  currency?: string;
  locale?: 'he' | 'en';
  className?: string;
}

export function WaterfallBlock({
  metrics,
  currency = 'ILS',
  locale = 'he',
  className,
}: WaterfallBlockProps) {
  const isHe = locale === 'he';
  const { ev, netDebt, equity, equityPct } = metrics;
  const netDebtK = netDebt / 1000;
  const netDebtLine = formatNetDebtLine(netDebtK, locale, normalizeCurrencyCode(currency));
  const netDebtBarPct = Math.min(
    100,
    (Math.abs(netDebt) / Math.max(ev, 1)) * 100,
  );
  const netDebtToneColor =
    netDebtLine.tone === 'positive'
      ? 'var(--turq)'
      : netDebtLine.tone === 'negative'
        ? 'var(--red)'
        : undefined;

  return (
    <div className={`rr-waterfall ${className ?? ''}`}>
      <h3 className="rr-section-title">
        {isHe ? 'מ-EV לשווי לבעלים' : 'From EV to equity value'}
      </h3>

      <div className="rr-waterfall__track" aria-hidden>
        <div className="rr-waterfall__seg rr-waterfall__seg--ev" style={{ width: '100%' }}>
          <span>{isHe ? 'שווי פעילות (EV)' : 'Enterprise value'}</span>
        </div>
        <div
          className={`rr-waterfall__seg ${
            netDebtLine.tone === 'positive'
              ? 'rr-waterfall__seg--ev'
              : 'rr-waterfall__seg--debt'
          }`}
          style={{ width: `${Math.min(netDebtBarPct, 100)}%` }}
        >
          <span>{isHe ? netDebtLine.labelHe : netDebtLine.labelEn}</span>
        </div>
        <div
          className="rr-waterfall__seg rr-waterfall__seg--equity"
          style={{ width: `${Math.min(equityPct, 100)}%` }}
        >
          <span>{isHe ? 'שווי לבעלים' : 'Equity'}</span>
        </div>
      </div>

      <div className="rr-waterfall__rows">
        <div className="rr-waterfall__row">
          <span>{isHe ? 'שווי פעילות (EV)' : 'Enterprise value (EV)'}</span>
          <strong>{formatCurrencyShort(ev, currency)}</strong>
        </div>
        <div
          className={`rr-waterfall__row ${
            netDebtLine.tone === 'negative' ? 'rr-waterfall__row--minus' : ''
          }`}
        >
          <span>{isHe ? netDebtLine.labelHe : netDebtLine.labelEn}</span>
          <strong style={{ color: netDebtToneColor }}>{netDebtLine.displayValue}</strong>
        </div>
        <div className="rr-waterfall__row rr-waterfall__row--total">
          <span>{isHe ? 'שווי לבעלים' : 'Equity to owners'}</span>
          <strong>{formatCurrencyShort(equity, currency)}</strong>
        </div>
      </div>
    </div>
  );
}
