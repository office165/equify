/**
 * Display-only mapping for Step1 progressive sector questions.
 * Does not touch calibration / INDUSTRY_CONFIG valuation fields.
 */

import type { EquifySectorKey } from '../valuation';
import {
  INDUSTRY_CONFIG,
  getSubSectorLabel,
} from '../constants/industry_config';

export type RevenueSourceKey =
  | 'physical_goods'
  | 'services'
  | 'software'
  | 'location';

export type CustomerTypeKey = 'b2b' | 'b2c' | 'both';

export interface FastPathOption<T extends string> {
  key: T;
  labelHe: string;
  labelEn: string;
}

export const REVENUE_SOURCE_OPTIONS: FastPathOption<RevenueSourceKey>[] = [
  {
    key: 'physical_goods',
    labelHe: 'מוצרים פיזיים / סחורה',
    labelEn: 'Physical products / goods',
  },
  {
    key: 'services',
    labelHe: 'שירותים מקצועיים',
    labelEn: 'Professional services',
  },
  {
    key: 'software',
    labelHe: 'תוכנה, מנוי או דיגיטל',
    labelEn: 'Software, subscription or digital',
  },
  {
    key: 'location',
    labelHe: 'מסעדה, מלון, נדל״ן או מיקום',
    labelEn: 'Restaurant, hotel, real estate or site',
  },
];

export const CUSTOMER_TYPE_OPTIONS: FastPathOption<CustomerTypeKey>[] = [
  { key: 'b2b', labelHe: 'עסקים (B2B)', labelEn: 'Businesses (B2B)' },
  { key: 'b2c', labelHe: 'צרכנים פרטיים (B2C)', labelEn: 'Consumers (B2C)' },
  { key: 'both', labelHe: 'גם וגם', labelEn: 'Both' },
];

export interface FastPathSuggestion {
  sector: EquifySectorKey;
  subSector: string;
  labelHe: string;
  labelEn: string;
  /** Static one-line reason - ties answers to the suggested combo. */
  reasonHe: string;
  reasonEn: string;
}

type ComboKey = `${RevenueSourceKey}:${CustomerTypeKey}`;

/** Curated 2–3 strong matches per answer pair. Empty = no confident match. */
const FAST_PATH_MAP: Record<ComboKey, Array<{
  sector: EquifySectorKey;
  subSector: string;
  reasonHe: string;
  reasonEn: string;
}>> = {
  'physical_goods:b2b': [
    {
      sector: 'industry',
      subSector: 'manufacturing',
      reasonHe: 'ייצור ומכירה לעסקים אחרים',
      reasonEn: 'Manufacturing sold to other businesses',
    },
    {
      sector: 'industry',
      subSector: 'distribution',
      reasonHe: 'הפצה ולוגיסטיקה ללקוחות עסקיים',
      reasonEn: 'Distribution and logistics for B2B clients',
    },
    {
      sector: 'industry',
      subSector: 'food_bev',
      reasonHe: 'מוצרי מזון למשקיעים עסקיים',
      reasonEn: 'Food products for business buyers',
    },
  ],
  'physical_goods:b2c': [
    {
      sector: 'retail_unified',
      subSector: 'specialty',
      reasonHe: 'חנות מתמחה לצרכן פרטי',
      reasonEn: 'Specialty store for consumers',
    },
    {
      sector: 'retail_unified',
      subSector: 'd2c',
      reasonHe: 'מכירה ישירה ללקוח הקצה',
      reasonEn: 'Direct-to-consumer product sales',
    },
    {
      sector: 'retail_unified',
      subSector: 'retail-fashion',
      reasonHe: 'אופנה ואקססוריז לצרכן',
      reasonEn: 'Fashion and accessories for consumers',
    },
  ],
  'physical_goods:both': [
    {
      sector: 'retail_unified',
      subSector: 'specialty',
      reasonHe: 'קמעונאות שמוכרת לעסקים ולפרטיים',
      reasonEn: 'Retail serving businesses and consumers',
    },
    {
      sector: 'retail_unified',
      subSector: 'd2c',
      reasonHe: 'מותג ישיר עם ערוץ מעורב',
      reasonEn: 'Direct brand with a mixed channel',
    },
    {
      sector: 'industry',
      subSector: 'distribution',
      reasonHe: 'הפצה לשוק מעורב',
      reasonEn: 'Distribution across a mixed market',
    },
  ],
  'services:b2b': [
    {
      sector: 'services',
      subSector: 'consulting',
      reasonHe: 'ייעוץ ושירותים לעסקים',
      reasonEn: 'Consulting services for businesses',
    },
    {
      sector: 'services',
      subSector: 'legal',
      reasonHe: 'שירותים משפטיים ללקוחות עסקיים',
      reasonEn: 'Legal services for business clients',
    },
    {
      sector: 'services',
      subSector: 'accounting',
      reasonHe: 'ראיית חשבון וליווי פיננסי לעסקים',
      reasonEn: 'Accounting for business clients',
    },
  ],
  'services:b2c': [
    {
      sector: 'services',
      subSector: 'marketing',
      reasonHe: 'שיווק ומדיה לקהל פרטי',
      reasonEn: 'Marketing and media for consumers',
    },
    {
      sector: 'health',
      subSector: 'services_health',
      reasonHe: 'שירותי בריאות ללקוחות פרטיים',
      reasonEn: 'Health services for private clients',
    },
    {
      sector: 'services',
      subSector: 'consulting',
      reasonHe: 'ייעוץ אישי או משפחתי',
      reasonEn: 'Personal or household consulting',
    },
  ],
  'services:both': [
    {
      sector: 'services',
      subSector: 'consulting',
      reasonHe: 'ייעוץ ללקוחות עסקיים ופרטיים',
      reasonEn: 'Consulting for mixed clientele',
    },
    {
      sector: 'services',
      subSector: 'marketing',
      reasonHe: 'סוכנות עם תמהיל לקוחות',
      reasonEn: 'Agency with a mixed client mix',
    },
    {
      sector: 'health',
      subSector: 'services_health',
      reasonHe: 'שירותי בריאות לעסקים ולפרטיים',
      reasonEn: 'Health services for B2B and B2C',
    },
  ],
  'software:b2b': [
    {
      sector: 'saas',
      subSector: 'b2b_saas',
      reasonHe: 'תוכנת מנוי לעסקים',
      reasonEn: 'Subscription software for businesses',
    },
    {
      sector: 'cyber',
      subSector: 'enterprise',
      reasonHe: 'אבטחת מידע לארגונים',
      reasonEn: 'Enterprise security software',
    },
    {
      sector: 'fintech',
      subSector: 'payments',
      reasonHe: 'תשלומים וסליקה לעסקים',
      reasonEn: 'Payments infrastructure for businesses',
    },
  ],
  'software:b2c': [
    {
      sector: 'saas',
      subSector: 'b2c_saas',
      reasonHe: 'אפליקציה או מנוי לצרכן',
      reasonEn: 'Consumer app or subscription',
    },
    {
      sector: 'saas',
      subSector: 'marketplace',
      reasonHe: 'פלטפורמה דיגיטלית לצרכנים',
      reasonEn: 'Digital marketplace for consumers',
    },
    {
      sector: 'fintech',
      subSector: 'wealth',
      reasonHe: 'ניהול כספים ללקוחות פרטיים',
      reasonEn: 'Wealth tools for private clients',
    },
  ],
  'software:both': [
    {
      sector: 'saas',
      subSector: 'b2b_saas',
      reasonHe: 'פלטפורמה דיגיטלית עם תמהיל לקוחות',
      reasonEn: 'Digital platform with mixed buyers',
    },
    {
      sector: 'saas',
      subSector: 'devtools',
      reasonHe: 'תשתיות תוכנה לצוותים ולשוק רחב',
      reasonEn: 'Dev tools spanning teams and market',
    },
    {
      sector: 'cyber',
      subSector: 'cloud',
      reasonHe: 'אבטחת ענן לקהלים מעורבים',
      reasonEn: 'Cloud security for mixed audiences',
    },
  ],
  'location:b2b': [
    {
      sector: 'real_estate',
      subSector: 're_income',
      reasonHe: 'נכס מניב או השכרה לעסקים',
      reasonEn: 'Income property or commercial leases',
    },
    {
      sector: 'real_estate',
      subSector: 'construction_contracting',
      reasonHe: 'קבלנות וביצוע לפרויקטים',
      reasonEn: 'Contracting for project clients',
    },
    {
      sector: 'hospitality',
      subSector: 'hotel_chain',
      reasonHe: 'אירוח עסקי או רשת מלונות',
      reasonEn: 'Business hospitality or hotel network',
    },
  ],
  'location:b2c': [
    {
      sector: 'food_service',
      subSector: 'restaurant',
      reasonHe: 'מסעדה או מקום אוכל לקהל',
      reasonEn: 'Restaurant serving the public',
    },
    {
      sector: 'hospitality',
      subSector: 'boutique_hotel',
      reasonHe: 'אירוח עם מספר חדרים מצומצם',
      reasonEn: 'Small-scale lodging for guests',
    },
    {
      sector: 'food_service',
      subSector: 'cafe',
      reasonHe: 'בית קפה במיקום קבוע',
      reasonEn: 'Cafe anchored to a location',
    },
  ],
  'location:both': [
    {
      sector: 'hospitality',
      subSector: 'vacation',
      reasonHe: 'נופש ואירועים לקהלים מעורבים',
      reasonEn: 'Vacation and events for mixed guests',
    },
    {
      sector: 'real_estate',
      subSector: 're_development',
      reasonHe: 'יזמות נדל״ן למגורים ומסחרי',
      reasonEn: 'Development for residential and commercial',
    },
    {
      sector: 'food_service',
      subSector: 'franchise',
      reasonHe: 'רשת מזון עם לקוחות מעורבים',
      reasonEn: 'Food franchise with mixed demand',
    },
  ],
};

function isValidCombo(
  sector: EquifySectorKey,
  subSector: string,
): boolean {
  return INDUSTRY_CONFIG[sector]?.subSectors.some((s) => s.id === subSector) ?? false;
}

export function resolveFastPathSuggestions(
  revenue: RevenueSourceKey,
  customer: CustomerTypeKey,
): FastPathSuggestion[] {
  const rows = FAST_PATH_MAP[`${revenue}:${customer}`] ?? [];
  const out: FastPathSuggestion[] = [];
  for (const row of rows) {
    if (!isValidCombo(row.sector, row.subSector)) continue;
    out.push({
      sector: row.sector,
      subSector: row.subSector,
      labelHe:
        getSubSectorLabel(row.sector, row.subSector, 'he') ?? row.subSector,
      labelEn:
        getSubSectorLabel(row.sector, row.subSector, 'en') ?? row.subSector,
      reasonHe: row.reasonHe,
      reasonEn: row.reasonEn,
    });
    if (out.length >= 3) break;
  }
  return out;
}

/** Unique sub-sector ids across INDUSTRY_CONFIG (marketplace etc. counted once). */
export function countUniqueSubSectors(): number {
  const ids = new Set<string>();
  for (const entry of Object.values(INDUSTRY_CONFIG)) {
    for (const sub of entry.subSectors) ids.add(sub.id);
  }
  return ids.size;
}
