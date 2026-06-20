import type { ValuationLocale } from '../../api_client';
import {
  FINANCIAL_DATA_COPY,
  FINANCIAL_DATA_COPY_EN,
  multiplesMethodologyCopy,
  multiplesMethodologyCopyEn,
  QUALITY_METHODOLOGY_COPY,
  QUALITY_METHODOLOGY_COPY_EN,
  SCENARIOS_SENSITIVITY_METHODOLOGY_COPY,
  SCENARIOS_SENSITIVITY_METHODOLOGY_COPY_EN,
  scenSub,
  scenSubEn,
  SCENARIOS_METHODOLOGY_COPY,
  SENSITIVITY_METHODOLOGY_COPY,
  WACC_DCF_METHODOLOGY_COPY,
  WACC_DCF_METHODOLOGY_COPY_EN,
} from './equify_report_copy';

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
  blendedEbitdaNote: (summary: string) => string;
  dcfEyebrow: string;
  dcfTitle: string;
  dcfTitleHl: string;
  dcfSub: string;
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
  qualSub: string;
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
  moatCalloutLabel: string;
}

const HE: EquifyResultsStrings = {
  corpIdPrefix: 'ח.פ.',
  coverCaption: 'שווי לבעלים (Equity Value) · תרחיש בסיס · טווח',
  execEyebrow: 'תקציר מנהלים',
  execTitle: 'שווי לבעלים',
  execTitleHl: 'ותרומת המודלים',
  kEquity: 'שווי לבעלים · בסיס',
  kEv: 'שווי פעילות (EV)',
  kWacc: 'WACC אפקטיבי',
  waterfallTitle: 'מ-EV לשווי לבעלים',
  wfEv: 'שווי פעילות',
  wfDebt: 'חוב נטו',
  wfEquity: 'שווי לבעלים',
  finEyebrow: 'נתונים פיננסיים',
  finTitle: 'בסיס המודל:',
  finTitleHl: 'הכנסות ו-EBITDA',
  finSub: FINANCIAL_DATA_COPY,
  growthNote: (pct) => `CAGR ${pct}%`,
  marginNote: (pct) => `שיעור EBITDA ${pct}%`,
  blendedEbitdaNote: (summary) => `בסיס EBITDA משוקלל (M&A): ${summary}`,
  dcfEyebrow: 'היוון תזרימי מזומנים',
  dcfTitle: 'DCF + WACC',
  dcfTitleHl: '(FCFF)',
  dcfSub: WACC_DCF_METHODOLOGY_COPY,
  dcfWacc: 'WACC אפקטיבי',
  dcfPv: 'שווי נוכחי של תזרימים',
  dcfTerminal: (g) => `ערך טרמינלי (g = ${g})`,
  dcfEv: 'שווי פעילות לפי DCF',
  multEyebrow: 'מכפילי שוק',
  multTitle: 'מיקום מול עסקאות',
  multTitleHl: 'השוואה (M&A)',
  multIntro: (sector) => multiplesMethodologyCopy(`בתחום ${sector}`),
  scenEyebrow: 'תרחישים',
  scenTitle: 'טווח שווי לפי',
  scenTitleHl: 'Bear / Base / Bull',
  scenSub: scenSub,
  qualSub: QUALITY_METHODOLOGY_COPY,
  scenTabList: 'בחירת תרחיש',
  scenGrowth: 'צמיחת הכנסות שנתית',
  scenEbitda: 'שיעור EBITDA',
  scenMult: 'מכפיל EBITDA',
  scenEv: 'שווי פעילות (EV)',
  blendEyebrow: 'שווי משולב',
  blendTitle: 'שווי לבעלים',
  blendTitleHl: 'בתרחיש בסיס',
  blendWeights: 'משקלות המודלים',
  blendEbitdaTitle: 'מכפיל EBITDA',
  blendRevTitle: 'מכפיל הכנסות',
  blendFooter: (date) => `שווי לבעלים · תרחיש בסיס · נכון ל-${date}`,
  newValuation: 'הערכה חדשה',
  disclaimer:
    'אינדיקציית שווי אלגוריתמית על בסיס נתוני משתמש ונתוני שוק פומביים. אינה ייעוץ השקעות, חוות דעת חשבונאית או הערכת שווי לצרכים סטטוטוריים. © 2026 equify BY SBC.',
  purposePrefix: 'מטרת ההערכה: ',
  sealBadge: 'אינדיקציית שווי אלגוריתמית · מתודולוגיית SBC',
  scenarioBear: 'Bear',
  scenarioBase: 'Base',
  scenarioBull: 'Bull',
  moatCalloutLabel: 'יתרון תחרותי / הערות:',
};

const EN: EquifyResultsStrings = {
  corpIdPrefix: 'ID',
  coverCaption: 'Equity Value · Base case · Range',
  execEyebrow: 'Executive summary',
  execTitle: 'Equity value',
  execTitleHl: 'and model contribution',
  kEquity: 'Equity value · Base',
  kEv: 'Enterprise value (EV)',
  kWacc: 'Effective WACC',
  waterfallTitle: 'From EV to equity value',
  wfEv: 'Enterprise value',
  wfDebt: 'Net debt',
  wfEquity: 'Equity value',
  finEyebrow: 'Financial data',
  finTitle: 'Model inputs:',
  finTitleHl: 'revenue and EBITDA',
  finSub: FINANCIAL_DATA_COPY_EN,
  growthNote: (pct) => `CAGR ${pct}%`,
  marginNote: (pct) => `EBITDA margin ${pct}%`,
  blendedEbitdaNote: (summary) => `Blended EBITDA base (M&A): ${summary}`,
  dcfEyebrow: 'Discounted cash flow',
  dcfTitle: 'DCF + WACC',
  dcfTitleHl: '(FCFF)',
  dcfSub: WACC_DCF_METHODOLOGY_COPY_EN,
  dcfWacc: 'Effective WACC',
  dcfPv: 'Present value of flows',
  dcfTerminal: (g) => `Terminal value (g = ${g})`,
  dcfEv: 'Enterprise value (DCF)',
  multEyebrow: 'Market multiples',
  multTitle: 'Position vs',
  multTitleHl: 'M&A comparables',
  multIntro: (sector) => multiplesMethodologyCopyEn(`in ${sector}`),
  scenEyebrow: 'Scenarios',
  scenTitle: 'Value range by',
  scenTitleHl: 'Bear / Base / Bull',
  scenSub: scenSubEn,
  qualSub: QUALITY_METHODOLOGY_COPY_EN,
  scenTabList: 'Scenario selection',
  scenGrowth: 'Annual revenue growth',
  scenEbitda: 'EBITDA margin',
  scenMult: 'EBITDA multiple',
  scenEv: 'Enterprise value (EV)',
  blendEyebrow: 'Blended value',
  blendTitle: 'Equity value',
  blendTitleHl: 'base case',
  blendWeights: 'Model weights',
  blendEbitdaTitle: 'EBITDA multiple',
  blendRevTitle: 'Revenue multiple',
  blendFooter: (date) => `Equity value · Base case · As of ${date}`,
  newValuation: 'New valuation',
  disclaimer:
    'Algorithmic valuation indication based on user inputs and public market data. Not investment advice, accounting opinion, or statutory valuation. © 2026 equify BY SBC.',
  purposePrefix: 'Valuation purpose: ',
  sealBadge: 'ALGORITHMIC VALUATION INDICATION · SBC METHODOLOGY',
  scenarioBear: 'Bear',
  scenarioBase: 'Base',
  scenarioBull: 'Bull',
  moatCalloutLabel: 'Competitive advantage / notes:',
};

export function getEquifyResultsStrings(locale: ValuationLocale): EquifyResultsStrings {
  return locale === 'he' ? HE : EN;
}
