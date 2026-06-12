export interface CountryOption {
  value: string;
  labelEn: string;
  labelHe: string;
}

/** ISO 3166-1 alpha-2 — Israel first for local default UX. */
export const INCORPORATION_COUNTRIES: readonly CountryOption[] = [
  { value: 'IL', labelEn: 'Israel', labelHe: 'ישראל' },
  { value: 'US', labelEn: 'United States', labelHe: 'ארצות הברית' },
  { value: 'GB', labelEn: 'United Kingdom', labelHe: 'בריטניה' },
  { value: 'DE', labelEn: 'Germany', labelHe: 'גרמניה' },
  { value: 'FR', labelEn: 'France', labelHe: 'צרפת' },
  { value: 'CA', labelEn: 'Canada', labelHe: 'קנדה' },
  { value: 'AU', labelEn: 'Australia', labelHe: 'אוסטרליה' },
  { value: 'CH', labelEn: 'Switzerland', labelHe: 'שווייץ' },
  { value: 'NL', labelEn: 'Netherlands', labelHe: 'הולנד' },
  { value: 'BE', labelEn: 'Belgium', labelHe: 'בלגיה' },
  { value: 'AT', labelEn: 'Austria', labelHe: 'אוסטריה' },
  { value: 'IT', labelEn: 'Italy', labelHe: 'איטליה' },
  { value: 'ES', labelEn: 'Spain', labelHe: 'ספרד' },
  { value: 'SE', labelEn: 'Sweden', labelHe: 'שוודיה' },
  { value: 'NO', labelEn: 'Norway', labelHe: 'נורווגיה' },
  { value: 'DK', labelEn: 'Denmark', labelHe: 'דנמרק' },
  { value: 'FI', labelEn: 'Finland', labelHe: 'פינלנד' },
  { value: 'IE', labelEn: 'Ireland', labelHe: 'אירלנד' },
  { value: 'SG', labelEn: 'Singapore', labelHe: 'סינגפור' },
  { value: 'HK', labelEn: 'Hong Kong', labelHe: 'הונג קונג' },
  { value: 'AE', labelEn: 'United Arab Emirates', labelHe: 'איחוד האמירויות' },
  { value: 'IN', labelEn: 'India', labelHe: 'הודו' },
  { value: 'CN', labelEn: 'China', labelHe: 'סין' },
  { value: 'JP', labelEn: 'Japan', labelHe: 'יפן' },
  { value: 'BR', labelEn: 'Brazil', labelHe: 'ברזיל' },
  { value: 'MX', labelEn: 'Mexico', labelHe: 'מקסיקו' },
  { value: 'ZA', labelEn: 'South Africa', labelHe: 'דרום אפריקה' },
  { value: 'CY', labelEn: 'Cyprus', labelHe: 'קפריסין' },
  { value: 'LU', labelEn: 'Luxembourg', labelHe: 'לוקסמבורג' },
  { value: 'OTHER', labelEn: 'Other', labelHe: 'אחר' },
] as const;

export const DEFAULT_INCORPORATION_COUNTRY = 'IL';

export function getIncorporationCountryOptions(
  locale: 'he' | 'en',
): { value: string; label: string }[] {
  return INCORPORATION_COUNTRIES.map((country) => ({
    value: country.value,
    label: locale === 'he' ? country.labelHe : country.labelEn,
  }));
}
