import type { ValuationLocale } from '../../api_client';

/** Premium M&A / corporate valuation terminology (Big-4 deliverable tone). */
const COPY = {
  he: {
    /** Primary section eyebrow — king equity block (Big-4 deliverable tone) */
    conclusionEyebrow: 'אינדיקציית השווי המשוקללת',
    conclusionAria: 'אינדיקציית השווי המשוקללת — שווי מניות לבעלים',
    equityHeadlineSubtitle:
      'שורת מחיר אינדיקטיבית לבעלי המניות במכירה מלאה — לאחר כיסוי התחייבויות פיננסיות נטו, בהתאם למתודולוגיית שקלול תזרים ומכפילים.',
    weightedIndication: 'אינדיקציית השווי המשוקללת',
    weightedIndicationNote:
      'טווח השוואה מבוסס מכפילי עסקאות ותזרים מהוון — הקשר משלים לשורת המחיר, בהתאם לסטנדרט דוחות הערכת שווי.',
    waterfallSection: 'גשר שווי לבעלים',
    howWeArrived: 'מתודולוגיית הגעה לאינדיקציית השווי',
  },
  en: {
    conclusionEyebrow: 'Weighted valuation indication',
    conclusionAria: 'Weighted valuation indication — equity to owners',
    equityHeadlineSubtitle:
      'Indicative equity price line in a full sale, after net financial obligations, per DCF and multiples weighting.',
    weightedIndication: 'Weighted valuation indication',
    weightedIndicationNote:
      'Transaction-multiples and DCF comparison range — supplementary context per Big-4 valuation reporting standards.',
    waterfallSection: 'Equity value bridge',
    howWeArrived: 'Methodology to the weighted indication',
  },
} as const;

export type ValuationCopyKey = keyof (typeof COPY)['he'];

export function valuationCopy(
  locale: ValuationLocale,
  key: ValuationCopyKey,
): string {
  return COPY[locale === 'en' ? 'en' : 'he'][key];
}
