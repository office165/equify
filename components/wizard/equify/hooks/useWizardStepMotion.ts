'use client';

import { useEffect, type RefObject } from 'react';
import { gsap } from 'gsap';

/** Step transition + pane reveal — DOM-only inside useEffect. */
export function useWizardStepMotion(
  step: number,
  reducedMotion: boolean,
  topbarRef: RefObject<HTMLDivElement | null>,
  paneRef: RefObject<HTMLElement | null>,
  onRevealed?: () => void,
): void {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const pane = paneRef.current;
    const topbar = topbarRef.current;

    const revealNow = () => {
      if (!pane) {
        onRevealed?.();
        return;
      }
      pane.querySelectorAll<HTMLElement>('.rv, .rv-r, .stagger > *').forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      onRevealed?.();
    };

    if (reducedMotion || !pane) {
      revealNow();
      return undefined;
    }

    const targets = pane.querySelectorAll('.rv, .rv-r, .stagger > *');
    if (targets.length === 0) {
      revealNow();
      return undefined;
    }

    const ctx = gsap.context(() => {
      if (topbar) {
        gsap.fromTo(
          topbar,
          { opacity: 0, y: -8 },
          { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' },
        );
      }
      gsap.fromTo(
        targets,
        { opacity: 0, y: 22 },
        {
          opacity: 1,
          y: 0,
          duration: 0.65,
          stagger: 0.07,
          ease: 'power3.out',
          onComplete: onRevealed,
        },
      );
    }, pane);

    const fallbackTimer = window.setTimeout(revealNow, 900);

    return () => {
      window.clearTimeout(fallbackTimer);
      ctx.revert();
    };
  }, [step, reducedMotion, topbarRef, paneRef, onRevealed]);
}
