'use client';

import { useEffect, useState, type RefObject } from 'react';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return reduced;
}

export function useIsMobile(breakpoint = 768): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [breakpoint]);

  return mobile;
}

export function useIsTouchDevice(): boolean {
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    const update = () => {
      setTouch(
        'ontouchstart' in window ||
          navigator.maxTouchPoints > 0 ||
          window.matchMedia('(pointer: coarse)').matches,
      );
    };
    update();
    window.matchMedia('(pointer: coarse)').addEventListener('change', update);
    return () => window.matchMedia('(pointer: coarse)').removeEventListener('change', update);
  }, []);

  return touch;
}

export function useInView(
  ref: RefObject<Element | null>,
  margin = '-80px',
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setInView(true);
      },
      { rootMargin: margin, threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, margin]);

  return inView;
}
