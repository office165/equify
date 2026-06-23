import type { ValuationLocale } from '../../api_client';
import {
  QUALITY_METHODOLOGY_COPY,
  QUALITY_METHODOLOGY_COPY_EN,
} from './equify_report_copy';

export interface EquifyWizardStepStrings {
  common: {
    tooltipAria: string;
    scaleThousands: string;
    scaleMillions: string;
    scaleMultiplierGroup: string;
    requiredFields: string;
    back: string;
    nextFinancials: string;
    nextRisk: string;
    nextGoal: string;
    errFullName: string;
    errCompanyName: string;
    errEmail: string;
    errPhone: string;
    phoneHint: string;
    subSector: string;
    selectSector: string;
    selectSubSector: string;
    lifecycleGroup: string;
    uploadLogo: string;
    logoErrorType: string;
    logoErrorSize: string;
    logoRemove: string;
    placeholderName: string;
  };
  step1: { titlePrefix: string };
  step2: {
    sub: string;
    revenue: string;
    revenueTip: string;
    margin: string;
    marginTip: string;
    ebitdaAmount: string;
    ebitdaPercent: string;
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
    blendedEbitdaTitle: string;
    blendedEbitdaPast: (pct: number, amount: string) => string;
    blendedEbitdaCurrent: (pct: number, amount: string) => string;
    blendedEbitdaProjected: (pct: number, amount: string, growth: string) => string;
    blendedEbitdaTotal: (amount: string) => string;
    hist2024Revenue: string;
    hist2024Ebitda: string;
    hist2025Revenue: string;
    hist2025Ebitda: string;
    hist2026Revenue: string;
    hist2026Ebitda: string;
    histYearTip: string;
    backlogSigned: string;
    backlogSignedTip: string;
    auditedHistoryAccordion: string;
    inflectionActive: (pct: number) => string;
    hasSignificantBacklog: string;
    hasSignificantBacklogHint: string;
    projected2027F: string;
    projected2028F: string;
    projected2029F: string;
    projectedForwardTip: string;
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
    hasSignificantBacklog: string;
    hasSignificantBacklogHint: string;
    projectedEbitdaSection: string;
    projectedEbitdaYear1: string;
    projectedEbitdaYear1Tip: string;
    projectedEbitdaYear2: string;
    projectedEbitdaYear2Tip: string;
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
    scaleThousands: 'אלפים',
    scaleMillions: 'מיליונים',
    scaleMultiplierGroup: 'הכפלת סדר גודל',
    requiredFields: '* שדות חובה',
    back: 'חזרה',
    nextFinancials: 'המשך לנתונים פיננסיים',
    nextRisk: 'המשך לסיכון',
    nextGoal: 'המשך למטרת ההערכה',
    errFullName: 'נא להזין שם מלא',
    errCompanyName: 'נא להזין שם חברה',
    errEmail: 'כתובת אימייל לא תקינה',
    errPhone: 'נא להזין מספר טלפון תקין (ספרות בלבד)',
    phoneHint: 'הדוח יישלח לכאן ב-WhatsApp',
    subSector: 'תת-ענף',
    selectSector: 'בחר ענף',
    selectSubSector: 'בחר תת-ענף',
    lifecycleGroup: 'שלב חיים',
    uploadLogo: 'גרור לכאן או לחץ להעלאה · PNG/JPG',
    logoErrorType: 'יש להעלות קובץ PNG או JPG בלבד.',
    logoErrorSize: 'גודל הלוגו חייב להיות קטן מ-2MB.',
    logoRemove: 'הסר לוגו',
    placeholderName: 'ישראל ישראלי',
  },
  step1: { titlePrefix: 'פרטי חברה' },
  step2: {
    sub: 'הכנסות ו-EBITDA לשנתיים האחרונות; תחזית לשלוש שנים קדימה לפי הקלט ותחזית הנהלה.',
    revenue: 'הכנסות שנתיות',
    revenueTip: 'הכנסות מדווחות לשנה האחרונה (₪K). בסיס לכל מודלי ההערכה.',
    margin: 'שיעור EBITDA מדווח',
    marginTip: 'EBITDA כאחוז מההכנסות לפני נרמול שכר בעלים. מקובל בענף האירוח: 18%–28%.',
    ebitdaAmount: 'סכום ₪',
    ebitdaPercent: 'אחוז %',
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
    blendedEbitdaTitle: 'בסיס EBITDA משוקלל (M&A)',
    blendedEbitdaPast: (pct, amount) => `${pct}% שנה קודמת · ${amount}`,
    blendedEbitdaCurrent: (pct, amount) => `${pct}% שנה נוכחית · ${amount}`,
    blendedEbitdaProjected: (pct, amount, growth) =>
      `${pct}% תחזית (+${growth}%) · ${amount}`,
    blendedEbitdaTotal: (amount) => `ממוצע משוקלל · ${amount}`,
    hist2024Revenue: 'הכנסות 2024',
    hist2024Ebitda: 'EBITDA 2024',
    hist2025Revenue: 'הכנסות 2025',
    hist2025Ebitda: 'EBITDA 2025',
    hist2026Revenue: 'הכנסות 2026 (שנה נוכחית)',
    hist2026Ebitda: 'EBITDA 2026 (שנה נוכחית)',
    histYearTip: 'הזינו סכומים בשקלים מלאים (למשל 1,200,000) — משמש לשקלול היסטורי ולבסיס המכפיל',
    backlogSigned: '🎯 צבר הזמנות חתום לשנים הקרובות (NIS)',
    backlogSignedTip:
      'סכום חוזים חתומים / הזמנות מחייבות לשנים קדימה. כאשר הצבר ≥ 50% מהכנסות 2026, מופעל מנוע Inflection (70% DCF · 30% מכפיל עם בסיס EBITDA מעורב קדימה).',
    auditedHistoryAccordion: '📊 עריכת נתוני עבר מבוקרים (2024-2025)',
    inflectionActive: (pct) =>
      `Inflection פעיל · צבר/הכנסות ${pct}% · DCF 70% · EBITDA 30%`,
    hasSignificantBacklog:
      'צבר הזמנות חתום / חוזים מהותיים קדימה (2026-2027)',
    hasSignificantBacklogHint:
      'מפעיל מתודולוגיית Inflection: 70% DCF · 30% מכפיל על EBITDA צפוי',
    projected2027F: 'EBITDA צפוי 2027F',
    projected2028F: 'EBITDA צפוי 2028F',
    projected2029F: 'EBITDA צפוי 2029F',
    projectedForwardTip: 'תחזית הנהלה — משמשת כבסיס מכפיל במצב Inflection (₪K)',
  },
  step3: {
    titlePrefix: 'מדדי סיכון',
    titleHl: 'ואיכות עסקית',
    sub: QUALITY_METHODOLOGY_COPY,
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
    hasSignificantBacklog: 'צבר הזמנות חתום / חוזים מהותיים קדימה',
    hasSignificantBacklogHint:
      'מפעיל מתודולוגיית Inflection: 70% DCF · 30% מכפיל EBITDA על בסיס EBITDA צפוי (לא היסטורי)',
    projectedEbitdaSection: 'EBITDA צפוי — לשנים קדימה (₪)',
    projectedEbitdaYear1: 'EBITDA צפוי — שנה +1 (NTM)',
    projectedEbitdaYear1Tip:
      'הזן EBITDA צפוי מהזמנות חתומות / חוזים — משמש כבסיס למכפיל במצב Inflection',
    projectedEbitdaYear2: 'EBITDA צפוי — שנה +2',
    projectedEbitdaYear2Tip: 'חלופה אם שנה +1 לא זמינה — נ fallback לשנה +1 ואז ל-EBITDA נוכחי',
    riskHint: (wacc, concBps, recurBps, founder) =>
      `מודיפיירי סיכון פעילים: WACC ${wacc}% · ריכוז +${concBps}bps · חוזרות +${recurBps}bps${founder ? ' · תלות מייסד +60bps' : ''}`,
    moatLabel: 'הערות / יתרון תחרותי ייחודי',
    moatPlaceholder: 'תאר את המעמד התחרותי, נכסים ייחודיים, חסמי כניסה...',
  },
  step4: {
    titlePrefix: 'מטרת ההערכה',
    titleHl: 'והפקת הדוח',
    sub: 'המטרה קובעת את הדגשים ואת רמת הפירוט בדוח PDF.',
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
    scaleThousands: 'Thousands',
    scaleMillions: 'Millions',
    scaleMultiplierGroup: 'Scale multiplier',
    requiredFields: '* Required fields',
    back: 'Back',
    nextFinancials: 'Continue to financials',
    nextRisk: 'Continue to risk',
    nextGoal: 'Continue to purpose',
    errFullName: 'Please enter your full name',
    errCompanyName: 'Please enter a company name',
    errEmail: 'Invalid email address',
    errPhone: 'Please enter a valid phone number (digits only)',
    phoneHint: 'Your report will be sent here via WhatsApp',
    subSector: 'Sub-sector',
    selectSector: 'Select sector',
    selectSubSector: 'Select sub-sector',
    lifecycleGroup: 'Lifecycle stage',
    uploadLogo: 'Drag here or tap to upload · PNG/JPG',
    logoErrorType: 'Please upload a PNG or JPG image.',
    logoErrorSize: 'Logo must be smaller than 2 MB.',
    logoRemove: 'Remove logo',
    placeholderName: 'Jane Doe',
  },
  step1: { titlePrefix: 'Company details' },
  step2: {
    sub: 'Revenue and EBITDA for the past two years; three-year forward forecast from your inputs and management projections.',
    revenue: 'Annual revenue',
    revenueTip: 'Reported revenue for the latest year (₪K). Basis for all valuation models.',
    margin: 'Reported EBITDA margin',
    marginTip: 'EBITDA as % of revenue before owner salary normalization. Hospitality norm: 18%–28%.',
    ebitdaAmount: 'Amount ₪',
    ebitdaPercent: 'Percent %',
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
    blendedEbitdaTitle: 'Blended EBITDA base (M&A)',
    blendedEbitdaPast: (pct, amount) => `${pct}% prior year · ${amount}`,
    blendedEbitdaCurrent: (pct, amount) => `${pct}% current year · ${amount}`,
    blendedEbitdaProjected: (pct, amount, growth) =>
      `${pct}% projected (+${growth}%) · ${amount}`,
    blendedEbitdaTotal: (amount) => `Weighted average · ${amount}`,
    hist2024Revenue: 'Revenue 2024',
    hist2024Ebitda: 'EBITDA 2024',
    hist2025Revenue: 'Revenue 2025',
    hist2025Ebitda: 'EBITDA 2025',
    hist2026Revenue: 'Revenue 2026 (current year)',
    hist2026Ebitda: 'EBITDA 2026 (current year)',
    histYearTip: 'Enter full shekel amounts (e.g. 1,200,000) — used for historical blend and multiple base',
    backlogSigned: '🎯 Signed order backlog for upcoming years (NIS)',
    backlogSignedTip:
      'Total signed contracts / binding orders for forward years. When backlog ≥ 50% of 2026 revenue, the Inflection engine engages (70% DCF · 30% multiple with forward EBITDA blend).',
    auditedHistoryAccordion: '📊 Edit audited historical data (2024-2025)',
    inflectionActive: (pct) =>
      `Inflection active · backlog/revenue ${pct}% · DCF 70% · EBITDA 30%`,
    hasSignificantBacklog:
      'Signed order backlog / material forward contracts (2026-2027)',
    hasSignificantBacklogHint:
      'Engages Inflection methodology: 70% DCF · 30% multiple on forward EBITDA',
    projected2027F: 'Projected EBITDA 2027F',
    projected2028F: 'Projected EBITDA 2028F',
    projected2029F: 'Projected EBITDA 2029F',
    projectedForwardTip: 'Management forecast — multiples base in Inflection mode (₪K)',
  },
  step3: {
    titlePrefix: 'Risk metrics',
    titleHl: 'and business quality',
    sub: QUALITY_METHODOLOGY_COPY_EN,
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
    hasSignificantBacklog: 'Signed order backlog / material forward contracts',
    hasSignificantBacklogHint:
      'Engages Inflection methodology: 70% DCF · 30% EBITDA multiple on forward EBITDA (not trailing)',
    projectedEbitdaSection: 'Projected EBITDA — forward years (₪)',
    projectedEbitdaYear1: 'Projected EBITDA — year +1 (NTM)',
    projectedEbitdaYear1Tip:
      'Enter forward EBITDA from signed orders/contracts — multiples base in Inflection mode',
    projectedEbitdaYear2: 'Projected EBITDA — year +2',
    projectedEbitdaYear2Tip: 'Fallback if year +1 is unavailable — tries +1 then current EBITDA',
    riskHint: (wacc, concBps, recurBps, founder) =>
      `Active risk modifiers: WACC ${wacc}% · concentration +${concBps}bps · recurring +${recurBps}bps${founder ? ' · founder dependency +60bps' : ''}`,
    moatLabel: 'Notes / unique competitive advantage',
    moatPlaceholder: 'Describe competitive position, unique assets, barriers to entry...',
  },
  step4: {
    titlePrefix: 'Valuation purpose',
    titleHl: 'and report output',
    sub: 'Purpose shapes emphasis and depth in the PDF report.',
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
