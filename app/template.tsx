'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { routeEnter } from '../lib/motion';
import { useReducedMotion } from '../components/landing/motion/useReducedMotion';

export default function Template({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial={routeEnter.initial}
      animate={routeEnter.animate}
      transition={routeEnter.transition}
    >
      {children}
    </motion.div>
  );
}
