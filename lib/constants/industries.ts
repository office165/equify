import type { ValuationLocale } from '../../api_client';

/** Stable English values persisted to API, database, and Monday.com. */
export const INDUSTRY_VALUES = [
  'Software/SaaS',
  'FinTech',
  'HealthTech',
  'Cybersecurity',
  'E-Commerce',
  'Hardware & IoT',
  'Biotech',
  'Professional Services',
  'Industrial',
  'Defense & Military',
  'Defense & Aerospace',
  'renewable_energy',
  'Other',
] as const;

export const RENEWABLE_ENERGY_INDUSTRY: IndustryValue = 'renewable_energy';

export type IndustryValue = (typeof INDUSTRY_VALUES)[number];

export const SAAS_INDUSTRY: IndustryValue = 'Software/SaaS';

const INDUSTRY_LABELS: Record<IndustryValue, { en: string; he: string }> = {
  'Software/SaaS': {
    en: 'Software/SaaS',
    he: 'הייטק / תוכנה ו-SaaS',
  },
  FinTech: {
    en: 'FinTech',
    he: 'פינטק וטכנולוגיה פיננסית',
  },
  HealthTech: {
    en: 'HealthTech',
    he: 'רפואה ומדעי החיים',
  },
  Cybersecurity: {
    en: 'Cybersecurity',
    he: 'סייבר ואבטחת מידע',
  },
  'E-Commerce': {
    en: 'E-Commerce',
    he: 'מסחר אלקטרוני / איקומרס',
  },
  'Hardware & IoT': {
    en: 'Hardware & IoT',
    he: 'חומרה ו-IoT',
  },
  Biotech: {
    en: 'Biotech',
    he: 'רפואה ומדעי החיים',
  },
  'Professional Services': {
    en: 'Professional Services',
    he: 'שירותים מקצועיים',
  },
  Industrial: {
    en: 'Industrial',
    he: 'תעשייה',
  },
  'Defense & Military': {
    en: 'Defense & Military',
    he: 'ביטחון וצבא',
  },
  'Defense & Aerospace': {
    en: 'Defense & Aerospace',
    he: 'ביטחון ותעופה',
  },
  renewable_energy: {
    en: 'Renewable Energy',
    he: 'אנרגיה מתחדשת',
  },
  Other: {
    en: 'Other',
    he: 'אחר',
  },
};

export function getIndustrySelectOptions(
  locale: ValuationLocale,
): { value: IndustryValue; label: string }[] {
  const lang = locale === 'he' ? 'he' : 'en';
  return INDUSTRY_VALUES.map((value) => ({
    value,
    label: INDUSTRY_LABELS[value][lang],
  }));
}

export function getIndustryLabel(
  industry: string,
  locale: ValuationLocale = 'en',
): string {
  const lang = locale === 'he' ? 'he' : 'en';
  const key = industry.trim() as IndustryValue;
  if (key in INDUSTRY_LABELS) {
    return INDUSTRY_LABELS[key][lang];
  }
  return industry.trim();
}
