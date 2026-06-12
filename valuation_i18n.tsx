'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  readValuationLocale,
  writeValuationLocale,
  type ValuationLocale,
} from './api_client';
import { formatCurrencyShort, formatILS } from './lib/utils/formatCurrency';

export type { ValuationLocale };

export interface ValuationTranslations {
  locale: ValuationLocale;
  dir: 'ltr' | 'rtl';
  isRtl: boolean;
  /** Shorthand translate */
  t: (key: TranslationKey) => string;
  /** Translate with {placeholder} replacement */
  tf: (key: TranslationKey, vars: Record<string, string | number>) => string;
  terms: FinancialTerms;
}

export type FinancialTermKey =
  | 'wacc'
  | 'enterpriseValue'
  | 'equityPostDlom'
  | 'coreReinvestment'
  | 'fcff'
  | 'impliedEvPath'
  | 'marketOffer'
  | 'gTerminal'
  | 'terminalRR'
  | 'confidence'
  | 'currentRatio'
  | 'quickRatio'
  | 'netDebtEbitda'
  | 'debtToEquity'
  | 'assetTurnover'
  | 'netProfitMargin';

export type FinancialTerms = Record<FinancialTermKey, string>;

const FIN_TERMS_EN: FinancialTerms = {
  wacc: 'WACC',
  enterpriseValue: 'Enterprise Value',
  equityPostDlom: 'Equity (post-DLOM)',
  coreReinvestment: 'Core Reinvestment',
  fcff: 'FCFF',
  impliedEvPath: 'Implied EV Path',
  marketOffer: 'Market / Offer',
  gTerminal: 'g∞',
  terminalRR: 'Terminal RR',
  confidence: 'Confidence',
  currentRatio: 'Current Ratio',
  quickRatio: 'Quick Ratio',
  netDebtEbitda: 'Net Debt / EBITDA',
  debtToEquity: 'Debt-to-Equity',
  assetTurnover: 'Asset Turnover',
  netProfitMargin: 'Net Profit Margin',
};

const FIN_TERMS_HE: FinancialTerms = {
  wacc: 'מחיר הון משוקלל',
  enterpriseValue: 'שווי פעילות',
  equityPostDlom: 'הון עצמי (לאחר הנחת אי-נזילות)',
  coreReinvestment: 'השקעה מחדש',
  fcff: 'תזרים מזומנים חופשי לפירמה',
  impliedEvPath: 'מסלול שווי פעילות מרומז',
  marketOffer: 'שווי שוק / הצעה',
  gTerminal: 'צמיחה לטווח ארוך',
  terminalRR: 'שיעור השקעה מחדש בטווח ארוך',
  confidence: 'רמת ביטחון',
  currentRatio: 'יחס שוטף',
  quickRatio: 'יחס מהיר',
  netDebtEbitda: 'חוב נטו / EBITDA',
  debtToEquity: 'חוב להון',
  assetTurnover: 'מחזור נכסים',
  netProfitMargin: 'שיעור רווח נקי',
};

type TranslationMap = Record<string, string>;

const EN: TranslationMap = {
  langToggle: 'עברית',
  langToggleAria: 'Switch to Hebrew',
  brand: 'Equify',
  wizardTitle: 'Valuation Wizard',
  wizardSubtitle:
    'Executive-grade corporate valuation intake — four steps to institutional output.',
  stepLabel: 'Step',
  stepCompanyProfile: 'Company Profile',
  stepFinancialInputs: 'Financial Inputs',
  stepRiskModifiers: 'Risk Characteristics & Sensitivity',
  stepValuationPurpose: 'Valuation Purpose',
  back: 'Back',
  continue: 'Continue',
  runValuation: 'Run Valuation',
  verifyingPayment: 'Verifying payment…',
  selectPlaceholder: 'Select…',
  helpAria: 'help',
  companyProfileTitle: 'Company Profile',
  companyProfileDesc:
    'Establish the entity context that anchors your valuation narrative.',
  legalName: 'Legal / Display Name',
  fullName: 'Full Name',
  fullNamePlaceholder: 'e.g. John Smith',
  industry: 'Industry',
  reportingCurrency: 'Reporting Currency',
  incorporationCountry: 'Incorporation Country',
  foundedYear: 'Founded Year',
  lifecycleStage: 'Lifecycle Stage',
  qualitativeDescription:
    'Competitive advantage, market position & unique assets',
  qualitativeDescriptionDesc:
    'Describe moat, market dynamics, patents, brand equity, and other intangibles — surfaced in your PDF report.',
  qualitativeDescriptionPlaceholder:
    'e.g. Proprietary AI platform, 3 patents pending, 40% recurring contracts in healthcare vertical…',
  financialInputsTitle: 'Financial Inputs',
  financialInputsDesc: 'Core operating metrics feeding the Equify valuation engine.',
  saasModeActive: 'SaaS mode active — ARR & churn enabled.',
  annualRevenue: 'Annual Revenue',
  annualRevenueActual: 'Annual Revenue (Actual)',
  revenueForecastY1: 'Y1 Revenue (DCF Forecast)',
  modelMethodNote:
    'The model applies mid-year discounting and standard reinvestment assumptions (McKinsey framework).',
  blendedEnterpriseValue: 'Blended Enterprise Value',
  weightingExplainer: 'Weighted blend of DCF and Israeli sector multiples.',
  annualArr: 'Annual Recurring Revenue (ARR)',
  annualChurnRate: 'Annual Churn Rate (%)',
  churnTooltipTitle: 'Annual Churn Rate',
  churnTooltip:
    'Logo or revenue churn on an annualized basis. Used to stress-test recurring revenue quality and retention-adjusted growth in SaaS valuations.',
  ebitda: 'EBITDA',
  ebitdaTooltipTitle: 'EBITDA',
  ebitdaTooltip:
    'Earnings Before Interest, Taxes, Depreciation & Amortization. Proxy for operating cash generation before capital structure and non-cash charges.',
  freeCashFlow: 'Free Cash Flow',
  fcfTooltipTitle: 'Free Cash Flow',
  fcfTooltip:
    'Cash from operations minus capital expenditures and working capital changes. Primary driver of DCF-based enterprise value.',
  interestExpense: 'Annual Interest Payments',
  interestExpenseTooltip:
    'Total interest paid on loans and credit lines — not the principal itself.',
  totalDebt: 'Total Debt',
  cashEquivalents: 'Liquid Cash',
  cashEquivalentsTooltip:
    'Cash, short-term deposits, and liquid securities — assets realizable within thirty days for net debt.',
  netDebt: 'Net Debt (Auto-Calculated)',
  netDebtDesc:
    'Bridges Enterprise Value to Equity Value. Auto-calculated from debt and cash if left blank.',
  netDebtHint: 'Computed from inputs: {amount}',
  netDebtFormula: 'Total debt minus liquid cash',
  financialShorthandExpanded: 'Interpreted as {amount}',
  financialShorthandPlaceholder: 'e.g. 12m, 30k, 1.5b',
  rdHistoryTitle: 'R&D Expense History (5 Years)',
  rdHistoryDesc:
    'Oldest to most recent — powers R&D capitalization in the valuation engine.',
  rdYear2025: 'This year (2025)',
  rdYear2024: 'Last year (2024)',
  rdYear2023: '2023',
  rdYear2022: '2022',
  rdYear2021: '2021',
  riskModifiersTitle: 'Risk Characteristics & Sensitivity',
  riskModifiersDesc:
    'Calibrate cost-of-equity overlays and private-company risk factors.',
  recurringRevenuePct: 'What % of your customers come back each year?',
  recurringRevenuePctHint: '0% = all new customers every year | 100% = everyone renews',
  customerConcentrationOver20: 'Single customer >20% of revenue?',
  customerConcentrationOver20Desc:
    'Material customer concentration increases private-company risk premia in the valuation model.',
  customerConcentrationPct:
    'What % of revenue comes from your largest customer?',
  levelOfCompetition: 'Level of Competition',
  competitionAria: 'Level of competition',
  ipProtection: 'IP Protection',
  ipProtectionDesc: 'Patents, trademarks, or defensible proprietary technology',
  founderDependency: 'Founder Dependency',
  founderDependencyDesc: 'Material key-person risk on revenue or operations',
  valuationPurposeTitle: 'Valuation Purpose',
  valuationPurposeDesc:
    'Select the engagement context — drives control premium and DLOM treatment.',
  userIdentifiersTitle: 'Identity verification (required)',
  userIdentifiersDesc:
    'All four fields are mandatory before running a valuation or accessing the report dashboard. Your mobile number is used for WhatsApp delivery of the verified PDF report.',
  userMobilePhone: 'Mobile phone',
  userMobilePhonePlaceholder: '05X-XXXXXXX',
  userMobilePhoneWhatsAppHint:
    'Primary WhatsApp number — your valuation PDF will be delivered here after verification.',
  userNationalId: 'National ID (Teudat Zehut)',
  userNationalIdPlaceholder: '9 digits',
  userCorporateTaxId: 'Company number (Chevrat Parit)',
  userCorporateTaxIdPlaceholder: '9 digits',
  userEmail: 'Email',
  userEmailPlaceholder: 'name@company.co.il',
  errUserMobileRequired: 'Mobile phone is required.',
  errUserMobileInvalid: 'Enter a valid Israeli mobile number (05X-XXXXXXX).',
  errUserNationalIdRequired: 'National ID is required.',
  errUserNationalIdInvalid: 'Enter a valid 9-digit national ID.',
  errUserCorpIdRequired: 'Company number is required.',
  errUserCorpIdInvalid: 'Enter a valid 9-digit company registration number.',
  errUserEmailRequired: 'Email is required.',
  errUserEmailInvalid: 'Enter a valid email address.',
  errUserIdentifiersGate:
    'Complete all identity fields in Step 1 before running the valuation or downloading the report.',
  errReportIdentifiersGate:
    'Identity verification is incomplete. Return to the wizard and complete all required fields.',
  errCompanyName: 'Company name is required.',
  errFullName: 'Full name is required.',
  errIndustry: 'Select an industry.',
  errLifecycle: 'Select a lifecycle stage.',
  errRevenue: 'Annual revenue is required.',
  errArr: 'ARR is required.',
  errChurn: 'Annual churn rate is required for SaaS.',
  errPurpose: 'Select a valuation purpose.',
  errTermsRequired: 'You must accept the terms and AI financial disclaimer to continue.',
  termsCheckboxAria: 'Accept terms of service and AI financial disclaimer',
  whatsappAuthTitle: 'Sign in with WhatsApp',
  whatsappAuthDesc: 'Passwordless verification — we send a 4-digit code to your phone.',
  whatsappAuthAria: 'WhatsApp phone verification',
  whatsappPhoneLabel: 'Mobile number (E.164)',
  whatsappPhonePlaceholder: '+972501234567',
  whatsappOtpLabel: '4-digit verification code',
  whatsappRequestOtp: 'Send code',
  whatsappVerifyOtp: 'Verify & continue',
  whatsappSending: 'Sending…',
  whatsappVerifying: 'Verifying…',
  whatsappOtpSent: 'Verification code sent via WhatsApp.',
  whatsappAuthSuccess: 'Phone verified. You are signed in.',
  whatsappVerifiedAs: 'Signed in as {phone}',
  whatsappSignOut: 'Sign out',
  whatsappErrPhone: 'Enter a valid phone number.',
  whatsappErrCode: 'Enter the 4-digit code.',
  whatsappErrOtp: 'Could not send verification code.',
  whatsappErrVerify: 'Verification failed.',
  whatsappErrAuthRequired: 'Verify your phone with WhatsApp before running the valuation.',
  wizardMainAria: 'Valuation wizard',
  skipToWizard: 'Skip to valuation form',
  wizardProgressAria: 'Wizard step progress',
  lifecycleGroupAria: 'Lifecycle stage',
  purposeGroupAria: 'Valuation purpose',
  stepPanelAria: 'Current wizard step',
  requiredField: 'required',
  invalidField: 'invalid',
  lifecycleSeed: 'Seed',
  lifecycleSeedSub: 'Pre-product / pre-revenue',
  lifecycleEarly: 'Early',
  lifecycleEarlySub: 'Initial traction & PMF',
  lifecycleGrowth: 'Growth',
  lifecycleGrowthSub: 'Scaling GTM & ops',
  lifecycleMature: 'Mature',
  lifecycleMatureSub: 'Stable cash generation',
  purposeMaTitle: 'M&A Sale',
  purposeMaDesc:
    'I want to sell the business or find a strategic partner.',
  purposeRaiseTitle: 'Capital Raise',
  purposeRaiseDesc:
    'I am looking for investors and want to know what to ask for.',
  purposeTaxTitle: 'Tax Planning',
  purposeTaxDesc:
    'I need a valuation for tax reporting or a family transfer.',
  purposeInternalTitle: 'Internal Report',
  purposeInternalDesc:
    'I want to understand my business value for planning.',
  compLow: 'Low',
  compModerate: 'Moderate',
  compBalanced: 'Balanced',
  compHigh: 'High',
  compIntense: 'Intense',
  currencyIls: '₪ Israeli Shekel (ILS)',
  currencyUsd: '$ US Dollar (USD)',
  currencyEur: '€ Euro (EUR)',
  currencyGbp: '£ British Pound (GBP)',
  analysisBrand: 'Equify Analysis',
  downloadReportPdf: 'Download Report (PDF)',
  keyFinancialMetricsTitle: 'Key Financial Metrics',
  valuationRangeTitle: 'Final Valuation Range',
  modelConfidenceTitle: 'Model Confidence',
  downloadReportPdfDesc: 'Captures this live dashboard — exact numbers & charts',
  businessOverviewTitle: 'Business Overview & Intangibles',
  businessOverviewEmpty:
    'No qualitative narrative was provided in the wizard. Add competitive moat, market context, and intangible assets for a richer report.',
  pdfReportTitle: 'Fair Market Valuation Report',
  pdfReportDate: 'Report date',
  pdfReportId: 'Report ID',
  runAnotherValuation: 'Run Another Valuation',
  backToHome: 'Back to Home',
  customLogoUpload: 'Upload company / advisory firm logo (optional)',
  customLogoUploadDesc: 'PNG or JPG — displayed on your PDF report cover (white-label).',
  customLogoRemove: 'Remove logo',
  customLogoErrorType: 'Please upload a PNG or JPG image.',
  customLogoErrorSize: 'Logo must be smaller than 2 MB.',
  healthScoreTitle: 'Business Health Score',
  technicalAnnexTitle: 'Technical DCF Schedule (Detail)',
  downloadingReport: 'Preparing PDF…',
  downloadReportFailed: 'PDF download failed. Please try again.',
  liveDcfSubtitle:
    'Live DCF recompute · 0ms client-side · Gordon perpetuity with endogenous reinvestment',
  bearCase: 'Bear Case',
  baseCase: 'Base Case',
  bullCase: 'Bull Case',
  arbitrageVsRef: 'Arbitrage vs. reference:',
  valuationTrajectory: 'Valuation Trajectory',
  trajectoryDesc: 'Explicit 5-year FCFF & implied enterprise value path',
  scenarioControls: 'Scenario Controls',
  scenarioControlsDesc: 'Adjust overlays — recalculates instantly in-browser.',
  growthAcceleration: 'Growth Acceleration',
  profitMarginAdj: 'Profit Margin Adjustment',
  engineSync: 'Engine sync',
  aiInsights: 'AI Insights',
  baseExplicitFcff: 'Base Case — Explicit FCFF (Live)',
  tableYear: 'Year',
  tableRevenue: 'Revenue',
  tableEbit: 'EBIT',
  tableFcff: 'FCFF',
  tablePvFcff: 'PV FCFF',
  tableCumPv: 'Cum. PV',
  terminalPvY5: 'Terminal PV (Y5 mid-year)',
  extendedProfileTitle: 'Extended Corporate Profile & Financial Diagnostics',
  extendedProfileDesc:
    'Accounting ratios derived from your intake — liquidity, leverage, and operating efficiency benchmarks.',
  liquidityMetrics: 'Liquidity Metrics',
  leverageMetrics: 'Leverage Metrics',
  operationalEfficiency: 'Operational Efficiency',
  diagnosticInterpretation: 'Interpretation',
  assetsProxyNote: 'Total assets estimated from revenue, cash, and debt inputs.',
  stObligationsNote: 'Short-term obligations estimated as ~35% of total debt plus interest.',
  chartTooltipYear: 'Year',
  severityInfo: 'info',
  severityWatch: 'watch',
  severityOpportunity: 'opportunity',
  insightArbUpTitle: 'Arbitrage Signal — Undervalued vs. Reference',
  insightArbUpBody:
    'Live EV exceeds the reference price by {pct}%. Consider tightening growth proof points before a capital raise narrative.',
  insightArbDownTitle: 'Downside Gap vs. Market Reference',
  insightArbDownBody:
    'Simulated EV trails reference by {pct}%. Margin expansion or churn reduction may be required to close the spread.',
  insightGrowthTitle: 'Aggressive Growth Acceleration',
  insightGrowthBody:
    '+{delta}pp growth overlay lifts terminal reinvestment requirements. Validate CAC payback and pipeline coverage.',
  insightMarginTitle: 'Margin Expansion Scenario',
  insightMarginBody:
    'Profitability uplift of {delta}pp improves NOPAT trajectory; stress-test opex scalability and gross margin durability.',
  insightReinvestTitle: 'Elevated Steady-State Reinvestment',
  insightReinvestBody:
    'Endogenous RR at {pct}% caps terminal FCF — Osem/Materna guard active. Long-term ROIC narrative is critical.',
  insightStableTitle: 'Baseline Alignment',
  insightStableBody:
    'Scenario sliders are near engine defaults. Review bear case liquidity coverage before board distribution.',
  ratioHealthy: 'Within typical range',
  ratioWatch: 'Monitor closely',
  ratioStress: 'Stress indicator',
  ratioNa: 'Insufficient data',
  currentRatioDesc:
    'Current assets (cash + ~2 months revenue) divided by estimated short-term obligations.',
  quickRatioDesc:
    'Liquid assets (cash + ~80% of one month revenue) over short-term obligations — excludes inventory proxy.',
  netDebtEbitdaDesc: 'Net debt (total debt minus cash) relative to EBITDA — leverage capacity.',
  debtEquityDesc: 'Total debt divided by estimated book equity (revenue-based proxy minus net debt).',
  assetTurnoverDesc: 'Revenue divided by estimated total assets — capital efficiency.',
  netMarginDesc: 'Estimated net income (from EBITDA, tax-adjusted) as a percent of revenue.',
  proxyTotalAssets: 'Total assets (proxy)',
  proxyStObligations: 'Short-term obligations (proxy)',
  proxyNetDebt: 'Net debt',
  proxyEquity: 'Book equity (proxy)',
  proxyNetIncome: 'Estimated net income',
  wizardSaved: 'Saved ✓',
  rdHistoryEmpty: 'Not set',
};

const HE: TranslationMap = {
  langToggle: 'English',
  langToggleAria: 'מעבר לאנגלית',
  brand: 'Equify',
  wizardTitle: 'אשף הערכת שווי',
  wizardSubtitle:
    'קליטת נתונים ברמת דירקטוריון — ארבעה שלבים לפלט מוסדי.',
  stepLabel: 'שלב',
  stepCompanyProfile: 'פרופיל החברה',
  stepFinancialInputs: 'נתונים פיננסיים',
  stepRiskModifiers: 'מאפייני סיכון ורגישות',
  stepValuationPurpose: 'מטרת הערכה',
  back: 'חזרה',
  continue: 'המשך',
  runValuation: 'הפעל הערכת שווי',
  verifyingPayment: 'מאמת תשלום…',
  selectPlaceholder: 'בחר…',
  helpAria: 'עזרה',
  companyProfileTitle: 'פרופיל החברה',
  companyProfileDesc: 'הגדרת הקשר משפטי ועסקי המעגנת את נרטיב ההערכה.',
  legalName: 'שם משפטי / מסחרי',
  fullName: 'שם מלא',
  fullNamePlaceholder: 'לדוגמה: ישראל ישראלי',
  industry: 'ענף',
  reportingCurrency: 'מטבע דיווח',
  incorporationCountry: 'מדינת התאגדות',
  foundedYear: 'שנת הקמה',
  lifecycleStage: 'שלב מחזור חיים',
  qualitativeDescription:
    'יתרון תחרותי, מצב שוק ונכסים ייחודיים',
  qualitativeDescriptionDesc:
    'תאר חפיר תחרותי, דינמיקת שוק, פטנטים, מותג ונכסים בלתי מוחשיים — יופיעו בדוח ה-PDF.',
  qualitativeDescriptionPlaceholder:
    'לדוגמה: פלטפורמת AI קניינית, 3 פטנטים בתהליך, 40% חוזים חוזרים בענף הבריאות…',
  financialInputsTitle: 'נתונים פיננסיים',
  financialInputsDesc: 'מדדי תפעול מרכזיים למנוע ההערכה של Equify.',
  saasModeActive: 'מצב SaaS פעיל — ARR ונשירה מופעלים.',
  annualRevenue: 'הכנסות שנתיות',
  annualRevenueActual: 'הכנסות שנתיות (בפועל)',
  revenueForecastY1: 'הכנסות שנתית 1 (תחזית DCF)',
  modelMethodNote:
    'המודל מיישם היוון אמצע-שנה והנחות השקעה-חוזרת סטנדרטיות (McKinsey framework).',
  blendedEnterpriseValue: 'שווי פעילות משוקלל',
  weightingExplainer: 'שקלול בין תזרים מהוון (DCF) למכפילי שוק ישראליים.',
  annualArr: 'הכנסה חוזרת שנתית (ARR)',
  annualChurnRate: 'שיעור נשירה שנתי (%)',
  churnTooltipTitle: 'שיעור נשירה שנתי',
  churnTooltip:
    'נשירת לקוחות או הכנסות בבסיס שנתי. משמש לבחינת איכות הכנסה חוזרת וצמיחה מותאמת שימור בהערכות SaaS.',
  ebitda: 'רווח תפעולי לפני פחת (EBITDA)',
  ebitdaTooltipTitle: 'רווח תפעולי לפני פחת (EBITDA)',
  ebitdaTooltip:
    'כמה כסף העסק מייצר לפני תשלום ריבית, מסים ופחת. בדרך כלל: רווח נקי + פחת + ריבית + מסים.',
  freeCashFlow: 'תזרים חופשי',
  fcfTooltipTitle: 'תזרים חופשי',
  fcfTooltip:
    'הכסף שנשאר לאחר כל ההוצאות התפעוליות — מה שאפשר למשוך או להשקיע.',
  interestExpense: 'תשלומי ריבית שנתיים',
  interestExpenseTooltip:
    'סך תשלומי הריבית על הלוואות ואשראי, לא הקרן עצמה.',
  totalDebt: 'סך חוב',
  cashEquivalents: 'כסף נזיל',
  cashEquivalentsTooltip:
    'מזומן, פיקדונות לזמן קצר וניירות ערך נזילים — נכסים שניתן לממש תוך שלושים יום לצורך חישוב חוב נטו.',
  netDebt: 'חוב נטו (מחושב אוטומטית)',
  netDebtDesc:
    'מחושב אוטומטית: סך החוב פחות הכסף הנזיל שהזנת.',
  netDebtHint: 'מחושב מהנתונים: {amount}',
  netDebtFormula: 'סך חוב פחות כסף נזיל',
  financialShorthandExpanded: 'מפורש כ-{amount}',
  financialShorthandPlaceholder: 'לדוגמה: 12m, 30k, 1.5b',
  rdHistoryTitle: 'היסטוריית הוצאות מו"פ (5 שנים)',
  rdHistoryDesc:
    'מהישן לחדש — מזין היוון הוצאות מו"פ במנוע ההערכה.',
  rdYear2025: 'השנה (2025)',
  rdYear2024: 'שנה שעברה (2024)',
  rdYear2023: '2023',
  rdYear2022: '2022',
  rdYear2021: '2021',
  riskModifiersTitle: 'מאפייני סיכון ורגישות',
  riskModifiersDesc:
    'כיול מאפייני סיכון, רגישות WACC וגורמי תלות — לדיוק אינדיקציית השווי המשוקללת.',
  recurringRevenuePct: 'כמה אחוז מהלקוחות שלך חוזרים מדי שנה?',
  recurringRevenuePctHint: '0% = כולם חדשים כל שנה | 100% = כולם מתחדשים',
  customerConcentrationOver20: 'האם לקוח בודד אחד מהווה יותר מ-20% מהכנסותיך?',
  customerConcentrationOver20Desc:
    'ריכוז לקוחות מהותי מעלה את פרמיית הסיכון במודל ההערכה.',
  customerConcentrationPct: 'כמה אחוז מההכנסות מגיע מהלקוח הגדול ביותר שלך?',
  levelOfCompetition: 'רמת תחרות',
  competitionAria: 'רמת תחרות',
  ipProtection: 'הגנת קניין רוחני',
  ipProtectionDesc: 'פטנטים, סימני מסחר או טכנולוגיה קניינית',
  founderDependency: 'תלות במייסדים',
  founderDependencyDesc: 'סיכון אדם מפתח מהותי להכנסות או לתפעול',
  valuationPurposeTitle: 'מטרת הערכה',
  valuationPurposeDesc:
    'הקשר העסקה — משפיע על פרמיית שליטה וטיפול בהנחת אי-נזילות.',
  userIdentifiersTitle: 'אימות זהות (חובה)',
  userIdentifiersDesc:
    'כל ארבעת השדות חובה לפני הרצת הערכה או גישה לדוח וללוח התוצאות. מספר הנייד משמש למשלוח דוח ה-PDF המאומת ב-WhatsApp.',
  userMobilePhone: 'טלפון נייד',
  userMobilePhonePlaceholder: '05X-XXXXXXX',
  userMobilePhoneWhatsAppHint:
    'מספר WhatsApp ראשי — דוח ההערכה יישלח לכאן לאחר האימות.',
  userNationalId: 'ת.ז',
  userNationalIdPlaceholder: '9 ספרות',
  userCorporateTaxId: 'ח.פ חברה',
  userCorporateTaxIdPlaceholder: '9 ספרות',
  userEmail: 'אימייל',
  userEmailPlaceholder: 'name@company.co.il',
  errUserMobileRequired: 'טלפון נייד נדרש.',
  errUserMobileInvalid: 'יש להזין מספר נייד ישראלי תקין (05X-XXXXXXX).',
  errUserNationalIdRequired: 'ת.ז נדרשת.',
  errUserNationalIdInvalid: 'יש להזין ת.ז תקינה בת 9 ספרות.',
  errUserCorpIdRequired: 'ח.פ חברה נדרש.',
  errUserCorpIdInvalid: 'יש להזין מספר ח.פ תקין בת 9 ספרות.',
  errUserEmailRequired: 'אימייל נדרש.',
  errUserEmailInvalid: 'יש להזין כתובת אימייל תקינה.',
  errUserIdentifiersGate:
    'יש להשלים את כל שדות הזיהוי בשלב 1 לפני הרצת ההערכה או הורדת הדוח.',
  errReportIdentifiersGate:
    'אימות הזהות לא הושלם. חזור לאשף והשלם את כל השדות הנדרשים.',
  errCompanyName: 'שם החברה נדרש.',
  errFullName: 'שם מלא נדרש.',
  errIndustry: 'יש לבחור ענף.',
  errLifecycle: 'יש לבחור שלב מחזור חיים.',
  errRevenue: 'הכנסות שנתיות נדרשות.',
  errArr: 'ARR נדרש.',
  errChurn: 'שיעור נשירה נדרש עבור SaaS.',
  errPurpose: 'יש לבחור מטרת הערכה.',
  errTermsRequired: 'יש לאשר את תנאי השימוש ואת הצהרת הסיכון לפני המשך.',
  termsCheckboxAria: 'אישור תנאי שימוש והצהרת סיכון פיננסי',
  whatsappAuthTitle: 'התחברות עם WhatsApp',
  whatsappAuthDesc: 'אימות ללא סיסמה — נשלח קוד בן 4 ספרות לנייד.',
  whatsappAuthAria: 'אימות טלפון ב-WhatsApp',
  whatsappPhoneLabel: 'מספר נייד (E.164)',
  whatsappPhonePlaceholder: '+972501234567',
  whatsappOtpLabel: 'קוד אימות בן 4 ספרות',
  whatsappRequestOtp: 'שלח קוד',
  whatsappVerifyOtp: 'אמת והמשך',
  whatsappSending: 'שולח…',
  whatsappVerifying: 'מאמת…',
  whatsappOtpSent: 'קוד האימות נשלח ב-WhatsApp.',
  whatsappAuthSuccess: 'הטלפון אומת. התחברת בהצלחה.',
  whatsappVerifiedAs: 'מחובר כ-{phone}',
  whatsappSignOut: 'התנתק',
  whatsappErrPhone: 'הזן מספר טלפון תקין.',
  whatsappErrCode: 'הזן את קוד בן 4 הספרות.',
  whatsappErrOtp: 'לא ניתן לשלוח קוד אימות.',
  whatsappErrVerify: 'האימות נכשל.',
  whatsappErrAuthRequired: 'יש לאמת את הטלפון ב-WhatsApp לפני הרצת ההערכה.',
  wizardMainAria: 'אשף הערכת שווי',
  skipToWizard: 'דלג לטופס הערכה',
  wizardProgressAria: 'התקדמות שלבי האשף',
  lifecycleGroupAria: 'שלב מחזור חיים',
  purposeGroupAria: 'מטרת הערכה',
  stepPanelAria: 'שלב נוכחי באשף',
  requiredField: 'שדה חובה',
  invalidField: 'שדה לא תקין',
  lifecycleSeed: 'Seed / שלב הרעיון',
  lifecycleSeedSub: 'לפני מוצר / טרם יצירת הכנסות',
  lifecycleEarly: 'Early Stage / שלבים ראשוניים',
  lifecycleEarlySub: 'חדירה לשוק והוכחת היתכנות (PMF)',
  lifecycleGrowth: 'Growth / שלב הצמיחה',
  lifecycleGrowthSub: 'האצת מכירות והתרחבות תפעולית',
  lifecycleMature: 'Mature / חברה מבוססת',
  lifecycleMatureSub: 'תזרים מזומנים יציב ורווחיות מוכחת',
  purposeMaTitle: 'מכירה / M&A',
  purposeMaDesc: 'אני רוצה למכור את העסק או למצוא שותף אסטרטגי',
  purposeRaiseTitle: 'גיוס הון',
  purposeRaiseDesc: 'אני מחפש משקיעים ורוצה לדעת מה לבקש',
  purposeTaxTitle: 'תכנון מס',
  purposeTaxDesc: 'אני צריך הערכה לצורך דיווח מס או העברה משפחתית',
  purposeInternalTitle: 'דוח פנימי',
  purposeInternalDesc: 'אני רוצה להבין את שווי העסק שלי לתכנון עסקי',
  compLow: '★☆☆☆☆ כמעט אין מתחרים בתחומי',
  compModerate: '★★☆☆☆ יש כמה מתחרים, אני מובל',
  compBalanced: '★★★☆☆ תחרות בינונית',
  compHigh: '★★★★☆ תחרות גבוהה',
  compIntense: '★★★★★ שוק מאוד תחרותי, אני אחד מרבים',
  currencyIls: '₪ שקל (ILS)',
  currencyUsd: '$ דולר (USD)',
  currencyEur: '€ אירו (EUR)',
  currencyGbp: '£ לירה (GBP)',
  analysisBrand: 'ניתוח Equify',
  downloadReportPdf: 'הורדת דוח (PDF)',
  keyFinancialMetricsTitle: 'מדדים פיננסיים מרכזיים',
  valuationRangeTitle: 'טווח הערכת שווי סופי',
  modelConfidenceTitle: 'רמת ביטחון במודל',
  downloadReportPdfDesc: 'צילום מסך של לוח הבקרה החי — מספרים וגרפים מדויקים',
  businessOverviewTitle: 'סקירה עסקית ונכסים בלתי מוחשיים',
  businessOverviewEmpty:
    'לא סופק תיאור איכותני באשף. הוסיפו יתרון תחרותי, הקשר שוק ונכסים בלתי מוחשיים לדוח עשיר יותר.',
  pdfReportTitle: 'דוח הערכת שווי שוק הוגן',
  pdfReportDate: 'תאריך הדוח',
  pdfReportId: 'מזהה דוח',
  runAnotherValuation: 'בצע הערכת שווי נוספת',
  backToHome: 'חזור לדף הבית',
  customLogoUpload: 'העלה לוגו חברה / משרד ייעוץ (אופציונלי)',
  customLogoUploadDesc: 'PNG או JPG — יוצג על עמוד השער בדוח ה-PDF (White Label).',
  customLogoRemove: 'הסר לוגו',
  customLogoErrorType: 'יש להעלות קובץ PNG או JPG בלבד.',
  customLogoErrorSize: 'גודל הלוגו חייב להיות קטן מ-2MB.',
  healthScoreTitle: 'ציון בריאות עסקית',
  technicalAnnexTitle: 'נספח טכני — לוח DCF מפורט',
  downloadingReport: 'מכין את הדוח…',
  downloadReportFailed: 'הורדת הדוח נכשלה. נסו שוב.',
  liveDcfSubtitle:
    'חישוב DCF חי · מיידי בדפדפן · ערך נוכחי עם השקעה מחדש אנדוגנית',
  bearCase: 'תרחיש דובי',
  baseCase: 'תרחיש בסיס',
  bullCase: 'תרחיש שורי',
  arbitrageVsRef: 'ארביטראז\' מול אסמכתא:',
  valuationTrajectory: 'מסלול הערכת שווי',
  trajectoryDesc: 'תזרים חופשי ל-5 שנים ומסלול שווי פעילות מרומז',
  scenarioControls: 'בקרת תרחישים',
  scenarioControlsDesc: 'התאמת מקדמים — חישוב מחדש מיידי בדפדפן.',
  growthAcceleration: 'האצת צמיחה',
  profitMarginAdj: 'התאמת שולי רווח',
  engineSync: 'סנכרון מנוע',
  aiInsights: 'תובנות AI',
  baseExplicitFcff: 'תרחיש בסיס — תזרים מפורש (חי)',
  tableYear: 'שנה',
  tableRevenue: 'הכנסות',
  tableEbit: 'EBIT',
  tableFcff: 'תזרים חופשי',
  tablePvFcff: 'ערך נוכחי תזרים',
  tableCumPv: 'ערך נוכחי מצטבר',
  terminalPvY5: 'ערך נוכחי טרמינלי (שנה 5)',
  extendedProfileTitle: 'פרופיל תאגידי מורחב ואבחון פיננסי',
  extendedProfileDesc:
    'יחסי חשבונאות מהקליטה שלך — נזילות, מינוף ויעילות תפעולית.',
  liquidityMetrics: 'מדדי נזילות',
  leverageMetrics: 'מדדי מינוף',
  operationalEfficiency: 'יעילות תפעולית',
  diagnosticInterpretation: 'פרשנות',
  assetsProxyNote:
    'סך נכסים מוערך מהכנסות, מזומנים וחוב — פרוקסי לדוחות חלקיים.',
  stObligationsNote:
    'התחייבויות לטווח קצר מוערכות כ-~35% מהחוב בתוספת ריבית.',
  chartTooltipYear: 'שנה',
  severityInfo: 'מידע',
  severityWatch: 'מעקב',
  severityOpportunity: 'הזדמנות',
  insightArbUpTitle: 'אות ארביטראז\' — תמחור נמוך מול אסמכתא',
  insightArbUpBody:
    'שווי הפעילות החי עולה על מחיר האסמכתא ב-{pct}%. מומלץ לחזק הוכחות צמיחה לפני נרטיב גיוס.',
  insightArbDownTitle: 'פער לרעה מול שווי שוק',
  insightArbDownBody:
    'שווי מדומה נמוך ב-{pct}% מהאסמכתא. ייתכן שיידרש שיפור שוליים או הפחתת נשירה.',
  insightGrowthTitle: 'האצת צמיחה אגרסיבית',
  insightGrowthBody:
    'תוספת של {delta} נקודות אחוז לצמיחה מעלה דרישות השקעה מחדש בטרמינל. יש לאמת החזר CAC וצינור מכירות.',
  insightMarginTitle: 'תרחיש הרחבת שוליים',
  insightMarginBody:
    'שיפור רווחיות של {delta} נקודות משפר מסלול NOPAT; בדקו קיימות שוליים גולמיים.',
  insightReinvestTitle: 'השקעה מחדש גבוהה בטווח ארוך',
  insightReinvestBody:
    'שיעור השקעה מחדש אנדוגני {pct}% מגביל תזרים טרמינלי — נדרש נרטיב ROIC לטווח ארוך.',
  insightStableTitle: 'יישור לקו בסיס',
  insightStableBody:
    'מחווני התרחיש קרובים לברירת מחדל. בדקו כיסוי נזילות בתרחיש דובי לפני הפצה לדירקטוריון.',
  ratioHealthy: 'בטווח אופייני',
  ratioWatch: 'דורש מעקב',
  ratioStress: 'אינדיקטור לחץ',
  ratioNa: 'נתונים לא מספיקים',
  currentRatioDesc:
    'נכסים שוטפים (מזומן + ~חודשיים הכנסות) חלקי התחייבויות לטווח קצר מוערכות.',
  quickRatioDesc:
    'נכסים נזילים (מזומן + ~80% מהכנסה חודשית) על התחייבויות קצרות — ללא מלאי מוערך.',
  netDebtEbitdaDesc: 'חוב נטו (חוב פחות מזומן) ביחס ל-EBITDA — עמידות מינוף.',
  debtEquityDesc: 'סך חוב חלקי הון ספרים מוערך (פרוקסי מהכנסות פחות חוב נטו).',
  assetTurnoverDesc: 'הכנסות חלקי סך נכסים מוערך — יעילות הון.',
  netMarginDesc: 'רווח נקי מוערך (מ-EBITDA, לאחר מס) כאחוז מהכנסות.',
  proxyTotalAssets: 'סך נכסים (פרוקסי)',
  proxyStObligations: 'התחייבויות לטווח קצר (פרוקסי)',
  proxyNetDebt: 'חוב נטו',
  proxyEquity: 'הון ספרים (פרוקסי)',
  proxyNetIncome: 'רווח נקי מוערך',
  wizardSaved: 'נשמר ✓',
  rdHistoryEmpty: 'לא הוזן',
};

export type TranslationKey = keyof typeof EN;

function getMap(locale: ValuationLocale): TranslationMap {
  return locale === 'he' ? HE : EN;
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`,
  );
}

export function createValuationTranslations(
  locale: ValuationLocale,
): ValuationTranslations {
  const map = getMap(locale);
  const t = (key: TranslationKey) => map[key] ?? EN[key] ?? key;
  const tf = (key: TranslationKey, vars: Record<string, string | number>) =>
    interpolate(t(key), vars);
  return {
    locale,
    dir: locale === 'he' ? 'rtl' : 'ltr',
    isRtl: locale === 'he',
    t,
    tf,
    terms: locale === 'he' ? FIN_TERMS_HE : FIN_TERMS_EN,
  };
}

export function formatValuationCurrency(
  value: number,
  currency: string,
  locale: ValuationLocale,
  compact = false,
): string {
  if (!Number.isFinite(value)) return '—';
  if (compact) return formatCurrencyShort(value, currency);
  if (currency === 'ILS') return formatILS(value);
  const intlLocale = locale === 'he' ? 'he-IL' : 'en-US';
  try {
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return formatCurrencyShort(value, currency);
  }
}

const ValuationI18nContext = createContext<{
  locale: ValuationLocale;
  setLocale: (locale: ValuationLocale) => void;
  i18n: ValuationTranslations;
} | null>(null);

export function ValuationI18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<ValuationLocale>('he');

  useEffect(() => {
    setLocaleState(readValuationLocale());
  }, []);

  const setLocale = useCallback((next: ValuationLocale) => {
    setLocaleState(next);
    writeValuationLocale(next);
  }, []);

  const i18n = useMemo(() => createValuationTranslations(locale), [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, i18n }),
    [locale, setLocale, i18n],
  );

  return (
    <ValuationI18nContext.Provider value={value}>{children}</ValuationI18nContext.Provider>
  );
}

export function useValuationI18n() {
  const ctx = useContext(ValuationI18nContext);
  if (!ctx) {
    throw new Error('useValuationI18n must be used within ValuationI18nProvider');
  }
  return ctx;
}

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale, i18n } = useValuationI18n();
  const next: ValuationLocale = locale === 'en' ? 'he' : 'en';

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      aria-label={i18n.t('langToggleAria')}
      className={
        className ??
        'rounded-xl border border-mint-400/40 bg-slate-800/80 px-4 py-2 text-sm font-semibold text-mint-400 shadow-inner shadow-black/20 transition hover:border-mint-400 hover:bg-slate-800 hover:text-mint-400/90'
      }
    >
      {i18n.t('langToggle')}
    </button>
  );
}
