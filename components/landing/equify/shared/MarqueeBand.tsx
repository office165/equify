'use client';

import type { RefObject } from 'react';
import { useLandingCopy } from '../use_landing_copy';

interface MarqueeBandProps {
  marqueeRef: RefObject<HTMLDivElement>;
}

/** פס גלילה אינסופי — מונפש ב-GSAP (RTL-safe) */
export function MarqueeBand({ marqueeRef }: MarqueeBandProps) {
  const { marquee } = useLandingCopy();
  return (
    <div className="marquee" aria-hidden="true">
      <div className="mq-track" id="mq" ref={marqueeRef}>
        {[...marquee, ...marquee].map((item, i) => (
          <span key={`${item}-${i}`}>{item}</span>
        ))}
      </div>
    </div>
  );
}
