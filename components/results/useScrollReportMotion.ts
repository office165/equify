'use client';

import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

interface ScrollReportMotionOptions {
  enabled: boolean;
  reducedMotion: boolean;
  /** Compact-scale numeric amount (e.g. 3.15 for ₪3.15B), not raw millions. */
  coverEquityAmount: number;
  finalEquityAmount: number;
}

/** GSAP scroll motion — registers plugins and binds listeners only in useEffect. */
export function useScrollReportMotion(options: ScrollReportMotionOptions): void {
  useEffect(() => {
    if (typeof window === 'undefined' || !options.enabled || options.reducedMotion) {
      return undefined;
    }

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.to('#prog i', {
        width: '100%',
        ease: 'none',
        scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom bottom', scrub: 0.2 },
      });

      gsap.utils.toArray<HTMLElement>('.rv').forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 34 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
          },
        );
      });

      const coverVal = document.getElementById('coverVal');
      const finalVal = document.getElementById('finalVal');
      const target = options.coverEquityAmount || options.finalEquityAmount;
      if (coverVal) {
        gsap.to(coverVal, {
          textContent: target,
          duration: 1.4,
          ease: 'power2.out',
          snap: { textContent: 0.01 },
          scrollTrigger: { trigger: '#p1', start: 'top 70%' },
        });
      }
      if (finalVal) {
        gsap.to(finalVal, {
          textContent: options.finalEquityAmount,
          duration: 1.2,
          ease: 'power2.out',
          snap: { textContent: 0.01 },
          scrollTrigger: { trigger: '#p7', start: 'top 75%' },
        });
      }

      document.querySelectorAll<HTMLElement>('.wf-fill').forEach((fill) => {
        const w = Number(fill.dataset.w ?? 0);
        gsap.to(fill, {
          width: `${w}%`,
          duration: 0.9,
          ease: 'power2.out',
          scrollTrigger: { trigger: fill, start: 'top 85%' },
        });
      });

      document.querySelectorAll<HTMLElement>('.mr-dot').forEach((dot) => {
        const x = Number(dot.dataset.x ?? 50);
        gsap.to(dot, {
          left: `${x}%`,
          scale: 1,
          duration: 0.8,
          ease: 'back.out(1.4)',
          scrollTrigger: { trigger: dot, start: 'top 88%' },
        });
      });

      document.querySelectorAll<HTMLElement>('.qf-bar i').forEach((bar) => {
        const w = Number(bar.dataset.w ?? 0);
        gsap.to(bar, { width: `${w}%`, duration: 0.7, scrollTrigger: { trigger: bar, start: 'top 90%' } });
      });

      document.querySelectorAll<HTMLElement>('.weights div').forEach((seg) => {
        const w = Number(seg.dataset.w ?? 0);
        gsap.to(seg, { width: `${w}%`, duration: 0.6, scrollTrigger: { trigger: seg, start: 'top 88%' } });
      });
    });

    return () => ctx.revert();
  }, [
    options.coverEquityAmount,
    options.enabled,
    options.finalEquityAmount,
    options.reducedMotion,
  ]);
}
