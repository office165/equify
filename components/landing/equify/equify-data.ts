/** Static landing copy — institutional advisory tone */

import {
  FINANCIAL_DATA_COPY,
  FINANCIAL_DATA_COPY_EN,
  multiplesMethodologyCopy,
  QUALITY_METHODOLOGY_COPY,
  QUALITY_METHODOLOGY_COPY_EN,
  SCENARIOS_SENSITIVITY_METHODOLOGY_COPY,
  VALUATION_METHODOLOGY_COPY,
  WACC_DCF_METHODOLOGY_COPY,
  WACC_DCF_METHODOLOGY_COPY_EN,
} from '../../../lib/i18n/equify_report_copy';

export {
  FINANCIAL_DATA_COPY,
  FINANCIAL_DATA_COPY_EN,
  multiplesMethodologyCopy,
  QUALITY_METHODOLOGY_COPY,
  SCENARIOS_SENSITIVITY_METHODOLOGY_COPY,
  VALUATION_METHODOLOGY_COPY,
  WACC_DCF_METHODOLOGY_COPY,
  WACC_DCF_METHODOLOGY_COPY_EN,
} from '../../../lib/i18n/equify_report_copy';

export const MARQUEE_ITEMS = [
  'DCF + WACC',
  'מכפיל EBITDA',
  'מכפיל הכנסות',
  'פרמיית סיכון מדינה (Damodaran)',
  'תרחישי Bear / Base / Bull',
  'עסקאות M&A ישראל 2023–2026',
  'Quality Score',
  'שווי משולב',
] as const;

export const LANDING_MODELS = [
  {
    title: 'DCF + WACC',
    body: 'תזרימי מזומנים מהוונים (FCFF) בעלות הון בר-סיכון. WACC לפי CAPM ותורת Damodaran; ערך טרמינלי בצמיחה ניטרלית 2.5%.',
  },
  {
    title: 'מכפיל EBITDA',
    body: 'מעוגן ב-12 עסקאות M&A בישראל (2023–2026): סכום, תאריך, שיעור EBITDA, והשוואה לחברות ציבוריות בחו״ל. המכפיל שלך הוא מיקום בהתפלגות שוק אמיתית.',
  },
  {
    title: 'מכפיל הכנסות',
    body: 'לעסקים בצמיחה או לפני רווחיות תפעולית. מותאם לשלב חיים ולענף.',
  },
  {
    title: 'שווי נכסי',
    body: 'רצפת שווי על בסיס נכסים מוחשיים, מלאי והון חוזר. משמש כגבול תחתון במשקלול.',
  },
  {
    title: 'Quality Score',
    body: QUALITY_METHODOLOGY_COPY,
  },
  {
    title: 'Bear / Base / Bull',
    body: SCENARIOS_SENSITIVITY_METHODOLOGY_COPY,
  },
] as const;

export const LANDING_FAQ = [
  {
    q: 'מתודולוגיית השקלול',
    a: 'DCF, מכפיל EBITDA ומכפיל הכנסות משולבים לממוצע משוקלל אחד; ציון האיכות מכייל את פרמיית הסיכון. התוצאה היא אינדיקציית שווי יחידה לשימוש במשא ומתן, לא שלוש הערכות נפרדות.',
  },
  {
    q: 'זמן השלמה',
    a: '10 דקות בממוצע. האשף כולל ארבעה שלבי קלט; ניתן לעצור ולחזור. הדוח PDF מופק בסיום.',
  },
  {
    q: 'תוקף משפטי ורגולטורי',
    a: 'הדוח הוא אינדיקציית שווי אלגוריתמית. מתאים למשא ומתן, גיוס הון ותכנון פנימי. אינו חוות דעת חשבונאית חתומה ואינו מיועד לבית משפט או לרשות המסים.',
  },
  {
    q: 'נתוני קלט נדרשים',
    a: 'הכנסות שנתיות, EBITDA (או רווח תפעולי מנורמל), חוב ברוטו, מזומן ותחזית צמיחה. ניתן להזין הערכות סבירות כשאין דוח מבוקר.',
  },
  {
    q: 'אבטחת מידע',
    a: 'הנתונים מוצפנים בתעבורה ובאחסון. אין מכירה לצד שלישי. גישה לדוח מוגבלת למשתמש שהזין את הנתונים.',
  },
  {
    q: 'DCF לעומת מכפילי שוק',
    a: 'DCF מהוון תזרימים לפי WACC. מכפילים מכוילים מול 12 עסקאות M&A בישראל. ציון איכות מכייל את הסיכון. השקלול: 50% DCF, 30% EBITDA, 20% הכנסות.',
  },
] as const;

export const LANDING_STEPS = [
  ['01', 'פרופיל וזיהוי', 'שם, חברה, ח.פ., פרטי קשר. מגדיר את זהות הדוח ואת מטרת השימוש.', '~2 דקות'],
  ['02', 'נתונים פיננסיים', 'הכנסות, EBITDA, חוב נטו ותחזית. בסיס ל-DCF ולמכפילים.', '~4 דקות'],
  ['03', 'סיכון ואיכות', 'שבעה גורמים משוקללים: יציבות תזרים, גיוון לקוחות, תלות במנהיגות, תחרות, IP, חוזים וצמיחה.', '~3 דקות'],
  ['04', 'מטרה והפקה', 'בחירת מטרת ההערכה, אישור תנאים, הפקת PDF.', '~1 דקה'],
] as const;

export const PRICING_FEATURES = [
  'DCF + WACC (Damodaran CRP) ומכפילי שוק ישראליים',
  'שווי משולב עם מטריצות רגישות WACC ו-EBITDA',
  'דוח PDF מובנה בן 8 עמודים',
  'תרחישי Bear / Base / Bull',
] as const;

/**
 * Round 10 (COPY_V2): the same sections with the claims corrected (reports/round-10.md has the table: before, after and why).
 * No 12 M&A deals (the multiples are Damodaran's, of public companies), no fixed 50/30/20 weights (they depend on the sector,
 * the life stage and the size), no asset based method (the engine has none), and none of the forbidden marks.
 */
export const MARQUEE_ITEMS_V2 = [
  'DCF + WACC',
  'מכפיל EBITDA',
  'מכפיל הכנסות',
  'פרמיית סיכון מדינה (Damodaran)',
  'תרחישי Bear / Base / Bull',
  'מכפילי Damodaran',
  'Quality Score',
  'שווי משולב',
] as const;

export const LANDING_MODELS_V2 = [
  {
    title: 'DCF + WACC',
    body: 'תזרימי מזומנים מהוונים (FCFF) לפי עלות הון מותאמת סיכון. WACC לפי CAPM ונתוני Damodaran, וערך טרמינלי בצמיחה של 2.5%.',
  },
  {
    title: 'מכפיל EBITDA',
    body: 'מכפילי הענף לפי נתוני Damodaran של חברות ציבוריות, עם הנחת סחירות וגודל לחברה פרטית. המכפיל שלך נקבע לפי ציון האיכות.',
  },
  {
    title: 'מכפיל הכנסות',
    body: 'לעסקים בצמיחה או לפני רווחיות תפעולית. מותאם לשלב חיים ולענף.',
  },
  {
    title: 'Quality Score',
    body: QUALITY_METHODOLOGY_COPY,
  },
  {
    title: 'Bear / Base / Bull',
    body: SCENARIOS_SENSITIVITY_METHODOLOGY_COPY,
  },
] as const;

export const LANDING_FAQ_V2 = [
  {
    q: 'מתודולוגיית השקלול',
    a: 'DCF, מכפיל EBITDA ומכפיל הכנסות משולבים לממוצע משוקלל אחד, וציון האיכות מכייל את פרמיית הסיכון. התוצאה היא אינדיקציית שווי אחת לשימוש במשא ומתן, לא שלוש הערכות נפרדות.',
  },
  {
    q: 'זמן השלמה',
    a: 'כ 10 דקות. האשף כולל ארבעה שלבי קלט, ואפשר לעצור ולחזור. דוח ה PDF מופק בסיום.',
  },
  {
    q: 'תוקף משפטי ורגולטורי',
    a: 'הדוח הוא אינדיקציית שווי אלגוריתמית. מתאים למשא ומתן, לגיוס הון ולתכנון פנימי. אינו חוות דעת חשבונאית חתומה ואינו מיועד לבית משפט או לרשות המסים.',
  },
  {
    q: 'נתוני קלט נדרשים',
    a: 'הכנסות שנתיות, EBITDA (או רווח תפעולי מנורמל), חוב ברוטו, מזומן ותחזית צמיחה. אפשר להזין הערכות סבירות כשאין דוח מבוקר.',
  },
  {
    q: 'אבטחת מידע',
    a: 'הנתונים עוברים בחיבור מוצפן (HTTPS) ונשמרים אצל ספקי ענן. הפרטים משמשים את SBC כדי ליצור קשר בנוגע לדוח ולשירותים קשורים. מה נאסף, אצל מי ולכמה זמן: במדיניות הפרטיות.',
  },
  {
    q: 'DCF לעומת מכפילי שוק',
    a: 'DCF מהוון תזרימים לפי WACC. המכפילים לפי Damodaran. ציון האיכות מכייל את הסיכון. המשקל של כל שיטה תלוי בענף, בשלב החיים ובגודל העסק.',
  },
] as const;

export const LANDING_STEPS_V2 = [
  ['01', 'פרופיל וזיהוי', 'שם, חברה, ח.פ. (לא חובה) ופרטי קשר. מגדיר את זהות הדוח.', 'כ 2 דקות'],
  ['02', 'נתונים פיננסיים', 'הכנסות, EBITDA, חוב נטו ותחזית. הבסיס ל DCF ולמכפילים.', 'כ 4 דקות'],
  ['03', 'סיכון ואיכות', 'שבעה גורמים: הכנסות חוזרות, ריכוזיות לקוחות, תלות במייסד, תחרות, קניין רוחני, חוזים ויתרון תחרותי.', 'כ 3 דקות'],
  ['04', 'מטרה והפקה', 'בחירת מטרת ההערכה, אישור תנאים והפקת PDF.', 'כ 1 דקה'],
] as const;

export const PRICING_FEATURES_V2 = [
  'DCF + WACC (Damodaran CRP) ומכפילי שוק (Damodaran)',
  'שווי משולב עם מטריצות רגישות של WACC ו EBITDA',
  'דוח PDF מובנה בן 8 עמודים',
  'תרחישי Bear / Base / Bull',
] as const;
