'use client';

import { useMemo } from 'react';
import type { ValuationLocale } from '../../api_client';
import { getEquifyResultsStrings } from './equify_results_strings';
import { getEquifyWizardStepStrings } from './equify_wizard_steps';
import { getEquifyWizardCopy } from '../wizard/equify_wizard_copy';
import { useValuationI18n } from '../../valuation_i18n';
import { useSiteFlags } from '../../components/shared/SiteFlagsContext';
import { cleanMarksDeep } from '../copy/marks';

export function useEquifyStrings() {
  const { locale } = useValuationI18n();
  const { copyV2 } = useSiteFlags();
  return useMemo(() => buildEquifyStrings(locale, copyV2), [locale, copyV2]);
}

/** Round 10 (COPY_V2): the results page compares with public company multiples (Damodaran), not with M&A transactions. */
const RESULTS_V2 = {
  he: { multTitle: 'מיקום מול', multTitleHl: 'מכפילי השוק (Damodaran)' },
  en: { multTitle: 'Position vs', multTitleHl: 'market multiples (Damodaran)' },
} as const;

/** Round 10: with COPY_V2 on, the same strings without the forbidden marks and with the corrected claims (lib/copy/marks.ts). */
export function buildEquifyStrings(locale: ValuationLocale, copyV2 = false) {
  const lang = locale === 'he' ? 'he' : 'en';
  const fix = <T,>(v: T): T => (copyV2 ? cleanMarksDeep(v, lang) : v);
  return {
    locale,
    isHe: locale === 'he',
    shell: getEquifyWizardCopy(locale, copyV2),
    steps: fix(getEquifyWizardStepStrings(locale)),
    results: fix(copyV2 ? { ...getEquifyResultsStrings(locale), ...RESULTS_V2[lang] } : getEquifyResultsStrings(locale)),
  };
}
