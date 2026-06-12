'use client';

import { useEffect, type ReactNode } from 'react';
import { useIsMobile, useIsTouchDevice, useReducedMotion } from './motion/useReducedMotion';

export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const mobile = useIsMobile();
  const touch = useIsTouchDevice();

  useEffect(() => {
    if (reduced || mobile || touch) return;
    let lenis: { destroy: () => void; raf: (time: number) => void } | null = null;
    let frame = 0;
    let cancelled = false;

    void import('lenis').then(({ default: Lenis }) => {
      if (cancelled) return;
      const instance = new Lenis({
        lerp: 0.1,
        smoothWheel: true,
        duration: 1.2,
      });
      lenis = instance;
      const raf = (time: number) => {
        instance.raf(time);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      lenis?.destroy();
    };
  }, [reduced, mobile, touch]);

  return <>{children}</>;
}
