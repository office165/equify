'use client';

import Link from 'next/link';
import { TablerIcon, type TablerIconName } from './TablerIcon';
import { FadeRise, StaggerItem } from './motion/FadeRise';
import { SectionStagger } from '../motion/SectionReveal';

const PERSONAS: {
  icon: TablerIconName;
  title: string;
  bullets: [string, string];
  cta: string;
}[] = [
  {
    icon: 'briefcase',
    title: 'בעלי עסקים',
    bullets: ['מכירה / שותפות', 'עוקב אחר הצמיחה'],
    cta: 'הערך את העסק שלי',
  },
  {
    icon: 'calculator',
    title: 'רואי חשבון',
    bullets: ['הצע ללקוחות', 'קבל עמלה'],
    cta: 'התחל עם לקוח',
  },
  {
    icon: 'scale',
    title: 'עורכי דין',
    bullets: ['גירושין עסקיים, ירושה', '409A'],
    cta: 'הערכה לצרכים משפטיים',
  },
  {
    icon: 'trending-up',
    title: 'יזמים',
    bullets: ['גיוס השקעה', 'pitch deck'],
    cta: 'הכן לגיוס',
  },
];

function PersonaCard({ persona }: { persona: (typeof PERSONAS)[number] }) {
  const inner = (
    <article className="landing-card-hover landing-surface flex h-full flex-col p-6">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--eq-accent-mint)]/15 text-[var(--eq-accent-mint)]">
        <TablerIcon name={persona.icon} className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--eq-ink-on-dark)]">{persona.title}</h3>
      <ul className="mt-3 flex-1 space-y-1.5 text-sm text-[var(--eq-muted-on-dark)]">
        {persona.bullets.map((bullet) => (
          <li key={bullet} className="flex items-center gap-2">
            <span className="text-[var(--eq-accent-mint)]" aria-hidden>
              •
            </span>
            {bullet}
          </li>
        ))}
      </ul>
      <Link
        href="/wizard"
        className="mt-5 text-sm font-semibold text-[var(--eq-accent-mint)] transition hover:opacity-80"
      >
        {persona.cta} ←
      </Link>
    </article>
  );

  return <StaggerItem>{inner}</StaggerItem>;
}

export function PersonasSection() {
  return (
    <section className="landing-section py-12 md:py-20" aria-labelledby="personas-title">
      <FadeRise className="mb-8 text-center">
        <p className="typo-eyebrow mb-3">קהלי יעד</p>
        <h2 id="personas-title" className="typo-h2">
          למי זה מתאים
        </h2>
      </FadeRise>

      <SectionStagger className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {PERSONAS.map((persona) => (
          <PersonaCard key={persona.title} persona={persona} />
        ))}
      </SectionStagger>
    </section>
  );
}
