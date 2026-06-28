'use client';

import React from 'react';
import type { EquifyLogoVariant } from './EquifyLogo';
import { EquifyLogoLink } from './EquifyLogoLink';

export interface SiteHeaderProps {
  variant?: EquifyLogoVariant;
  /** Authoritative enterprise wordmark scale (wizard / dashboard) */
  premium?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Global app header — RTL: logo on the right, nav flows leftward.
 */
export function SiteHeader({
  variant = 'dark-bg',
  premium = false,
  className = '',
  children,
}: SiteHeaderProps) {
  return (
    <header
      className={`site-header flex min-w-0 flex-row items-center gap-2 bg-transparent px-4 sm:gap-3 sm:px-8 lg:px-10 ${
        premium
          ? 'min-h-[72px] py-3 sm:min-h-[88px] sm:py-4 lg:min-h-[100px] lg:py-5'
          : 'min-h-[64px] py-2 sm:min-h-[72px] sm:py-3 lg:min-h-[96px] lg:py-4'
      } ${className}`}
    >
      <EquifyLogoLink
        variant={variant}
        premium={premium}
        className="shrink-0"
      />
      {children ? (
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-start gap-3 sm:gap-4">
          {children}
        </div>
      ) : null}
    </header>
  );
}
