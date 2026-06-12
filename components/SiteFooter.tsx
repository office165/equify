'use client';

import React from 'react';
import { useValuationI18n } from '../valuation_i18n';
import { AccessibilityStatementLink } from './AccessibilityStatementDialog';
import { LegalDisclaimerFooter } from './LegalDisclaimerFooter';

export interface SiteFooterProps {
  className?: string;
  variant?: 'default' | 'compact';
}

function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function SiteFooter({ className, variant = 'default' }: SiteFooterProps) {
  const { locale } = useValuationI18n();

  return (
    <div className={cn('mt-8', className)}>
      <LegalDisclaimerFooter locale={locale} variant={variant} />
      <div
        className={cn(
          'flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-slate-800/80 px-4 py-3 text-center',
          variant === 'compact' ? 'text-[10px]' : 'text-xs',
        )}
      >
        <span className="text-slate-500">© {new Date().getFullYear()} equify BY SBC</span>
        <AccessibilityStatementLink />
      </div>
    </div>
  );
}
