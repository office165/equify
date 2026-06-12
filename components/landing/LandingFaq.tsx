'use client';

import React, { useState } from 'react';
import { TablerIcon } from './TablerIcon';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface LandingFaqProps {
  items: FaqItem[];
}

export function LandingFaq({ items }: LandingFaqProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isOpen = openId === item.id;
        const panelId = `faq-panel-${item.id}`;
        const buttonId = `faq-button-${item.id}`;

        return (
          <div key={item.id} className="landing-surface overflow-hidden">
            <button
              id={buttonId}
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenId(isOpen ? null : item.id)}
              className="flex w-full touch-manipulation items-center justify-between gap-4 px-5 py-4 text-start transition hover:bg-slate-800/30"
            >
              <span className="text-sm font-semibold text-[var(--eq-ink-on-dark)] sm:text-base">
                {item.question}
              </span>
              <TablerIcon
                name="chevron-down"
                className={`h-5 w-5 shrink-0 text-[var(--eq-accent-mint)] transition-transform duration-300 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="border-t border-[var(--eq-border-dark)] px-5 py-4 text-sm leading-relaxed text-[var(--eq-muted-on-dark)]"
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
