'use client';

import type { ReactNode } from 'react';
import {
  SectionItem,
  SectionReveal,
  SectionStagger,
  StaggerItem,
} from '../../motion/SectionReveal';

interface FadeRiseProps {
  children: ReactNode;
  delay?: number;
  /** @deprecated RTL offset removed — unified y-rise only */
  rtl?: boolean;
  className?: string;
  staggerChildren?: boolean;
}

export function FadeRise({
  children,
  delay,
  className,
  staggerChildren = false,
}: FadeRiseProps) {
  if (staggerChildren) {
    return <SectionStagger className={className}>{children}</SectionStagger>;
  }

  return (
    <SectionReveal className={className} delay={delay}>
      {children}
    </SectionReveal>
  );
}

export { SectionItem, StaggerItem };
