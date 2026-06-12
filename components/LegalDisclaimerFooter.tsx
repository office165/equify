'use client';

import React from 'react';
import { getLegalDisclaimer } from '../lib/legal/disclaimer';
import type { ValuationLocale } from '../api_client';

export interface LegalDisclaimerFooterProps {
  locale: ValuationLocale;
  className?: string;
  /** Compact typography for dense layouts (e.g. wizard card). */
  variant?: 'default' | 'compact';
}

function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function LegalDisclaimerFooter({
  locale,
  className,
  variant = 'default',
}: LegalDisclaimerFooterProps) {
  const isHe = locale === 'he';
  const disclaimer = getLegalDisclaimer(locale, 'full');

  return (
    <footer
      role="contentinfo"
      aria-label={isHe ? 'הבהרה משפטית' : 'Legal disclaimer'}
      className={cn(
        'border-t border-slate-700/40',
        variant === 'compact' ? 'px-4 py-4' : 'px-4 py-6 sm:px-6',
        className,
      )}
    >
      <p
        lang={isHe ? 'he' : 'en'}
        dir={isHe ? 'rtl' : 'ltr'}
        className={cn(
          'mx-auto max-w-4xl text-justify leading-relaxed text-slate-400',
          variant === 'compact' ? 'text-[10px] sm:text-[11px]' : 'text-[11px] sm:text-xs',
        )}
      >
        {disclaimer}
      </p>
    </footer>
  );
}
