'use client';

import Link from 'next/link';
import { BRAND_HOME_ARIA } from '../../lib/brand/brand-identity';
import type { EquifyLogoVariant } from './EquifyLogo';
import { EquifyLogo } from './EquifyLogo';
import { useIsMobile } from '../landing/motion/useReducedMotion';

export interface EquifyLogoLinkProps {
  variant?: EquifyLogoVariant;
  premium?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function EquifyLogoLink({
  variant = 'dark-bg',
  premium = false,
  className = '',
  ariaLabel = BRAND_HOME_ARIA,
}: EquifyLogoLinkProps) {
  const mobile = useIsMobile();

  return (
    <Link
      href="/"
      className={`brand-logo-link group inline-flex shrink-0 flex-row items-center gap-2 rounded-lg bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-mint-1)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020504] ${
        premium ? 'brand-logo-link--premium' : ''
      } ${className}`}
      aria-label={ariaLabel}
    >
      <span
        className={`equify-logo-box ${
          premium ? 'equify-logo-box--premium' : ''
        } ${mobile ? 'equify-logo-box--compact' : ''}`}
      >
        <EquifyLogo
          variant={variant}
          premium={premium}
          compact={mobile}
          decorative
          className="h-full w-full max-w-full"
        />
      </span>
    </Link>
  );
}
