'use client';

import { FadeRise } from './motion/FadeRise';
import { CountUp } from './motion/CountUp';

type StatItem =
  | {
      kind: 'count';
      value: number;
      suffix?: string;
      label: string;
    }
  | {
      kind: 'literal';
      value: string;
      label: string;
    };

const STATS: readonly StatItem[] = [
  { kind: 'count', value: 500, suffix: '+', label: 'עסקים הוערכו' },
  { kind: 'count', value: 5, suffix: '', label: 'מודלים פיננסיים' },
  { kind: 'count', value: 10, suffix: '', label: 'דקות ממוצע להשלמה' },
  { kind: 'literal', value: '2026', label: 'נתוני שוק ישראלי מעודכנים' },
];

function CornerArrow() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="landing-stat-arrow pointer-events-none absolute end-4 top-4 h-4 w-4 shrink-0 text-mint-400/50"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M4 12 12 4M12 4H6M12 4v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const STAT_NUM_CLASS =
  'landing-stat-num block bg-gradient-to-r from-[#00F5A0] to-[#05D38A] bg-clip-text text-transparent';

export function StatsBand() {
  return (
    <section aria-label="נתונים מרכזיים" className="landing-section py-10 md:py-14">
      <FadeRise>
        <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="landing-glass-card landing-stat-card relative min-w-0 p-6 sm:p-8"
            >
              <CornerArrow />
              <div className="landing-stat-num-wrap min-w-0 pe-7">
                {stat.kind === 'literal' ? (
                  <span className={STAT_NUM_CLASS}>{stat.value}</span>
                ) : (
                  <CountUp
                    end={stat.value}
                    suffix={stat.suffix}
                    formatNumbers
                    className={STAT_NUM_CLASS}
                  />
                )}
              </div>
              <p className="mt-2 text-xs text-[var(--eq-muted-on-dark)] sm:text-sm">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </FadeRise>
    </section>
  );
}
