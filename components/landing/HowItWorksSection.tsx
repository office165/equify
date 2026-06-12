'use client';

import { useState } from 'react';
import { WIZARD_STEPS } from '../../lib/landing/methodology';
import { FadeRise } from './motion/FadeRise';

function StepRow({
  step,
  active,
  onActivate,
}: {
  step: (typeof WIZARD_STEPS)[number];
  active: boolean;
  onActivate: () => void;
}) {
  const num = String(step.number).padStart(2, '0');

  return (
    <button
      type="button"
      onMouseEnter={onActivate}
      onFocus={onActivate}
      onClick={onActivate}
      className={`group flex w-full touch-manipulation items-start gap-4 rounded-3xl border px-5 py-6 text-start transition-all duration-200 sm:gap-6 sm:px-8 sm:py-7 ${
        active
          ? 'landing-glass-card border-emerald-500/25 ring-1 ring-[#00F5A0]/15'
          : 'landing-glass-card border-emerald-500/10 hover:border-emerald-500/20'
      }`}
    >
      <span
        className={`how-step-glow shrink-0 font-mono text-4xl font-bold tabular-nums leading-none sm:text-5xl ${
          active ? 'how-step-glow--active' : 'how-step-glow--idle'
        }`}
        aria-hidden
      >
        {num}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-bold text-slate-100 sm:text-xl">{step.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--eq-muted-on-dark)] sm:text-base">
          {step.description}
        </p>
      </div>
    </button>
  );
}

export function HowItWorksSection() {
  const [activeId, setActiveId] = useState<string>(WIZARD_STEPS[0].id);

  return (
    <section className="landing-section pb-8 pt-12 md:pb-10 md:pt-20" aria-labelledby="how-title">
      <FadeRise className="mb-10 text-center">
        <p className="typo-eyebrow mb-3">איך זה עובד</p>
        <h2 id="how-title" className="typo-h2">
          מארבעה שלבים לדוח מקצועי
        </h2>
        <p className="typo-body mx-auto mt-3 max-w-xl text-sm sm:text-base">
          אשף מונחה שמאסף נתונים, מריץ מודלים ומפיק דוח PDF — בלי יועץ חיצוני
        </p>
      </FadeRise>

      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {WIZARD_STEPS.map((step) => (
          <StepRow
            key={step.id}
            step={step}
            active={activeId === step.id}
            onActivate={() => setActiveId(step.id)}
          />
        ))}
      </div>
    </section>
  );
}
