'use client';

import React from 'react';
import type { ValuationLocale } from '../../api_client';
import type { EquityBridgeMetrics } from '../../lib/valuation/equity_bridge';
import { formatDlomPercent } from '../../lib/valuation/equity_bridge';
import { MetricNumber } from '../../lib/typography/numeric';
import { valuationCopy } from '../../lib/brand/valuation_copy';
import { formatBlendBreakdownText } from '../../lib/pdf/print/blend_breakdown';
import { FieldHelpTooltip } from '../ui/FieldHelpTooltip';

function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

interface RowCopy {
  title: string;
  body: string;
  operator?: '−' | '+' | '=';
  value: number;
  emphasis?: boolean;
  dlomPercent?: string;
}

export interface EquityWaterfallWeighting {
  dcfPct: number;
  multPct: number;
  dcfComponent: number;
  multComponent: number;
  labelHe: string;
}

function buildRows(
  bridge: EquityBridgeMetrics,
  isHe: boolean,
  weighting?: EquityWaterfallWeighting,
): RowCopy[] {
  const rows: RowCopy[] = [
    {
      title: isHe ? 'שווי הפעילות (משוקלל)' : 'Blended enterprise value',
      body: isHe
        ? 'שווי הפעילות המשוקלל — שקלול בין תזרים מהוון (DCF) למכפילי שוק ישראליים.'
        : 'Weighted operating value — blend of DCF and Israeli sector multiples.',
      value: bridge.enterpriseValue,
    },
  ];

  if (weighting) {
    const blendLine = formatBlendBreakdownText({
      evDcf: weighting.dcfComponent / Math.max(weighting.dcfPct / 100, 0.0001),
      evMultiples:
        weighting.multPct > 0
          ? weighting.multComponent / (weighting.multPct / 100)
          : 0,
      dcfWeight: weighting.dcfPct / 100,
      multWeight: weighting.multPct / 100,
      dampenedLabelHe: weighting.labelHe,
    });
    if (blendLine) {
      rows[0] = {
        ...rows[0],
        body: isHe ? `${rows[0].body} ${blendLine}` : `${rows[0].body} ${blendLine}`,
      };
    }
  }

  rows.push({
      title: isHe ? 'חוב פיננסי נטו' : 'Net financial debt',
      body: isHe
        ? 'הלוואות והתחייבויות לבנקים, בניכוי המזומנים והפיקדונות בקופה.'
        : 'Bank debt and obligations, net of cash and deposits.',
      operator: '−',
      value: bridge.netDebt,
    });

  if (bridge.dlomDeduction > 0 && bridge.dlomRate > 0) {
    rows.push({
      title: isHe ? 'דיסקאונט אי־סחירות (DLOM)' : 'Marketability discount (DLOM)',
      body: isHe
        ? 'הפחתה מקובלת בחברות פרטיות, כי מניה פרטית קשה יותר למכירה ממניה בבורסה.'
        : 'Standard private-company illiquidity adjustment vs. public shares.',
      operator: '−',
      value: bridge.dlomDeduction,
      dlomPercent: formatDlomPercent(bridge.dlomRate),
    });
  }

  if (bridge.controlPremiumApplied && bridge.controlPremiumAmount > 0) {
    rows.push({
      title: isHe ? 'פרמיית שליטה' : 'Control premium',
      body: isHe
        ? 'תוספת מקובלת בהערכות למכירה או גיוס הכוללים מעבר שליטה.'
        : 'Premium for change-of-control transactions.',
      operator: '+',
      value: bridge.controlPremiumAmount,
    });
  }

  rows.push({
    title: isHe ? 'שווי לבעלים' : 'Equity to owners',
    body: isHe
      ? 'מה שנשאר לבעלי המניות לאחר חוב ותיקוני נזילות.'
      : 'Net proceeds to shareholders after debt and liquidity adjustments.',
    operator: '=',
    value: bridge.finalEquityValue,
    emphasis: true,
  });

  return rows;
}

function WaterfallRow({
  row,
  currency,
  locale,
  isHe,
  isPrint,
  animateValue,
}: {
  row: RowCopy;
  currency: string;
  locale: ValuationLocale;
  isHe: boolean;
  isPrint?: boolean;
  animateValue?: boolean;
}) {
  const helpAria = isHe ? 'מידע נוסף' : 'More information';

  return (
    <div className="w-full min-w-0">
      <div
        className={cn(
          'pdf-card-break relative w-full min-w-0 rounded-2xl border px-5 py-4 backdrop-blur-sm',
          row.emphasis
            ? isPrint
              ? 'border-[#34d399]/40 bg-[#ecfdf5]'
              : 'border-emerald-500/30 bg-emerald-950/30 shadow-[0_0_32px_rgba(52,211,153,0.08)]'
            : isPrint
              ? 'border-[#e2e8f0] bg-[#fafafa]'
              : 'border-white/10 bg-white/[0.04]',
        )}
      >
        <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 basis-full sm:basis-auto">
            <div className="flex min-w-0 items-center">
              {!isPrint ? (
                <FieldHelpTooltip
                  content={row.body}
                  helpAria={helpAria}
                  label={row.title}
                  isRtl={isHe}
                >
                  <p
                    className={cn(
                      'min-w-0 text-sm font-semibold',
                      isPrint ? 'text-[#0d1b2a]' : 'text-emerald-50',
                    )}
                  >
                    {row.title}
                    {row.dlomPercent ? (
                      <span
                        className={cn(
                          'ms-2 font-mono text-xs font-medium',
                          isPrint ? 'text-[#64748b]' : 'text-[#6ee7b7]/80',
                        )}
                      >
                        {row.dlomPercent}
                      </span>
                    ) : null}
                  </p>
                </FieldHelpTooltip>
              ) : (
                <p
                  className={cn(
                    'text-sm font-semibold',
                    isPrint ? 'text-[#0d1b2a]' : 'text-emerald-50',
                  )}
                >
                  {row.title}
                  {row.dlomPercent ? (
                    <span
                      className={cn(
                        'ms-2 font-mono text-xs font-medium',
                        isPrint ? 'text-[#64748b]' : 'text-[#6ee7b7]/80',
                      )}
                    >
                      {row.dlomPercent}
                    </span>
                  ) : null}
                </p>
              )}
            </div>
            {isPrint ? (
              <p
                className={cn(
                  'mt-1 text-xs leading-relaxed',
                  isPrint ? 'text-[#64748b]' : 'text-white/55',
                )}
              >
                {row.body}
              </p>
            ) : null}
          </div>
          <MetricNumber
            value={Math.abs(row.value)}
            currency={currency}
            locale={locale}
            scale={row.emphasis ? 'metric-lg' : 'metric'}
            animate={animateValue}
            instant={!animateValue}
            className={cn(
              'shrink-0 self-start sm:self-auto',
              row.emphasis && !isPrint && 'text-[#6ee7b7]',
              isPrint && '!text-[#0d1b2a]',
              !row.emphasis && !isPrint && 'text-white/90',
            )}
          />
        </div>
      </div>
      {row.operator ? (
        <div className="relative flex h-8 items-center justify-center" aria-hidden>
          <div
            className={cn(
              'absolute inset-y-1/2 w-px -translate-y-1/2',
              isPrint ? 'bg-[#e2e8f0]' : 'bg-white/10',
            )}
            style={{ insetInlineStart: '50%' }}
          />
          <span
            className={cn(
              'relative z-[1] flex h-7 w-7 items-center justify-center rounded-full border text-sm font-semibold',
              isPrint
                ? 'border-[#34d399]/40 bg-white text-[#059669]'
                : 'border-[#34d399]/35 bg-[#051c14] text-[#6ee7b7]',
            )}
          >
            {row.operator}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export interface EquityWaterfallProps {
  bridge: EquityBridgeMetrics;
  currency?: string;
  locale?: ValuationLocale;
  className?: string;
  variant?: 'dark' | 'print';
  animateValues?: boolean;
  weighting?: EquityWaterfallWeighting;
}

export function EquityWaterfall({
  bridge,
  currency = 'ILS',
  locale = 'he',
  className,
  variant = 'dark',
  animateValues = true,
  weighting,
}: EquityWaterfallProps) {
  const isHe = locale === 'he';
  const isPrint = variant === 'print';
  const rows = buildRows(bridge, isHe, weighting);
  const dlomFootnote = isHe
    ? `* שווי המניות לבעלים מחושב לאחר הפחתת דיסקאונט אי־סחירות (DLOM) של ${formatDlomPercent(bridge.dlomRate)} המקובל בהערכות שווי של חברות פרטיות בישראל, המשקף את פערי הנזילות מול חברה ציבורית.`
    : `* Owner equity reflects a ${formatDlomPercent(bridge.dlomRate)} marketability discount (DLOM) standard for private Israeli companies.`;

  return (
    <section
      className={cn('pdf-block-contain-spaced my-8', className)}
      aria-label={valuationCopy(locale, 'waterfallSection')}
    >
      <h2
        className={cn(
          'mb-5 text-center text-sm font-semibold tracking-wide',
          isPrint ? 'text-[#334155]' : 'text-emerald-100/80',
        )}
      >
        {valuationCopy(locale, 'howWeArrived')}
      </h2>

      <div className="mx-auto flex w-full max-w-xl min-w-0 flex-col gap-3">
        {rows.map((row) => (
          <WaterfallRow
            key={row.title}
            row={row}
            currency={currency}
            locale={locale}
            isHe={isHe}
            isPrint={isPrint}
            animateValue={animateValues}
          />
        ))}
      </div>

      {bridge.dlomRate > 0 ? (
        <p
          className={cn(
            'pdf-card-break mx-auto mt-6 max-w-xl text-center text-xs italic leading-relaxed',
            isPrint ? 'text-[#64748b]' : 'text-white/45',
          )}
        >
          {dlomFootnote}
        </p>
      ) : null}
    </section>
  );
}
