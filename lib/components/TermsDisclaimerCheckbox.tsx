'use client';

import React from 'react';
import {
  TERMS_AND_AI_DISCLAIMER_EN,
  TERMS_AND_AI_DISCLAIMER_HE,
} from '../legal/terms';
import type { ValuationTranslations } from '../../valuation_i18n';

export interface TermsDisclaimerCheckboxProps {
  termsAccepted: boolean;
  onTermsAcceptedChange: (accepted: boolean) => void;
  termsError: string | null;
  i18n: ValuationTranslations;
  className?: string;
}

function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Mandatory terms + AI disclaimer acceptance (WCAG-labelled checkbox). */
export function TermsDisclaimerCheckbox({
  termsAccepted,
  onTermsAcceptedChange,
  termsError,
  i18n,
  className,
}: TermsDisclaimerCheckboxProps) {
  const disclaimerText =
    i18n.locale === 'he'
      ? TERMS_AND_AI_DISCLAIMER_HE
      : TERMS_AND_AI_DISCLAIMER_EN;

  return (
    <div
      className={cn(
        'rounded-2xl border p-5 transition-colors',
        termsError
          ? 'border-rose-500/50 bg-rose-950/20'
          : 'border-slate-600/80 bg-slate-800/40',
        className,
      )}
    >
      <label
        htmlFor="terms-acceptance"
        className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-slate-200"
      >
        <input
          id="terms-acceptance"
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => onTermsAcceptedChange(e.target.checked)}
          aria-required="true"
          aria-invalid={termsError ? true : undefined}
          aria-describedby={
            termsError ? 'terms-error' : 'terms-disclaimer-text'
          }
          aria-label={i18n.t('termsCheckboxAria')}
          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-500 bg-slate-900 text-mint-400 focus:ring-2 focus:ring-mint-400 focus:ring-offset-2 focus:ring-offset-slate-900"
        />
        <span
          id="terms-disclaimer-text"
          lang={i18n.locale === 'he' ? 'he' : 'en'}
          dir={i18n.dir}
        >
          {disclaimerText}
        </span>
      </label>
      {termsError && (
        <p id="terms-error" role="alert" className="mt-3 text-xs text-rose-300">
          {termsError}
        </p>
      )}
    </div>
  );
}
