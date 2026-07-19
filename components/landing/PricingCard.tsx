'use client';

import Link from 'next/link';

const FEATURES = [
  'DCF + WACC (Damodaran CRP) ומכפילי שוק ישראליים',
  'שווי משולב עם מטריצות רגישות',
  'דוח PDF מובנה בן 8 עמודים',
  'תרחישי Bear / Base / Bull',
] as const;

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4 shrink-0 text-emerald-400"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.25a1 1 0 0 1-1.414 0l-3.25-3.25a1 1 0 1 1 1.414-1.414l2.543 2.543 6.543-6.543a1 1 0 0 1 1.413-.005Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export interface PricingCardProps {
  remaining: number;
  total: number;
  claimedPct: number;
}

export function PricingCard({ remaining, total, claimedPct }: PricingCardProps) {
  const claimed = total - remaining;

  return (
    <article
      dir="rtl"
      lang="he"
      className="pricing-fomo-card relative mx-auto max-w-lg rounded-3xl border border-emerald-500/20 bg-[#111815] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.55)] sm:p-8"
      aria-labelledby="pricing-card-title"
    >
      <div className="flex flex-col gap-6">
        <span className="inline-flex self-start rounded-full bg-[#00F5A0] px-3 py-1 text-[11px] font-bold text-[#020504]">
          מומלץ
        </span>
        <h3 id="pricing-card-title" className="text-xl font-bold text-slate-100">
          דוח Pro מלא
        </h3>

        <div className="text-end">
          <p className="mb-3 font-mono text-sm text-slate-500 line-through">₪1,990</p>
          <p className="font-mono text-4xl font-bold leading-none text-[#00F5A0] sm:text-5xl">
            ₪999
          </p>
          <p className="mt-2 text-sm font-medium text-slate-400">חד-פעמי</p>
        </div>

        <ul className="grid gap-3 text-sm text-slate-300">
          {FEATURES.map((item) => (
            <li key={item} className="grid grid-cols-[1.25rem_1fr] items-start gap-2.5 text-start">
              <CheckIcon />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div>
          <div className="mb-2 flex items-end justify-between gap-3 text-xs">
            <span className="font-medium leading-snug text-slate-300">
              נשארו <span className="font-bold text-[#00F5A0]">{remaining}</span> מקומות ·{' '}
              <span className="font-bold text-emerald-400">{claimedPct}%</span> נתפסו
            </span>
            <span className="shrink-0 font-mono tabular-nums leading-none text-slate-500">
              {claimed}/{total}
            </span>
          </div>

          <div className="pricing-fomo-track h-2.5 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="pricing-fomo-fill h-full rounded-full bg-[#00F5A0] transition-[width] duration-700 ease-out"
              style={{ width: `${claimedPct}%` }}
              role="progressbar"
              aria-valuenow={claimedPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${claimedPct}% מההקצאות נתפסו`}
            />
          </div>

          <p className="mx-auto mt-3 max-w-[28rem] text-center text-xs leading-relaxed text-slate-400">
            {claimedPct}% מההקצאות לסבב הנוכחי נוצלו.
          </p>
        </div>

        <Link
          href="/wizard"
          className="pricing-fomo-cta flex w-full touch-manipulation items-center justify-center gap-2 rounded-full bg-[#00F5A0] px-8 py-4 text-base font-bold text-[#020504] transition-transform duration-200 hover:brightness-105 active:scale-[0.98]"
        >
          התחל הערכה ←
        </Link>

        <p className="text-center text-xs leading-relaxed text-slate-500">
          אינדיקציה אלגוריתמית בלבד · לא ייעוץ השקעות
        </p>
      </div>
    </article>
  );
}
