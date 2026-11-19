import type { SiteLanguage } from './types';
import { landingCopy } from '../../../components/landing/equify/use_landing_copy';
import { VALUATION_METHODOLOGY_COPY } from '../../../components/landing/equify/equify-data';

/**
 * Round 13: Hebrew, the default language (no prefix, RTL). Every word is today's (components/landing/equify/*): with COPY_V2 off the
 * text as it is on the site, with it on the corrected text of round 10. The landing lists come from equify-data.ts, as before.
 */
const he: SiteLanguage = {
  def: { code: 'he', name: 'עברית', dir: 'rtl', hreflang: 'he', ogLocale: 'he_IL', appLocale: 'he', price: { amount: 999, currency: 'ILS', display: '₪999' } },
  lists: (copyV2) => landingCopy(copyV2),
  dict: (v2) => ({
    skip: 'דלג לתוכן הראשי',
    homeAria: 'equify BY SBC, דף הבית',
    nav: [
      ['#how', 'איך זה עובד'],
      ['#calc', 'סימולטור שווי'],
      ['#models', 'המודלים'],
      ['#price', 'תמחור'],
      ['#faq', 'שאלות'],
    ],
    cta: 'התחל הערכה',
    hero: {
      label: v2 ? 'equify BY SBC, שוק ישראל 2026' : 'equify BY SBC · שוק ישראל 2026',
      h1a: 'שווי העסק שלך.',
      h1b: 'בנתונים.',
      sub: v2
        ? 'הדוח משלב DCF, מכפילי שוק לפי Damodaran וציון איכות. השווי המוצג הוא ממוצע משוקלל, והמשקל של כל שיטה תלוי בענף, בשלב החיים ובגודל העסק.'
        : 'הדוח משלב DCF, מכפילי שוק מכוילים וציון איכות. השווי המוצג הוא ממוצע משוקלל שמשקף את מעשי השוק, לא תיאוריה אקדמית.',
      start: 'התחל הערכת שווי',
      simulator: 'נסה את הסימולטור',
      meta: ['התחל בחינם, תשלום בהפקת הדוח', '', v2 ? 'דוח PDF, 8 עמודים' : 'דוח PDF · 8 עמודים'],
    },
    sample: {
      aria: v2 ? 'דוגמה להמחשה, לא עסק אמיתי' : 'דוח לדוגמה · 8 עמודים',
      top: v2 ? 'שווי לבעלים, תרחיש בסיס' : 'שווי לבעלים · תרחיש בסיס',
      tag: v2 ? 'דוגמה להמחשה, לא עסק אמיתי' : 'דוח לדוגמה · 8 עמודים',
      cap: v2 ? 'משקלות לדוגמה: DCF 50%, EBITDA 30%, הכנסות 20%. בדוח הם לפי הענף' : 'שקלול DCF 50% · מכפיל EBITDA 30% · מכפיל הכנסות 20%',
      ev: 'שווי פעילות (EV)',
      netDebt: 'חוב נטו',
      equity: 'שווי לבעלים',
    },
    methodsAria: 'השיטות בדוח',
    why: {
      title: 'למה equify',
      pages: 'עמודי דוח PDF',
      methodsCount: v2 ? 3 : 4,
      methods: 'שיטות הערכה משוקללות',
      methodsSub: v2 ? 'DCF, EBITDA והכנסות' : 'DCF · EBITDA · הכנסות · נכסים',
      durationLabel: 'מהזנת נתונים עד דוח',
      subSectors: v2 ? 'תתי ענפים' : 'תתי-ענפים מכוילים בנפרד',
      subSectorsSub: v2 ? 'לכל תת ענף פרופיל מכפילים משלו' : 'פרופיל מכפילים לכל תת-ענף',
    },
    steps: { label: 'תהליך הקלט', titleA: 'ארבעה שלבי קלט ל', titleHl: 'דוח הערכה מובנה.', sub: 'פרופיל, נתונים פיננסיים, מדדי סיכון ומטרת ההערכה. הדוח מופק בסיום ללא ייצוא ידני.' },
    calc: { label: 'אינדיקציה מהירה', titleA: 'מכפיל EBITDA ', titleHl: 'לפי ענף.', sub: 'הערכת שווי ראשונית לפי מכפילי שוק. הדוח המלא כולל DCF, מטריצות רגישות ותרחישי Bear/Base/Bull.' },
    models: { label: 'מתודולוגיה', titleA: 'מתודולוגיה משולבת.', titleHl: ' שווי משוקלל.', sub: VALUATION_METHODOLOGY_COPY },
    price: {
      label: 'תמחור',
      titleA: 'דוח הערכת שווי ',
      titleHl: 'מלא.',
      flag: v2 ? 'מומלץ, סבב נוכחי' : 'מומלץ · סבב נוכחי',
      name: 'דוח Pro מלא',
      old: '₪1,990',
      now: '₪999',
      per: v2 ? 'חד פעמי' : 'חד־פעמי',
      cta: 'התחל הערכה',
      disc: v2 ? 'אינדיקציה אלגוריתמית בלבד. לא ייעוץ השקעות.' : 'אינדיקציה אלגוריתמית בלבד · לא ייעוץ השקעות',
    },
    faqTitle: { label: 'שאלות נפוצות', titleA: 'שאלות ', titleHl: 'נפוצות.' },
    final: { a: 'שווי העסק שלך.', b: 'בנתונים.', note: 'כולל DCF, מכפילי שוק וניתוח סיכון.', cta: 'התחל הערכה' },
    footer: { start: 'התחל הערכה', terms: 'תנאי שימוש', privacy: 'פרטיות', cookies: 'הגדרות עוגיות', email: 'hello@equify.co.il' },
    hub: {
      guides: 'מדריכים',
      articles: 'כתבות',
      guidesLede: 'מדריכים קבועים על הערכת שווי של עסק פרטי: השיטות, המונחים והנתונים שעליהם הם נשענים.',
      articlesLede: 'כתבות על שווי, עסקאות, מימון ונתוני שוק, לבעלי עסקים ולמנהלי כספים.',
      home: 'עמוד הבית',
      crumbs: 'פירורי לחם',
      noGuides: 'עוד אין מדריכים.',
      noArticles: 'עוד אין כתבות.',
      start: 'להתחלת הערכת שווי',
      related: 'עוד באותו נושא',
      faq: 'שאלות ותשובות',
      disclaimer: 'אינדיקציה אלגוריתמית, לא חוות דעת שמאית.',
    },
    meta: { title: '', description: '' },
  }),
};
export default he;
