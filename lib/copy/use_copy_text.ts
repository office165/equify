'use client';

import { useCallback } from 'react';
import { useSiteFlags } from '../../components/shared/SiteFlagsContext';
import { cleanMarks } from './marks';

/**
 * Round 10: `tx(text)` is the text as it was while COPY_V2 is off, and the text without the forbidden marks when it is on.
 * `v2(before, after)` picks the corrected wording of a claim when COPY_V2 is on.
 */
export function useCopyText(locale: 'he' | 'en' = 'he') {
  const { copyV2 } = useSiteFlags();
  const tx = useCallback((s: string) => (copyV2 ? cleanMarks(s, locale) : s), [copyV2, locale]);
  const v2 = useCallback(<T,>(before: T, after: T): T => (copyV2 ? after : before), [copyV2]);
  return { copyV2, tx, v2 };
}
