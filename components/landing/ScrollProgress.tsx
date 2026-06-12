'use client';

import { motion, useScroll, useSpring } from 'framer-motion';
import { useReducedMotion } from './motion/useReducedMotion';

export function ScrollProgress() {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 25, restDelta: 0.001 });

  if (reduced) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px] bg-white/5"
      aria-hidden
    >
      <motion.div
        className="h-full w-full origin-right bg-gradient-to-l from-[#00D4C8] to-emerald-400"
        style={{ scaleX, willChange: 'transform' }}
      />
    </div>
  );
}
