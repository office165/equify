'use client';

import { useEffect, type RefObject } from 'react';
import { gsap } from 'gsap';

/** Step transition motion — DOM-only inside useEffect. */
export function useWizardStepMotion(
  step: number,
  reducedMotion: boolean,
  topbarRef: RefObject<HTMLDivElement | null>,
): void {
  useEffect(() => {
    if (typeof window === 'undefined' || reducedMotion) return undefined;
    const el = topbarRef.current;
    if (!el) return undefined;
    gsap.fromTo(el, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
    return undefined;
  }, [step, reducedMotion, topbarRef]);
}
