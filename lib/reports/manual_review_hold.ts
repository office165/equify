/**
 * Methodology 2 (round 2, part C): a report that needs a manual review is not sent to the
 * customer automatically. The office gets an internal alert, and the customer gets a short
 * message that the report is being reviewed (transactional, no attachment, no value).
 * Off unless METHOD_V2=on (ValuationData.manualReview is only set by methodology 2).
 */
import type { ValuationLocale } from '../../api_client';
import { sendOfficeAlert } from '../alerts/office_alert';
import type { ManualReview, ManualReviewReason } from '../valuation/method_v2';

const REASON_HE: Record<ManualReviewReason, string> = {
  'debt-exceeds-ev': 'החוב נטו גבוה משווי הפעילות',
  'equity-zero': 'השווי לבעלים יצא 0',
  'equity-below-5pct-revenue': 'השווי לבעלים נמוך מ 5% מההכנסות, בחברה עם הכנסות מעל 2M',
};

export function manualReviewReasonsHe(review: ManualReview): string[] {
  return review.reasons.map((r) => REASON_HE[r]);
}

/** Internal alert. Contains the report id and the reasons, no customer contact details. */
export function alertOfficeManualReview(params: { reportId: string; review: ManualReview }): void {
  sendOfficeAlert({
    kind: 'method_v2_manual_review',
    subject: `דוח ${params.reportId} ממתין לבדיקה ידנית ולא נשלח ללקוח`,
    lines: [
      `דוח ${params.reportId} נעצר לפני שליחה אוטומטית (מתודולוגיה 2).`,
      ...manualReviewReasonsHe(params.review).map((r) => `סיבה: ${r}.`),
      params.review.detail,
      'הדוח הופק ונשמר בארכיון. אחרי בדיקה, שולחים אותו ללקוח ידנית.',
    ],
  });
}

export function buildManualReviewNotice(params: {
  locale: ValuationLocale;
  recipientName?: string;
  companyName: string;
}): { subject: string; text: string; html: string } {
  const en = params.locale === 'en';
  const hello = params.recipientName?.trim()
    ? en
      ? `Hello ${params.recipientName.trim()},`
      : `שלום ${params.recipientName.trim()},`
    : en
      ? 'Hello,'
      : 'שלום,';
  const lines = en
    ? [
        hello,
        `Thank you for ordering a valuation report for ${params.companyName}.`,
        'Before we send it, a member of our team is reviewing the report, as we do for some of the cases.',
        'We will send the report to this address after the review. There is nothing you need to do.',
        'Equify by SBC',
      ]
    : [
        hello,
        `תודה שהזמנת דוח הערכת שווי עבור ${params.companyName}.`,
        'לפני השליחה, איש צוות שלנו עובר על הדוח, כמו שאנחנו עושים בחלק מהתיקים.',
        'נשלח את הדוח לכתובת הזאת אחרי הבדיקה. אין צורך לעשות דבר.',
        'אקוויפי של SBC',
      ];
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return {
    subject: en ? 'Your valuation report is being reviewed' : 'דוח הערכת השווי שלך בבדיקה',
    text: lines.join('\n\n'),
    html: `<div dir="${en ? 'ltr' : 'rtl'}" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6">${lines
      .map((l) => `<p style="margin:0 0 12px">${escape(l)}</p>`)
      .join('')}</div>`,
  };
}
