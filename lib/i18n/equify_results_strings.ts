import type { ValuationLocale } from '../../api_client';

export interface EquifyResultsStrings {
  corpIdPrefix: string;
  coverCaption: string;
  execEyebrow: string;
  execTitle: string;
  execTitleHl: string;
  kEquity: string;
  kEv: string;
  kWacc: string;
  waterfallTitle: string;
  wfEv: string;
  wfDebt: string;
  wfEquity: string;
  finEyebrow: string;
  finTitle: string;
  finTitleHl: string;
  finSub: string;
  growthNote: (pct: number) => string;
  marginNote: (pct: string | number) => string;
  dcfEyebrow: string;
  dcfTitle: string;
  dcfTitleHl: string;
  dcfSub: (wacc: string, terminal: string) => string;
  dcfWacc: string;
  dcfPv: string;
  dcfTerminal: (g: string) => string;
  dcfEv: string;
  multEyebrow: string;
  multTitle: string;
  multTitleHl: string;
  multIntro: (sector: string) => string;
  scenEyebrow: string;
  scenTitle: string;
  scenTitleHl: string;
  scenSub: string;
  scenTabList: string;
  scenGrowth: string;
  scenEbitda: string;
  scenMult: string;
  scenEv: string;
  blendEyebrow: string;
  blendTitle: string;
  blendTitleHl: string;
  blendWeights: string;
  blendEbitdaTitle: string;
  blendRevTitle: string;
  blendFooter: (date: string) => string;
  newValuation: string;
  disclaimer: string;
  purposePrefix: string;
  sealBadge: string;
  scenarioBear: string;
  scenarioBase: string;
  scenarioBull: string;
}

const HE: EquifyResultsStrings = {
  corpIdPrefix: 'ח.פ.',
  coverCaption: 'שווי לבעלים (Equity Value) · תרחיש בסיס · טווח',
  execEyebrow: 'תקציר מנהלים',
  execTitle: 'השורה התחתונה —',
  execTitleHl: 'קודם.',
  kEquity: 'שווי לבעלים · בסיס',
  kEv: 'שווי פעילות (EV)',
  kWacc: 'WACC אפקטיבי',
  waterfallTitle: 'מ-EV לשווי לבעלים',
  wfEv: 'שווי פעילות',
  wfDebt: 'חוב נטו',
  wfEquity: 'שווי לבעלים',
  finEyebrow: 'נתונים פיננסיים',
  finTitle: 'המספרים שמאחורי',
  finTitleHl: 'המודל.',
  finSub: 'הכנסות ו-EBITDA בפועל ותחזית, כפי שהוזנו לאשף ואומתו מול מודל ההערכה.',
  growthNote: (pct) => `צמיחה שנתית ממוצעת ${pct}%`,
  marginNote: (pct) => `שיעור EBITDA ${pct}%`,
  dcfEyebrow: 'היוון תזרימי מזומנים',
  dcfTitle: 'מבט קדימה:',
  dcfTitleHl: 'DCF.',
  dcfSub: (wacc, terminal) =>
    `תזרימי המזומנים החופשיים מהוונים בעלות הון של ${wacc}%, כולל פרמיית סיכון מדינה לפי Damodaran. ערך טרמינלי בצמיחה של ${terminal}.`,
  dcfWacc: 'WACC אפקטיבי',
  dcfPv: 'שווי נוכחי של תזרימים',
  dcfTerminal: (g) => `ערך טרמינלי מהוון (g = ${g})`,
  dcfEv: 'שווי פעילות לפי DCF',
  multEyebrow: 'מכפילי שוק',
  multTitle: 'מבט הצידה:',
  multTitleHl: 'השוק.',
  multIntro: (sector) =>
    `המכפילים מכוילים מול עסקאות M&A ישראליות בענף ${sector}. הפס מציג את טווח השוק; הנקודה — את המיקום שלך.`,
  scenEyebrow: 'תרחישים',
  scenTitle: 'לא רק כמה —',
  scenTitleHl: 'באיזה טווח.',
  scenSub: 'החלף תרחיש וראה את כל הדוח מתעדכן: שווי, מכפיל, WACC וההנחות מאחוריהם.',
  scenTabList: 'בחירת תרחיש',
  scenGrowth: 'צמיחת הכנסות שנתית',
  scenEbitda: 'שיעור EBITDA יציב',
  scenMult: 'מכפיל EBITDA אפקטיבי',
  scenEv: 'שווי פעילות (EV)',
  blendEyebrow: 'שווי משולב',
  blendTitle: 'שלושה מודלים.',
  blendTitleHl: 'מספר אחד.',
  blendWeights: 'משקלות המודלים',
  blendEbitdaTitle: 'מכפיל EBITDA',
  blendRevTitle: 'מכפיל הכנסות',
  blendFooter: (date) => `שווי לבעלים · תרחיש בסיס · נכון ל-${date}`,
  newValuation: 'הערכה חדשה',
  disclaimer:
    'דוח זה הינו אינדיקציית שווי אלגוריתמית המבוססת על נתונים שהוזנו על ידי המשתמש ועל נתוני שוק פומביים. אין לראות בו ייעוץ השקעות, חוות דעת חשבונאית או הערכת שווי לצרכים סטטוטוריים. © 2026 equify BY SBC.',
  purposePrefix: 'מטרת ההערכה: ',
  sealBadge: 'הערכת שווי אלגוריתמית מוסמכת · מתודולוגיית SBC',
  scenarioBear: 'Bear 🐻',
  scenarioBase: 'Base ◆',
  scenarioBull: 'Bull 🚀',
};

const EN: EquifyResultsStrings = {
  corpIdPrefix: 'ID',
  coverCaption: 'Equity Value · Base case · Range',
  execEyebrow: 'Executive summary',
  execTitle: 'The bottom line —',
  execTitleHl: 'first.',
  kEquity: 'Equity value · Base',
  kEv: 'Enterprise value (EV)',
  kWacc: 'Effective WACC',
  waterfallTitle: 'From EV to equity value',
  wfEv: 'Enterprise value',
  wfDebt: 'Net debt',
  wfEquity: 'Equity value',
  finEyebrow: 'Financial data',
  finTitle: 'The numbers behind',
  finTitleHl: 'the model.',
  finSub: 'Actual and forecast revenue and EBITDA as entered in the wizard and validated against the model.',
  growthNote: (pct) => `Average annual growth ${pct}%`,
  marginNote: (pct) => `EBITDA margin ${pct}%`,
  dcfEyebrow: 'Discounted cash flow',
  dcfTitle: 'Looking ahead:',
  dcfTitleHl: 'DCF.',
  dcfSub: (wacc, terminal) =>
    `Free cash flows discounted at ${wacc}% cost of capital, including Damodaran country risk premium. Terminal value at ${terminal} growth.`,
  dcfWacc: 'Effective WACC',
  dcfPv: 'Present value of flows',
  dcfTerminal: (g) => `Discounted terminal value (g = ${g})`,
  dcfEv: 'Enterprise value (DCF)',
  multEyebrow: 'Market multiples',
  multTitle: 'A sideways view:',
  multTitleHl: 'the market.',
  multIntro: (sector) =>
    `Multiples calibrated against Israeli M&A transactions in ${sector}. The band shows market range; the dot is your position.`,
  scenEyebrow: 'Scenarios',
  scenTitle: 'Not just how much —',
  scenTitleHl: 'but in what range.',
  scenSub: 'Switch scenario and watch value, multiple, WACC, and assumptions update across the report.',
  scenTabList: 'Scenario selection',
  scenGrowth: 'Annual revenue growth',
  scenEbitda: 'Stable EBITDA margin',
  scenMult: 'Effective EBITDA multiple',
  scenEv: 'Enterprise value (EV)',
  blendEyebrow: 'Blended value',
  blendTitle: 'Three models.',
  blendTitleHl: 'One number.',
  blendWeights: 'Model weights',
  blendEbitdaTitle: 'EBITDA multiple',
  blendRevTitle: 'Revenue multiple',
  blendFooter: (date) => `Equity value · Base case · As of ${date}`,
  newValuation: 'New valuation',
  disclaimer:
    'This report is an algorithmic valuation indication based on user inputs and public market data. It is not investment advice, accounting opinion, or statutory valuation. © 2026 equify BY SBC.',
  purposePrefix: 'Valuation purpose: ',
  sealBadge: 'CERTIFIED ALGORITHMIC VALUATION · SBC METHODOLOGY',
  scenarioBear: 'Bear 🐻',
  scenarioBase: 'Base ◆',
  scenarioBull: 'Bull 🚀',
};

export function getEquifyResultsStrings(locale: ValuationLocale): EquifyResultsStrings {
  return locale === 'he' ? HE : EN;
}
