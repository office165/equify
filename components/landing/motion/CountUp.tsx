'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from './useReducedMotion';

interface CountUpProps {
  end: number;
  suffix?: string;
  prefix?: string;
  durationMs?: number;
  className?: string;
  /** When false, render digits without locale thousands separators (e.g. year 2026). */
  formatNumbers?: boolean;
}

export function CountUp({
  end,
  suffix = '',
  prefix = '',
  durationMs = 1400,
  className,
  formatNumbers = true,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref);
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? end : 0);

  useEffect(() => {
    if (reduced || !inView) {
      if (inView) setValue(end);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(end * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [end, inView, reduced, durationMs]);

  const formatted = formatNumbers ? value.toLocaleString('he-IL') : String(value);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
