'use client';

import type { ValuationLocale } from '../../api_client';
import { useValuationI18n } from '../../valuation_i18n';
import { getEquifyWizardCopy } from '../../lib/wizard/equify_wizard_copy';

export function EquifyLanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useValuationI18n();
  const copy = getEquifyWizardCopy(locale);

  const set = (next: ValuationLocale) => {
    if (next !== locale) setLocale(next);
  };

  return (
    <div
      className={['eq-lang-toggle', className].filter(Boolean).join(' ')}
      role="group"
      aria-label={copy.langToggleAria}
    >
      <button
        type="button"
        className={`eq-lang-btn${locale === 'he' ? ' on' : ''}`}
        onClick={() => set('he')}
        aria-pressed={locale === 'he'}
      >
        HE
      </button>
      <button
        type="button"
        className={`eq-lang-btn${locale === 'en' ? ' on' : ''}`}
        onClick={() => set('en')}
        aria-pressed={locale === 'en'}
      >
        EN
      </button>
    </div>
  );
}
