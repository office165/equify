import type { ValuationLocale } from '../../api_client';

export const COMPANY_NAME_FALLBACK_HE = 'שם החברה שלך';
export const COMPANY_NAME_FALLBACK_EN = 'Your Company Name';

/** Display / PDF company name — never empty; locale-aware fallback when blank. */
export function resolveDisplayCompanyName(
  companyName: string | null | undefined,
  locale: ValuationLocale,
): string {
  const trimmed = companyName?.trim();
  if (trimmed) return trimmed;
  return locale === 'he' ? COMPANY_NAME_FALLBACK_HE : COMPANY_NAME_FALLBACK_EN;
}
