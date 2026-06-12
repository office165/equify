'use client';

import type { RefObject } from 'react';
import { MARQUEE_ITEMS } from '../equify-data';

interface MarqueeBandProps {
  marqueeRef: RefObject<HTMLDivElement>;
}

/** פס גלילה אינסופי — מונפש ב-GSAP (RTL-safe) */
export function MarqueeBand({ marqueeRef }: MarqueeBandProps) {
  return (
    <div className="marquee" aria-hidden="true">
      <div className="mq-track" id="mq" ref={marqueeRef}>
        {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
          <span key={`${item}-${i}`}>{item}</span>
        ))}
      </div>
    </div>
  );
}
