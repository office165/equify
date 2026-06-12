import type { Transition, Variants } from 'framer-motion';

/** Signature ease for the whole site */
export const EASE = [0.16, 1, 0.3, 1] as const;

export const DUR = {
  fast: 0.35,
  base: 0.4,
  slow: 0.5,
  showcase: 0.4,
} as const;

export const STAGGER = 0.06;

export const VIEWPORT_REVEAL = {
  once: true,
  margin: '-12%',
} as const;

export const PROGRESS_SPRING = {
  type: 'spring' as const,
  stiffness: 120,
  damping: 20,
};

export const sectionReveal: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.base, ease: EASE },
  },
};

export const containerStagger: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: STAGGER, delayChildren: 0.1 },
  },
};

export const routeEnter = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: DUR.fast, ease: EASE } satisfies Transition,
};

export function motionInstant(): Transition {
  return { duration: 0 };
}

export function withReducedMotion<T extends Variants>(
  reduced: boolean,
  variants: T,
): T {
  if (!reduced) return variants;
  return {
    hidden: {},
    show: { transition: { duration: 0 } },
  } as unknown as T;
}

export function wizardStepOffset(
  rtl: boolean,
  direction: 'forward' | 'back',
  phase: 'enter' | 'exit',
): number {
  const sign = rtl ? -1 : 1;
  if (phase === 'enter') {
    return direction === 'forward' ? 16 * sign : -16 * sign;
  }
  return direction === 'forward' ? -16 * sign : 16 * sign;
}
