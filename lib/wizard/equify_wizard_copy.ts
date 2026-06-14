import type { ValuationLocale } from '../../api_client';
import type { TranslationKey } from '../../valuation_i18n';

/** Hardcoded fallbacks — wizard never collapses if i18n key is missing */
export const EQUIFY_WIZARD_COPY_HE = {
  step1Eyebrow: 'שלב 1 · פרופיל החברה',
  step1Title: 'ספר לנו על העסק שלך.',
  step1TitleHl: 'העסק שלך.',
  step1Sub: 'הפרטים מגדירים את ההקשר המשפטי והעסקי של הדוח.',
  fullName: 'שם מלא',
  email: 'אימייל',
  phone: 'טלפון / WhatsApp',
  companyName: 'שם חברה',
  corporateId: 'ח.פ / ת.ז',
  foundedYear: 'שנת הקמה',
  sector: 'ענף פעילות',
  lifecycle: 'שלב מחזור חיים',
  logo: 'לוגו חברה (אופציונלי)',
  step2Eyebrow: 'שלב 2 · נתונים פיננסיים',
  step2TitleBefore: 'המספרים שמפעילים',
  step2TitleHl: 'את המודל.',
  step3Eyebrow: 'שלב 3 · סיכון ורגישות',
  step4Eyebrow: 'שלב 4 · מטרת ההערכה',
  purposeNegotiation: 'משא ומתן אסטרטגי',
  equityValueLabel: 'שווי לבעלים (Equity Value)',
  reportBottomLine: 'השורה התחתונה — קודם.',
  reportDcfHeadline: 'מבט קדימה: DCF.',
  reportMarketHeadline: 'מבט הצידה: השוק.',
  purposeLabel: 'מטרת ההערכה: משא ומתן אסטרטגי',
  companyPlaceholder: 'שם החברה שלך',
  stepNavLabel: 'שלבי האשף',
  stepBadge: 'שלב',
  stepOf: '/ 4',
  backBtn: 'חזרה',
  ownerValue: 'שווי לבעלים',
  liveUpdating: 'תרחיש בסיס · מתעדכן בזמן אמת',
  dcfWeight: 'DCF (50%)',
  ebitdaWeight: 'EBITDA ×(30%)',
  revWeight: 'הכנסות ×(20%)',
  enterpriseValue: 'שווי פעילות',
  homeAria: 'equify BY SBC — דף הבית',
  pdfDownload: 'הורד PDF נקי ↓',
  pdfGenerating: 'מפיק PDF...',
  pdfFailed: 'יצירת PDF נכשלה. נסה שוב.',
  reportPagesNav: 'עמודי הדוח',
  valuationReportEyebrow: 'דוח הערכת שווי ·',
  scrollHint: 'לקריאת הדוח',
  noResults: 'לא נמצאו תוצאות הערכה. הרץ הערכה חדשה מהאשף.',
  backToWizard: 'חזרה לאשף ההערכה',
  durationBadge: '10 דק׳',
  durationLong: '10 דקות',
  langToggleAria: 'בחירת שפה',
} as const;

export const EQUIFY_WIZARD_COPY_EN: Record<keyof typeof EQUIFY_WIZARD_COPY_HE, string> = {
  step1Eyebrow: 'Step 1 · Company profile',
  step1Title: 'Tell us about your business.',
  step1TitleHl: 'your business.',
  step1Sub: 'These details anchor the legal and commercial context of the report.',
  fullName: 'Full name',
  email: 'Email',
  phone: 'Phone / WhatsApp',
  companyName: 'Company name',
  corporateId: 'Company / ID no.',
  foundedYear: 'Founded year',
  sector: 'Industry sector',
  lifecycle: 'Lifecycle stage',
  logo: 'Company logo (optional)',
  step2Eyebrow: 'Step 2 · Financial data',
  step2TitleBefore: 'The numbers that drive',
  step2TitleHl: 'the model.',
  step3Eyebrow: 'Step 3 · Risk & sensitivity',
  step4Eyebrow: 'Step 4 · Valuation purpose',
  purposeNegotiation: 'Strategic negotiation',
  equityValueLabel: 'Equity Value',
  reportBottomLine: 'The bottom line — first.',
  reportDcfHeadline: 'Looking ahead: DCF.',
  reportMarketHeadline: 'A sideways view: the market.',
  purposeLabel: 'Valuation purpose: strategic negotiation',
  companyPlaceholder: 'Your Company Name',
  stepNavLabel: 'Wizard steps',
  stepBadge: 'Step',
  stepOf: '/ 4',
  backBtn: 'Back',
  ownerValue: 'Equity value',
  liveUpdating: 'Base case · live',
  dcfWeight: 'DCF (50%)',
  ebitdaWeight: 'EBITDA ×(30%)',
  revWeight: 'Revenue ×(20%)',
  enterpriseValue: 'Enterprise value',
  homeAria: 'equify BY SBC — home',
  pdfDownload: 'Download clean PDF ↓',
  pdfGenerating: 'Generating PDF...',
  pdfFailed: 'PDF generation failed. Please try again.',
  reportPagesNav: 'Report sections',
  valuationReportEyebrow: 'Valuation report ·',
  scrollHint: 'Scroll to read',
  noResults: 'No valuation results found. Run a new valuation from the wizard.',
  backToWizard: 'Back to valuation wizard',
  durationBadge: '10 min',
  durationLong: '10 minutes',
  langToggleAria: 'Language selection',
};

export type EquifyWizardCopyKey = keyof typeof EQUIFY_WIZARD_COPY_HE;

export function getEquifyWizardCopy(
  locale: ValuationLocale,
): Record<EquifyWizardCopyKey, string> {
  return locale === 'he' ? EQUIFY_WIZARD_COPY_HE : EQUIFY_WIZARD_COPY_EN;
}

export const EQUIFY_WIZARD_STEPS_HE = [
  { num: '01', label: 'פרופיל החברה', desc: 'פרטים משפטיים ועסקיים' },
  { num: '02', label: 'נתונים פיננסיים', desc: 'הכנסות, EBITDA, תחזית' },
  { num: '03', label: 'סיכון ורגישות', desc: 'מאפייני עסק ואיכות' },
  { num: '04', label: 'מטרת ההערכה', desc: 'הפקת דוח PDF' },
] as const;

export const EQUIFY_WIZARD_STEPS_EN = [
  { num: '01', label: 'Company profile', desc: 'Legal & commercial details' },
  { num: '02', label: 'Financial data', desc: 'Revenue, EBITDA, forecast' },
  { num: '03', label: 'Risk & sensitivity', desc: 'Business quality drivers' },
  { num: '04', label: 'Valuation purpose', desc: 'PDF report output' },
] as const;

export function getEquifyWizardSteps(locale: ValuationLocale) {
  return locale === 'he' ? EQUIFY_WIZARD_STEPS_HE : EQUIFY_WIZARD_STEPS_EN;
}

/** Resolve i18n key with equify wizard fallback */
export function equifyWizardT(
  t: (key: TranslationKey) => string,
  key: TranslationKey,
  fallbackKey: EquifyWizardCopyKey,
  locale: ValuationLocale,
): string {
  const resolved = t(key);
  if (resolved && resolved !== key) return resolved;
  return getEquifyWizardCopy(locale)[fallbackKey];
}
