import type { ValuationLocale } from '../../api_client';
import type { EquifyGoalId } from './equify_goal';
import { isEquifyGoalId } from './equify_goal';

export interface GoalStandardCopy {
  /** Shown under Step 4 chips. */
  insight: string;
  /** PDF page-2 "סטנדרט השווי" paragraph (text only). */
  standardOfValue: string;
  /** Results-page SBC block. */
  sbcHeadline: string;
  sbcBody: string;
  /** WhatsApp ?text= prefill. */
  waText: string;
}

const HE: Record<EquifyGoalId, GoalStandardCopy> = {
  negotiation: {
    insight:
      'הדוח ייערך לפי סטנדרט Market Value. יודגשו מכפילי עסקאות שנסגרו בפועל והגורמים שרוכש אסטרטגי בוחן.',
    standardOfValue:
      'סטנדרט השווי: Market Value, בהתאם למטרת ההערכה שנבחרה (מכירה / M&A). הדוח מדגיש מכפילי עסקאות שנסגרו בפועל והגורמים שרוכש אסטרטגי בוחן. אינדיקציה אלגוריתמית בלבד, ואינה חוות דעת חתומה.',
    sbcHeadline: 'מתכננים מכירה?',
    sbcBody:
      'SBC מלווה עסקאות M&A בישראל. שיחת היכרות ללא התחייבות.',
    waText:
      'היי, סיימתי הערכת שווי ב-equify ואני בוחן מכירה. אשמח לשיחה.',
  },
  fundraise: {
    insight:
      'יודגשו תרחיש הצמיחה (Bull) והרגישות להנחות הצמיחה, שהם הציר המרכזי בשיחה מול משקיעים.',
    standardOfValue:
      'סטנדרט השווי: Investment Value לשיחת גיוס הון. הדוח מדגיש את תרחיש הצמיחה (Bull) ואת הרגישות להנחות הצמיחה. אינדיקציה אלגוריתמית בלבד, ואינה חוות דעת חתומה.',
    sbcHeadline: 'מתכננים גיוס?',
    sbcBody:
      'SBC מלווה סבבי גיוס והכנה למשקיעים. שיחת היכרות ללא התחייבות.',
    waText:
      'היי, סיימתי הערכת שווי ב-equify לקראת גיוס הון. אשמח לשיחה.',
  },
  partner: {
    insight:
      'יודגש פירוק השווי לרכיבים שניתן להסכים עליהם בין שותפים: תזרים, סיכון ומשקלול המודלים.',
    standardOfValue:
      'סטנדרט השווי: Fair Value לשימוש בשותפות. הדוח מדגיש את הרכב השווי ואת הנחות הסיכון כבסיס לשיחה בין שותפים. אינדיקציה אלגוריתמית בלבד, ואינה חוות דעת חתומה.',
    sbcHeadline: 'בוחנים שותפות?',
    sbcBody:
      'SBC מלווה הסכמי שותפים וחלוקת הון. שיחת היכרות ללא התחייבות.',
    waText:
      'היי, סיימתי הערכת שווי ב-equify לקראת שותפות. אשמח לשיחה.',
  },
  bank: {
    insight:
      'יודגשו יציבות התזרים והרכב הנכסים, שהם מה שגוף מלווה בוחן.',
    standardOfValue:
      'סטנדרט השווי: Collateral / Going-Concern Value למימון בנקאי. הדוח מדגיש יציבות תזרים והרכב נכסים. אינדיקציה אלגוריתמית בלבד, ואינה חוות דעת חתומה.',
    sbcHeadline: 'פונים למימון?',
    sbcBody:
      'SBC מלווה הכנת תיק לגוף מלווה. שיחת היכרות ללא התחייבות.',
    waText:
      'היי, סיימתי הערכת שווי ב-equify לקראת מימון בנקאי. אשמח לשיחה.',
  },
  internal: {
    insight:
      'יודגש השווי ככלי תכנון פנימי: נקודת בסיס, טווח תרחישים והנחות שאפשר לעדכן לאורך זמן.',
    standardOfValue:
      'סטנדרט השווי: Managerial Value לשימוש פנימי. הדוח משמש נקודת בסיס לתכנון ולמעקב, עם טווח תרחישים והנחות מתועדות. אינדיקציה אלגוריתמית בלבד, ואינה חוות דעת חתומה.',
    sbcHeadline: 'צריכים ליווי אסטרטגי?',
    sbcBody:
      'SBC מלווה תכנון אסטרטגי ודיווח לדירקטוריון. שיחת היכרות ללא התחייבות.',
    waText:
      'היי, סיימתי הערכת שווי ב-equify לשימוש פנימי. אשמח לשיחה.',
  },
  legal: {
    insight:
      'יודגשו תיעוד ההנחות והגנתיות המתודולוגיה. שים לב: הדוח אינו חוות דעת חתומה.',
    standardOfValue:
      'סטנדרט השווי: Fair Value לתיעוד בהליך משפטי / ירושה. הדוח מדגיש תיעוד הנחות והגנתיות מתודולוגית. שים לב: הדוח אינו חוות דעת חתומה ואינו מיועד לבית משפט או לרשות המסים.',
    sbcHeadline: 'צריכים חוות דעת חתומה?',
    sbcBody:
      'הדוח האלגוריתמי אינו תחליף לחוות דעת. SBC יכולה להפנות להערכה מקצועית. שיחת היכרות ללא התחייבות.',
    waText:
      'היי, סיימתי הערכת שווי ב-equify בהקשר משפטי / ירושה. אשמח לשיחה.',
  },
};

const EN: Record<EquifyGoalId, GoalStandardCopy> = {
  negotiation: {
    insight:
      'The report uses a Market Value standard. Closed-deal multiples and what a strategic buyer examines are emphasized.',
    standardOfValue:
      'Standard of value: Market Value, per the selected purpose (sale / M&A). The report emphasizes closed-deal multiples and factors a strategic buyer examines. Algorithmic indication only, not a signed opinion.',
    sbcHeadline: 'Planning a sale?',
    sbcBody:
      'SBC advises Israeli M&A transactions. Introductory call, no commitment.',
    waText:
      'Hi, I finished an equify valuation and I am considering a sale. I would like a call.',
  },
  fundraise: {
    insight:
      'The growth (Bull) scenario and sensitivity to growth assumptions are emphasized: the core of an investor conversation.',
    standardOfValue:
      'Standard of value: Investment Value for a capital raise. The report emphasizes the Bull growth path and sensitivity to growth assumptions. Algorithmic indication only, not a signed opinion.',
    sbcHeadline: 'Raising capital?',
    sbcBody:
      'SBC supports fundraising preparation. Introductory call, no commitment.',
    waText:
      'Hi, I finished an equify valuation ahead of a capital raise. I would like a call.',
  },
  partner: {
    insight:
      'Value is broken into components partners can agree on: cash flow, risk, and model weights.',
    standardOfValue:
      'Standard of value: Fair Value for a partnership discussion. The report emphasizes value composition and risk assumptions. Algorithmic indication only, not a signed opinion.',
    sbcHeadline: 'Considering a partnership?',
    sbcBody:
      'SBC advises partner agreements and equity splits. Introductory call, no commitment.',
    waText:
      'Hi, I finished an equify valuation ahead of a partnership. I would like a call.',
  },
  bank: {
    insight:
      'Cash-flow stability and asset mix are emphasized: what a lender examines.',
    standardOfValue:
      'Standard of value: Collateral / Going-Concern Value for bank financing. The report emphasizes cash-flow stability and asset mix. Algorithmic indication only, not a signed opinion.',
    sbcHeadline: 'Seeking financing?',
    sbcBody:
      'SBC helps prepare a lender package. Introductory call, no commitment.',
    waText:
      'Hi, I finished an equify valuation ahead of bank financing. I would like a call.',
  },
  internal: {
    insight:
      'Value is framed as an internal planning tool: a baseline, scenario range, and assumptions you can update over time.',
    standardOfValue:
      'Standard of value: Managerial Value for internal use. The report is a planning baseline with documented scenarios and assumptions. Algorithmic indication only, not a signed opinion.',
    sbcHeadline: 'Need strategic support?',
    sbcBody:
      'SBC supports internal planning and board reporting. Introductory call, no commitment.',
    waText:
      'Hi, I finished an equify valuation for internal use. I would like a call.',
  },
  legal: {
    insight:
      'Assumption documentation and methodological defensibility are emphasized. Note: this is not a signed opinion.',
    standardOfValue:
      'Standard of value: Fair Value for a legal / inheritance record. The report emphasizes documented assumptions and methodological defensibility. Note: this is not a signed opinion and is not intended for court or tax authority use.',
    sbcHeadline: 'Need a signed opinion?',
    sbcBody:
      'The algorithmic report is not a substitute. SBC can refer you to a professional valuation. Introductory call, no commitment.',
    waText:
      'Hi, I finished an equify valuation in a legal / inheritance context. I would like a call.',
  },
};

export function getGoalStandardCopy(
  goal: string | undefined,
  locale: ValuationLocale = 'he',
): GoalStandardCopy | null {
  if (!isEquifyGoalId(goal)) return null;
  return locale === 'en' ? EN[goal] : HE[goal];
}
