'use client';

import React from 'react';

export interface AccessibilityRegionProps {
  id?: string;
  label: string;
  children: React.ReactNode;
  className?: string;
  labelledBy?: string;
}

/** Landmark region with an accessible name for screen readers. */
export function AccessibilityRegion({
  id,
  label,
  children,
  className,
  labelledBy,
}: AccessibilityRegionProps) {
  return (
    <section
      id={id}
      role="region"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      className={className}
    >
      {children}
    </section>
  );
}

export interface WizardSkipLinkProps {
  href: string;
  label: string;
}

export function WizardSkipLink({ href, label }: WizardSkipLinkProps) {
  return (
    <a href={href} className="vb-skip-link">
      {label}
    </a>
  );
}

export interface LiveStatusProps {
  message: string;
  politeness?: 'polite' | 'assertive';
  className?: string;
}

export function LiveStatus({
  message,
  politeness = 'polite',
  className,
}: LiveStatusProps) {
  return (
    <p
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className={className}
    >
      {message}
    </p>
  );
}
