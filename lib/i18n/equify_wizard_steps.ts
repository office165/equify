import type { ValuationLocale } from '../../api_client';

export interface EquifyWizardStepStrings {
  common: {
    tooltipAria: string;
    requiredFields: string;
    back: string;
    nextFinancials: string;
    nextRisk: string;
    nextGoal: string;
    errFullName: string;
    errEmail: string;
    phoneHint: string;
    subSector: string;
    selectSector: string;
    selectSubSector: string;
    lifecycleGroup: string;
    uploadLogo: string;
    placeholderName: string;
  };
  step1: { titlePrefix: string };
  step2: {
    sub: string;
    revenue: string;
    revenueTip: string;
    margin: string;
    marginTip: string;
    ownerSalary: string;
    ownerSalaryTip: string;
    capex: string;
    capexTip: string;
    growth: string;
    growthTip: string;
    grossDebt: string;
    grossDebtTip: string;
    cash: string;
    cashTip: string;
    netDebt: string;
    currency: string;
    currencyIls: string;
    currencyUsd: string;
    currencyEur: string;
    fiscalYear: string;
    livePanel: string;
    qualityScore: string;
    minRev: string;
    maxRev: string;
    minGrowth: string;
    maxGrowth: string;
    waccQuality: (wacc: string, grade: string) => string;
    modelDcf: string;
    modelEbitda: string;
    modelRevenue: string;
    scenarioBear: string;
    scenarioBase: string;
    scenarioBull: string;
    minZero: string;
    maxOwnerSalary: string;
    maxGrossDebt: string;
    maxCash: string;
  };
  step3: {
    titlePrefix: string;
    titleHl: string;
    sub: string;
    revenueStability: string;
    management: string;
    recurring: string;
    recurringTip: string;
    concentration: string;
    concentrationTip: (bps: number) => string;
    minConc: string;
    maxConc: string;
    founderDep: string;
    founderDepHint: string;
    competition: string;
    competitionHint: string;
    ip: string;
    ipHint: string;
    contracts: string;
    contractsHint: string;
    riskHint: (wacc: string, concBps: number, recurBps: number, founder: boolean) => string;
    moatLabel: string;
    moatPlaceholder: string;
  };
  step4: {
    titlePrefix: string;
    titleHl: string;
    sub: string;
    goalGroup: string;
    termsLabel: string;
    termsBody: string;
    termsBold: string;
    computing: string;
    generate: string;
    disclaimer: string;
    goals: Record<
      'negotiation' | 'fundraise' | 'partner' | 'bank' | 'internal' | 'legal',
      { name: string; desc: string }
    >;
  };
}

const HE: EquifyWizardStepStrings = {
  common: {
    tooltipAria: 'מידע נוסף',
    requiredFields: '* שדות חובה',
    back: 'חזרה',
    nextFinancials: 'המשך לנתונים פיננסיים',
    nextRisk: 'המשך לסיכון',
    nextGoal: 'המשך למטרת ההערכה',
    errFullName: 'נא להזין שם מלא',
    errEmail: 'כתובת אימייל לא תקינה',
    phoneHint: 'הדוח יישלח לכאן ב-WhatsApp',
    subSector: 'תת-ענף',
    selectSector: 'בחר ענף',
    selectSubSector: 'בחר תת-ענף',
    lifecycleGroup: 'שלב חיים',
    uploadLogo: 'גרור לכאן או לחץ להעלאה · PNG/JPG',
    placeholderName: 'ישראל ישראלי',
  },
  step1: { titlePrefix: 'ספר לנו על' },
  step2: {
    sub: 'כל שינוי מחשב מחדש את השווי בזמן אמת — כולל נרמול EBITDA, CAPEX וחוב נטו.',
    revenue: 'הכנסות שנתיות',
    revenueTip: 'הכנסות מדווחות לשנה האחרונה (₪K). בסיס לכל מודלי ההערכה.',
    margin: 'שיעור EBITDA מדווח',
    marginTip: 'EBITDA כאחוז מההכנסות לפני נרמול שכר בעלים. מקובל בענף האירוח: 18%–28%.',
    ownerSalary: 'שכר בעלים מנורמל',
    ownerSalaryTip:
      'הפרש בין שכר שוק למה שמשולם לבעלים — מוסיף ל-EBITDA התפעולי לצורך הערכה (Big 4 normalization).',
    capex: 'רמת השקעות (CAPEX)',
    capexTip: 'השקעות הוניות כאחוז מההכנסות — מורידות את תזרים המזומנים החופשי (FCFF) ב-DCF.',
    growth: 'צמיחה שנתית צפויה',
    growthTip: 'קצב צמיחת הכנסות לשנים הבאות — משפיע על DCF ומכפילי צמיחה.',
    grossDebt: 'חוב ברוטו (Gross Debt)',
    grossDebtTip: 'סך התחייבויות פיננסיות — הלוואות, אגרות חוב, מסגרות אשראי.',
    cash: 'מזומן ושווי מזומנים',
    cashTip: 'מזומן, פיקדונות לטווח קצר וניירות ערך נזילים — מקטינים את החוב נטו.',
    netDebt: 'חוב נטו (אוטומטי)',
    currency: 'מטבע דיווח',
    currencyIls: '₪ שקל (ILS)',
    currencyUsd: '$ דולר (USD)',
    currencyEur: '€ אירו (EUR)',
    fiscalYear: 'שנת דיווח אחרונה',
    livePanel: 'שווי לבעלים · LIVE',
    qualityScore: 'Quality Score',
    minRev: '500K ₪',
    maxRev: '200M ₪',
    minGrowth: '−10%',
    maxGrowth: '+50%',
    waccQuality: (wacc, grade) => `WACC ${wacc}% · Quality ${grade}`,
    modelDcf: 'DCF',
    modelEbitda: 'EBITDA ×',
    modelRevenue: 'Revenue ×',
    scenarioBear: 'Bear',
    scenarioBase: 'Base',
    scenarioBull: 'Bull',
    minZero: '0 ₪',
    maxOwnerSalary: '3M ₪',
    maxGrossDebt: '50M ₪',
    maxCash: '20M ₪',
  },
  step3: {
    titlePrefix: 'מה',
    titleHl: 'מייחד את העסק שלך.',
    sub: 'הגורמים האיכותיים שמכיילים את עלות ההון ואת מכפיל האיכות.',
    revenueStability: 'הכנסות ויציבות',
    management: 'ניהול ותחרות',
    recurring: 'הכנסות חוזרות (MRR/ARR)',
    recurringTip:
      'אחוז הכנסות חוזרות — מוריד פרמיית סיכון ב-WACC ומעלה Quality Score.',
    concentration: 'ריכוז — לקוח הגדול ביותר',
    concentrationTip: (bps) =>
      `ריכוז לקוחות מעלה את WACC. השפעה נוכחית: +${bps}bps.`,
    minConc: '0% (פיזור מלא)',
    maxConc: '100% (לקוח יחיד)',
    founderDep: 'תלות גבוהה במייסד / איש מפתח',
    founderDepHint: 'מוריד את ה-Quality Score',
    competition: 'תחרות אינטנסיבית בשוק',
    competitionHint: 'מעלה את פרמיית הסיכון',
    ip: 'IP / קניין רוחני מוגן',
    ipHint: 'מעלה את המכפיל',
    contracts: 'חוזים עם לקוחות ארוכי-טווח',
    contractsHint: 'מייצב תחזית התזרים',
    riskHint: (wacc, concBps, recurBps, founder) =>
      `מודיפיירי סיכון פעילים: WACC ${wacc}% · ריכוז +${concBps}bps · חוזרות +${recurBps}bps${founder ? ' · תלות מייסד +60bps' : ''}`,
    moatLabel: 'הערות / יתרון תחרותי ייחודי',
    moatPlaceholder: 'תאר את המעמד התחרותי, נכסים ייחודיים, חסמי כניסה...',
  },
  step4: {
    titlePrefix: 'להשתמש בדוח',
    titleHl: 'לשם מה?',
    sub: 'המטרה קובעת את הדגשים, הניסוח ורמת הפירוט בדוח ה-PDF.',
    goalGroup: 'מטרת ההערכה',
    termsLabel: 'הסכמה לתנאי שימוש',
    termsBody:
      'קראתי והסכמתי כי equify BY SBC מספקת אינדיקציית שווי אלגוריתמית בלבד ואינה ייעוץ השקעות או חוות דעת חשבונאית.',
    termsBold: 'אינדיקציית שווי אלגוריתמית בלבד',
    computing: 'מחשב שווי...',
    generate: 'חשב שווי מורחב',
    disclaimer:
      'הערכה זו הינה אינדיקציה אלגוריתמית בלבד. אין לראות בה ייעוץ השקעות, ייעוץ פיננסי, חוות דעת חשבונאית או תחליף להערכת שווי מקצועית. © 2026 equify BY SBC.',
    goals: {
      negotiation: { name: 'משא ומתן אסטרטגי', desc: 'מכירת החברה, מיזוג, רכישה' },
      fundraise: { name: 'גיוס הון', desc: 'VCs, Angels, קרנות' },
      partner: { name: 'שותפות עסקית', desc: 'הכנסת שותף, חלוקת מניות' },
      bank: { name: 'מימון בנקאי', desc: 'הלוואות, ערבויות, אשראי' },
      internal: { name: 'שימוש פנימי', desc: 'אסטרטגיה, דיווח, תכנון' },
      legal: { name: 'הליך משפטי / ירושה', desc: 'גירושין, עיזבון, בוררות' },
    },
  },
};

const EN: EquifyWizardStepStrings = {
  common: {
    tooltipAria: 'More information',
    requiredFields: '* Required fields',
    back: 'Back',
    nextFinancials: 'Continue to financials',
    nextRisk: 'Continue to risk',
    nextGoal: 'Continue to purpose',
    errFullName: 'Please enter your full name',
    errEmail: 'Invalid email address',
    phoneHint: 'Your report will be sent here via WhatsApp',
    subSector: 'Sub-sector',
    selectSector: 'Select sector',
    selectSubSector: 'Select sub-sector',
    lifecycleGroup: 'Lifecycle stage',
    uploadLogo: 'Drag here or tap to upload · PNG/JPG',
    placeholderName: 'Jane Doe',
  },
  step1: { titlePrefix: 'Tell us about' },
  step2: {
    sub: 'Every change recalculates value in real time — including EBITDA normalization, CAPEX, and net debt.',
    revenue: 'Annual revenue',
    revenueTip: 'Reported revenue for the latest year (₪K). Basis for all valuation models.',
    margin: 'Reported EBITDA margin',
    marginTip: 'EBITDA as % of revenue before owner salary normalization. Hospitality norm: 18%–28%.',
    ownerSalary: 'Normalized owner salary',
    ownerSalaryTip:
      'Gap between market salary and owner pay — added to operating EBITDA (Big 4 normalization).',
    capex: 'CAPEX level',
    capexTip: 'Capital expenditures as % of revenue — reduces free cash flow in DCF.',
    growth: 'Expected annual growth',
    growthTip: 'Revenue growth rate for forward years — affects DCF and growth multiples.',
    grossDebt: 'Gross debt',
    grossDebtTip: 'Total financial liabilities — loans, bonds, credit facilities.',
    cash: 'Cash & equivalents',
    cashTip: 'Cash, short-term deposits, and liquid securities — reduces net debt.',
    netDebt: 'Net debt (auto)',
    currency: 'Reporting currency',
    currencyIls: '₪ Shekel (ILS)',
    currencyUsd: '$ US Dollar (USD)',
    currencyEur: '€ Euro (EUR)',
    fiscalYear: 'Latest fiscal year',
    livePanel: 'Equity value · LIVE',
    qualityScore: 'Quality Score',
    minRev: '₪500K',
    maxRev: '₪200M',
    minGrowth: '−10%',
    maxGrowth: '+50%',
    waccQuality: (wacc, grade) => `WACC ${wacc}% · Quality ${grade}`,
    modelDcf: 'DCF',
    modelEbitda: 'EBITDA ×',
    modelRevenue: 'Revenue ×',
    scenarioBear: 'Bear',
    scenarioBase: 'Base',
    scenarioBull: 'Bull',
    minZero: '₪0',
    maxOwnerSalary: '₪3M',
    maxGrossDebt: '₪50M',
    maxCash: '₪20M',
  },
  step3: {
    titlePrefix: 'What',
    titleHl: 'makes your business unique.',
    sub: 'Quality drivers that calibrate cost of capital and the quality multiple.',
    revenueStability: 'Revenue & stability',
    management: 'Management & competition',
    recurring: 'Recurring revenue (MRR/ARR)',
    recurringTip: 'Share of recurring revenue — lowers WACC risk premium and raises Quality Score.',
    concentration: 'Largest customer concentration',
    concentrationTip: (bps) =>
      `Customer concentration raises WACC. Current impact: +${bps}bps.`,
    minConc: '0% (fully diversified)',
    maxConc: '100% (single customer)',
    founderDep: 'High founder / key-person dependency',
    founderDepHint: 'Lowers Quality Score',
    competition: 'Intense market competition',
    competitionHint: 'Raises risk premium',
    ip: 'Protected IP / intangible assets',
    ipHint: 'Raises the multiple',
    contracts: 'Long-term customer contracts',
    contractsHint: 'Stabilizes cash flow forecast',
    riskHint: (wacc, concBps, recurBps, founder) =>
      `Active risk modifiers: WACC ${wacc}% · concentration +${concBps}bps · recurring +${recurBps}bps${founder ? ' · founder dependency +60bps' : ''}`,
    moatLabel: 'Notes / unique competitive advantage',
    moatPlaceholder: 'Describe competitive position, unique assets, barriers to entry...',
  },
  step4: {
    titlePrefix: 'What will you',
    titleHl: 'use the report for?',
    sub: 'Purpose shapes emphasis, wording, and depth in the PDF report.',
    goalGroup: 'Valuation purpose',
    termsLabel: 'Terms of use agreement',
    termsBody:
      'I have read and agree that equify BY SBC provides algorithmic valuation indication only and not investment or accounting advice.',
    termsBold: 'algorithmic valuation indication only',
    computing: 'Computing valuation...',
    generate: 'Run full valuation',
    disclaimer:
      'This valuation is an algorithmic indication only. It is not investment advice, financial advice, accounting opinion, or a substitute for professional valuation. © 2026 equify BY SBC.',
    goals: {
      negotiation: { name: 'Strategic negotiation', desc: 'Sale, merger, acquisition' },
      fundraise: { name: 'Fundraising', desc: 'VCs, angels, funds' },
      partner: { name: 'Business partnership', desc: 'New partner, equity split' },
      bank: { name: 'Bank financing', desc: 'Loans, guarantees, credit' },
      internal: { name: 'Internal use', desc: 'Strategy, reporting, planning' },
      legal: { name: 'Legal / inheritance', desc: 'Divorce, estate, arbitration' },
    },
  },
};

export function getEquifyWizardStepStrings(locale: ValuationLocale): EquifyWizardStepStrings {
  return locale === 'he' ? HE : EN;
}

export function getGoalPurposeLabel(
  locale: ValuationLocale,
  goalKey: string,
): string | null {
  const steps = getEquifyWizardStepStrings(locale);
  const goal = steps.step4.goals[goalKey as keyof typeof steps.step4.goals];
  if (!goal) return null;
  const prefix = locale === 'he' ? 'מטרת ההערכה: ' : 'Valuation purpose: ';
  return `${prefix}${goal.name}`;
}
