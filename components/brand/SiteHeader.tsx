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
      className={`site-header flex min-w-0 flex-row items-center gap-2 px-4 sm:gap-3 sm:px-8 lg:px-10 ${
        premium ? 'min-h-[72px] py-3 sm:min-h-[88px] sm:py-5' : 'h-[64px] sm:h-[72px]'
      } ${className}`}
    >
      <EquifyLogoLink
        variant={variant}
        premium={premium}
        className="max-w-[min(100%,11.5rem)] shrink-0 sm:max-w-none"
      />
      {children ? (
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-start gap-3 sm:gap-4">
          {children}
        </div>
      ) : null}
    </header>
  );
}
