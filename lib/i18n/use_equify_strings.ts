'use client';

import { useMemo } from 'react';
import type { ValuationLocale } from '../../api_client';
import { getEquifyResultsStrings } from './equify_results_strings';
import { getEquifyWizardStepStrings } from './equify_wizard_steps';
import { getEquifyWizardCopy } from '../wizard/equify_wizard_copy';
import { useValuationI18n } from '../../valuation_i18n';

export function useEquifyStrings() {
  const { locale } = useValuationI18n();
  return useMemo(() => buildEquifyStrings(locale), [locale]);
}

export function buildEquifyStrings(locale: ValuationLocale) {
  return {
    locale,
    isHe: locale === 'he',
    shell: getEquifyWizardCopy(locale),
    steps: getEquifyWizardStepStrings(locale),
    results: getEquifyResultsStrings(locale),
  };
}
