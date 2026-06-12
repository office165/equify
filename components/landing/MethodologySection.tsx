'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { METHODOLOGY_CARDS } from '../../lib/landing/methodology';
import { FadeRise } from './motion/FadeRise';
import { useReducedMotion } from './motion/useReducedMotion';

const ICON_PATHS: Record<string, string> = {
  dcf: 'M4 19V5M4 19h16M8 17V9m4 8V7m4 10v-4',
  ebitda: 'M3 3v18h18M7 16l4-8 4 5 4-9',
  revenue: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  multiples: 'M4 7h16M4 12h10M4 17h14',
  composite: 'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z',
};

function MethodIcon({ type }: { type: string }) {
  const d = ICON_PATHS[type] ?? ICON_PATHS.dcf;
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MethodCard({
  card,
  className = '',
  fullWidth = false,
}: {
  card: (typeof METHODOLOGY_CARDS)[number];
  className?: string;
  fullWidth?: boolean;
}) {
  const isComposite = card.id === 'blended';
  return (
    <article
      className={`landing-surface flex h-full shrink-0 snap-start flex-col p-5 sm:p-6 ${className} ${
        isComposite ? 'border-[var(--eq-accent-mint)]/40 bg-[var(--eq-surface-raised)]' : ''
      }`}
      style={fullWidth ? undefined : { width: 'clamp(260px, 80vw, 320px)' }}
    >
      <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#00D4C8]/15 text-[#00D4C8]">
        <MethodIcon type={card.icon} />
      </span>
      <p className="text-xs font-bold uppercase tracking-wide text-[#00D4C8]">{card.subtitle}</p>
      <h3 className="mt-1 text-lg font-semibold text-white">{card.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{card.description}</p>
    </article>
  );
}

function MethodologyConnector({ progress }: { progress: MotionValue<number> }) {
  return (
    <svg
      className="pointer-events-none absolute inset-x-6 top-1/2 z-0 h-px w-[calc(100%-3rem)] -translate-y-1/2 md:inset-x-10 md:w-[calc(100%-5rem)]"
      viewBox="0 0 1000 2"
      preserveAspectRatio="none"
      aria-hidden
    >
      <motion.path
        d="M0 1 H1000"
        fill="none"
        stroke="#34d399"
        strokeWidth="2"
        strokeOpacity="0.28"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        style={{ pathLength: progress }}
      />
    </svg>
  );
}

function DesktopStickyTrack() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });
  const x = useTransform(scrollYProgress, [0, 1], ['0%', '-48%']);
  const connectorLength = useTransform(scrollYProgress, [0.05, 0.85], [0, 1]);

  return (
    <div ref={containerRef} className="relative hidden h-[200vh] lg:block xl:hidden">
      <div className="sticky top-24">
        <div className="relative isolate overflow-hidden px-6 md:px-10">
          <MethodologyConnector progress={connectorLength} />
          <motion.div
            style={reduced ? undefined : { x, willChange: 'transform' }}
            className="relative z-[1] flex gap-4"
          >
            {METHODOLOGY_CARDS.map((card) => (
              <MethodCard key={card.id} card={card} className="!w-[min(22vw,300px)]" />
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function MobileScrollTrack() {
  return (
    <div className="methodology-scroll-fade lg:hidden">
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4 [-ms-overflow-style:none] [scroll-padding-inline:1.5rem] [scrollbar-width:none] md:px-10 md:[scroll-padding-inline:2.5rem] [&::-webkit-scrollbar]:hidden">
        {METHODOLOGY_CARDS.map((card, i) => (
          <FadeRise key={card.id} delay={i * 0.08}>
            <MethodCard card={card} />
          </FadeRise>
        ))}
      </div>
    </div>
  );
}

function DesktopGrid() {
  const primary = METHODOLOGY_CARDS.filter((c) => c.id !== 'blended');
  const blended = METHODOLOGY_CARDS.find((c) => c.id === 'blended')!;

  return (
    <div className="hidden gap-4 xl:grid xl:grid-cols-4">
      {primary.map((card, i) => (
        <FadeRise key={card.id} delay={i * 0.08}>
          <MethodCard card={card} fullWidth />
        </FadeRise>
      ))}
      <FadeRise delay={primary.length * 0.08} className="xl:col-span-2 xl:col-start-2">
        <MethodCard card={blended} fullWidth />
      </FadeRise>
    </div>
  );
}

export function MethodologySection() {
  return (
    <section
      className="relative isolate mb-20 overflow-x-clip sm:mb-28"
      aria-labelledby="methodology-title"
    >
      <FadeRise className="mb-8 text-center">
        <p className="typo-eyebrow mb-3">מתודולוגיה</p>
        <h2 id="methodology-title" className="typo-h2">
          מתודולוגיה מבוססת מנוע
        </h2>
        <p className="typo-body mx-auto mt-3 max-w-2xl text-sm sm:text-base">
          כל מודל מחובר לליבת ההערכה של equify — לא שיווק, אלא חישוב אמיתי
        </p>
      </FadeRise>

      <MobileScrollTrack />
      <DesktopStickyTrack />
      <DesktopGrid />
    </section>
  );
}
