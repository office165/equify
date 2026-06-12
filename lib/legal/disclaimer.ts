import type { ValuationLocale } from '../../api_client';
import { BRAND_NAME } from '../brand/brand-identity';

/** Full legal disclaimer — Hebrew (primary). */
export const LEGAL_DISCLAIMER_HE =
  `הבהרה משפטית: ${BRAND_NAME} — אינדיקציית שווי אלגוריתמית אוטומטית המבוססת על מודלים כלכליים ונתוני שוק מוערכים. אין לראות בתוצרי המערכת, בדוחות המופקים או בנתונים המוצגים משום ייעוץ פיננסי, ייעוץ השקעות, חוות דעת מוסמכת או תחליף להערכת שווי מקצועית פרטנית. כל תהליך קבלת החלטות המבוסס על המערכת מבוצע על אחריותו הבלעדית של המשתמש, והחברה או מפתחיה לא יישאו בכל אחריות לנזק ישיר או עקיף.`;

/** Full legal disclaimer — English fallback. */
export const LEGAL_DISCLAIMER_EN =
  `Legal Notice: ${BRAND_NAME} provides automated algorithmic valuation indicators based on economic models and estimated market data. Nothing in the system outputs, generated reports, or displayed data constitutes financial advice, investment advice, a certified opinion, or a substitute for professional individualized valuation. All decision-making based on the system is solely the user's responsibility, and the company and its developers shall not be liable for any direct or indirect damages.`;

/** Compact stamp for PDF page footers (hardcoded Hebrew in print theme). */
export const LEGAL_DISCLAIMER_COMPACT_HE =
  `הבהרה משפטית: ${BRAND_NAME} — אינדיקציית שווי אלגוריתמית בלבד. אין בדוח זה ייעוץ פיננסי/השקעות מוסמך. האחריות הבלעדית על המשתמש.`;

export const LEGAL_DISCLAIMER_COMPACT_EN =
  `Legal Notice: ${BRAND_NAME} — algorithmic valuation indication only. Not certified financial or investment advice. User bears sole responsibility.`;

export type LegalDisclaimerVariant = 'full' | 'compact';

export function getLegalDisclaimer(
  locale: ValuationLocale,
  variant: LegalDisclaimerVariant = 'full',
): string {
  const isHe = locale === 'he';
  if (variant === 'compact') {
    return isHe ? LEGAL_DISCLAIMER_COMPACT_HE : LEGAL_DISCLAIMER_COMPACT_EN;
  }
  return isHe ? LEGAL_DISCLAIMER_HE : LEGAL_DISCLAIMER_EN;
}
