'use client';

import React from 'react';
import type { ValuationLocale } from '../../api_client';
import { formatCurrencyShort } from '../../lib/utils/formatCurrency';
function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export interface CentralFindingHeroProps {
  baseEnterpriseValue: number;
  arbitrageGap: number;
  referenceValue: number;
  currency: string;
  locale: ValuationLocale;
  className?: string;
}

export function CentralFindingHero({
  baseEnterpriseValue,
  arbitrageGap,
  referenceValue,
  currency,
  locale,
  className,
}: CentralFindingHeroProps) {
  const isHe = locale === 'he';
  const hasUpside = arbitrageGap > 0 && referenceValue > 0;
  const gapPct = hasUpside
    ? Math.round((arbitrageGap / referenceValue) * 100)
    : 0;
  const baseFmt = formatCurrencyShort(baseEnterpriseValue, currency);

  return (
    <section
      dir="rtl"
      lang={isHe ? 'he' : 'en'}
      aria-label={isHe ? 'הממצא המרכזי' : 'Central finding'}
      className={cn(
        'pdf-block-contain pdf-block-contain-spaced my-6 mb-8 overflow-visible rounded-2xl border p-6 sm:p-8',
        hasUpside
          ? 'border-[#00bfa5]/35 bg-gradient-to-br from-[#00bfa5]/12 via-[#0b2c24] to-[#051c14] shadow-[0_0_40px_rgba(0,191,165,0.12)]'
          : 'border-white/10 bg-white/[0.03]',
        className,
      )}
    >
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#00bfa5]">
        {isHe ? 'הממצא המרכזי' : 'Central finding'}
      </p>

      {hasUpside ? (
        <>
          <h2 className="mt-4 text-xl font-bold leading-snug text-white sm:text-2xl">
            {isHe
              ? `העסק שלך מוערך ב-${baseFmt} — נמוך ב-${gapPct}% מהפוטנציאל שלו בשוק`
              : `Your business is valued at ${baseFmt} — ${gapPct}% below its market potential`}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-emerald-100/75">
            {isHe
              ? 'על פי השוואה לחברות דומות, יש פוטנציאל לשפר את הערך לפני כל עסקה'
              : 'Compared with similar companies, there may be room to improve value before any transaction'}
          </p>
        </>
      ) : (
        <h2 className="mt-4 text-xl font-semibold text-slate-100 sm:text-2xl">
          {isHe ? 'הערכת השווי הושלמה' : 'Valuation complete'}
        </h2>
      )}
    </section>
  );
}
