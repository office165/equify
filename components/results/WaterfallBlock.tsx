'use client';

import type { WaterfallMetrics } from '../../lib/results/report-view-model';
import { formatCurrencyShort } from '../../lib/utils/formatCurrency';

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
  const { ev, netDebt, equity, debtPct, equityPct } = metrics;

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
          className="rr-waterfall__seg rr-waterfall__seg--debt"
          style={{ width: `${Math.min(debtPct, 100)}%` }}
        >
          <span>{isHe ? 'חוב נטו' : 'Net debt'}</span>
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
        <div className="rr-waterfall__row rr-waterfall__row--minus">
          <span>{isHe ? 'חוב פיננסי נטו' : 'Net financial debt'}</span>
          <strong>− {formatCurrencyShort(netDebt, currency)}</strong>
        </div>
        <div className="rr-waterfall__row rr-waterfall__row--total">
          <span>{isHe ? 'שווי לבעלים' : 'Equity to owners'}</span>
          <strong>{formatCurrencyShort(equity, currency)}</strong>
        </div>
      </div>
    </div>
  );
}
