'use client';

import Link from 'next/link';
import { BRAND_NAME } from '../../lib/brand/brand-identity';
import { HERO_HEADLINE_WORDS, HERO_SUBLINE } from '../../lib/landing/methodology';
import { DurationValue } from './shared/BidiNumberUnit';
import { FadeRise } from './motion/FadeRise';

const TRUST_STRIP = [
  '500+ עסקים הוערכו',
  'DCF + מכפילים ישראליים',
  'דוח PDF תוך דקות',
];

const WATERFALL_ROWS = [
  { label: 'שווי פעילות', value: '₪24.5M', width: '100%' },
  { label: 'חוב נטו', value: '₪4.4M−', width: '18%' },
  { label: 'שווי לבעלים', value: '₪20.1M', width: '82%', highlight: true },
] as const;

function HeroVerdictPreview() {
  return (
    <div className="hero-verdict-stack relative mx-auto w-full max-w-md" aria-hidden>
      <div className="hero-verdict-stack__peek" />

      <div className="hero-verdict-card relative rounded-3xl border border-white/[0.08] bg-[#111815] p-8">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-[#00F5A0]">
          הצצה לדוח
        </p>

        <p className="mt-4 text-sm font-medium text-slate-400">
          שווי לבעלים · תרחיש בסיס
        </p>

        <p className="mt-2 font-mono text-4xl font-semibold tabular-nums tracking-tight text-[#00F5A0] sm:text-[2.75rem]">
          ₪20.1M
        </p>

        <div className="mt-8 space-y-4">
          {WATERFALL_ROWS.map((row) => {
            const highlighted = 'highlight' in row && row.highlight;
            return (
              <div key={row.label}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
                  <span className={highlighted ? 'font-semibold text-slate-200' : 'text-slate-500'}>
                    {row.label}
                  </span>
                  <span
                    className={`font-mono font-semibold tabular-nums ${
                      highlighted ? 'text-[#00F5A0]' : 'text-slate-300'
                    }`}
                  >
                    {row.value}
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full ${
                      highlighted ? 'bg-[#00F5A0]' : 'bg-white/20'
                    }`}
                    style={{ width: row.width }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-[11px] text-slate-500">דוח PDF מלא · 7 עמודים</p>
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <header className="landing-section overflow-visible pb-8 pt-6 md:pb-12 md:pt-10">
      <FadeRise>
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-12">
          <div className="order-2 text-center md:order-1 md:text-start">
            <p className="typo-eyebrow mb-4">{BRAND_NAME}</p>
            <h1 className="landing-headline mx-auto max-w-3xl md:mx-0">
              {HERO_HEADLINE_WORDS.join(' ')}
              <span className="mt-3 block bg-gradient-to-r from-[#00F5A0] to-[#10B981] bg-clip-text text-transparent">
                תוך <DurationValue variant="long" />
              </span>
            </h1>

            <p className="typo-body mx-auto mt-5 max-w-xl text-base sm:text-lg md:mx-0">
              {HERO_SUBLINE}
            </p>

            <div className="mt-8 flex flex-col items-center gap-4 md:items-start">
              <Link href="/wizard" className="landing-cta">
                התחל הערכת שווי ←
              </Link>
              <p className="text-sm text-[var(--eq-muted-on-dark)]">
                ללא כרטיס אשראי · <DurationValue variant="long" /> · PDF להורדה מיידית
              </p>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-2 md:justify-start">
              {TRUST_STRIP.map((pill) => (
                <span
                  key={pill}
                  className="nextronium-glass rounded-full px-3.5 py-1.5 text-xs font-medium text-[#00F5A0] sm:text-sm"
                >
                  {pill}
                </span>
              ))}
            </div>
          </div>

          <div className="order-1 w-full md:order-2">
            <HeroVerdictPreview />
          </div>
        </div>
      </FadeRise>
    </header>
  );
}
