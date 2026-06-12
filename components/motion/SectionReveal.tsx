'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import {
  containerStagger,
  sectionReveal,
  VIEWPORT_REVEAL,
  withReducedMotion,
} from '../../lib/motion';
import { useReducedMotion } from '../landing/motion/useReducedMotion';

interface SectionRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function SectionReveal({ children, className, delay }: SectionRevealProps) {
  const reduced = useReducedMotion();
  const variants = withReducedMotion(
    reduced,
    delay
      ? {
          ...sectionReveal,
          show: {
            ...sectionReveal.show,
            transition: {
              ...(typeof sectionReveal.show === 'object' && sectionReveal.show?.transition
                ? sectionReveal.show.transition
                : {}),
              delay,
            },
          },
        }
      : sectionReveal,
  );

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT_REVEAL}
    >
      {children}
    </motion.div>
  );
}

interface SectionStaggerProps {
  children: ReactNode;
  className?: string;
}

export function SectionStagger({ children, className }: SectionStaggerProps) {
  const reduced = useReducedMotion();
  const variants = withReducedMotion(reduced, containerStagger);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      animate={mounted ? 'show' : undefined}
      whileInView="show"
      viewport={{ ...VIEWPORT_REVEAL, margin: '0px 0px -8% 0px', amount: 0.05 }}
    >
      {children}
    </motion.div>
  );
}

export function SectionItem({ children, className }: SectionRevealProps) {
  return <SectionReveal className={className}>{children}</SectionReveal>;
}

/** Child of `SectionStagger` — inherits parent orchestration (no separate in-view trigger). */
export function StaggerItem({ children, className }: SectionRevealProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div className={className} variants={withReducedMotion(reduced, sectionReveal)}>
      {children}
    </motion.div>
  );
}
