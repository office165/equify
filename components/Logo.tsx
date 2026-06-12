'use client';

/**
 * @deprecated Prefer `EquifyLogo` / `EquifyLogoLink` from `./brand/`.
 * Re-exported for backward compatibility across wizard and dashboard.
 */

import Link from 'next/link';
import {
  EquifyLogo,
  EquifyMark,
  type EquifyLogoProps,
  type EquifyLogoVariant,
} from './brand/EquifyLogo';

export interface LogoProps {
  className?: string;
  link?: boolean;
  ariaLabel?: string;
  variant?: EquifyLogoVariant;
}

export function LogoMark(props: Omit<LogoProps, 'link' | 'ariaLabel'>) {
  return (
    <EquifyMark
      variant={props.variant ?? 'dark-bg'}
      className={props.className ?? 'h-10 w-10'}
    />
  );
}

export default function Logo({
  className,
  link = true,
  ariaLabel = 'equify BY SBC — דף הבית',
  variant = 'dark-bg',
}: LogoProps) {
  const logo = (
    <EquifyLogo
      variant={variant}
      className={className ?? 'h-10 w-auto max-w-[160px]'}
    />
  );

  if (!link) {
    return <span className="inline-flex shrink-0">{logo}</span>;
  }

  return (
    <Link
      href="/"
      aria-label={ariaLabel}
      className="brand-logo-link group inline-flex shrink-0 items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-mint-1)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b2c24]"
    >
      {logo}
    </Link>
  );
}

export type { EquifyLogoProps, EquifyLogoVariant };
