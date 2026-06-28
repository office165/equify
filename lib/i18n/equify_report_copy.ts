/** Shared report & landing methodology copy (HE + EN) */

import type { SensitivityMatrix } from '../pdf-template/types';
import type { EquifySectorKey } from '../valuation';

export type ScenarioNarrativeKey = 'bear' | 'base' | 'bull';

export interface ScenarioNarrativeCopy {
  description: string;
  fullDescription: string;
}

export interface ScenarioNarrativeParams {
  growthPct: number;
  baseGrowthPct: number;
  ebitdaMarginPct: number;
  baseEbitdaMarginPct: number;
}

const SECTOR_MARKET_HE: Record<EquifySectorKey, string> = {
  hospitality: 'שוק האירוח והשירותים',
  saas: 'שוק התוכנה וה-SaaS',
  fintech: 'שוק הפינטק והשירותים הפיננסיים',
  cyber: 'שוק הסייבר והטכנולוגיה',
  health: 'שוק הבריאות והביוטק',
  services: 'שוק השירותים המקצועיים',
  industry: 'שוק התעשייה והייצור',
  ecom: 'שוק המסחר והאיקומרס',
  retail_trade: 'שוק המסחר והקמעונאות הפיזית',
  food_service: 'שוק המסעדנות ושירותי המזון',
  energy: 'שוק האנרגיה והתשתיות',
  defense_aerospace: 'שוק הביטחון, התעופה והחלל',
  real_estate: 'שוק הנדל"ן, הבינוי והתשתיות',
  other: 'השוק הרלוונטי',
};

const SECTOR_MARKET_EN: Record<EquifySectorKey, string> = {
  hospitality: 'hospitality and services',
  saas: 'software and SaaS',
  fintech: 'fintech and financial services',
  cyber: 'cyber and technology',
  health: 'healthcare and biotech',
  services: 'professional services',
  industry: 'industry and manufacturing',
  ecom: 'commerce and e-commerce',
  retail_trade: 'physical retail trade',
  food_service: 'food service and restaurants',
  energy: 'energy and infrastructure',
  defense_aerospace: 'defense, aviation and aerospace',
  real_estate: 'real estate, construction and infrastructure',
  other: 'the relevant market',
};

function bearFullDescriptionEn(
  sectorKey: EquifySectorKey,
  growthPct: number,
  ebitdaDelta: number,
): string {
  const delta = Math.max(1, Math.round(ebitdaDelta));
  const growth = Math.round(growthPct);
  if (sectorKey === 'hospitality') {
    return `In this scenario, hospitality and services compress, clients use bargaining power to improve terms, and cash flows contract. EBITDA falls ${delta} percentage points, growth slows to ${growth}%, and specific risk rises.`;
  }
  const market = SECTOR_MARKET_EN[sectorKey];
  return `In this scenario, ${market} contracts, pricing pressure intensifies, and cash flows contract. EBITDA falls ${delta} percentage points, growth slows to ${growth}%, and specific risk rises.`;
}

function baseFullDescriptionEn(): string {
  return 'Neutral case: the market continues at its current pace, management holds course, and no structural shifts occur. Your inputs are the baseline.';
}

function bullFullDescriptionEn(
  sectorKey: EquifySectorKey,
  growthPct: number,
  ebitdaDelta: number,
): string {
  const delta = Math.max(1, Math.round(ebitdaDelta));
  const growth = Math.round(growthPct);
  if (sectorKey === 'hospitality') {
    return `In an optimistic scenario, management expands facilities or service capacity, wins clients on better terms, and cash flows improve. EBITDA rises ${delta} percentage points and growth accelerates to ${growth}%.`;
  }
  const market = SECTOR_MARKET_EN[sectorKey];
  return `In an optimistic scenario, management expands in ${market}, wins strategic clients on better terms, and cash flows improve. EBITDA rises ${delta} percentage points and growth accelerates to ${growth}%.`;
}

function bearFullDescriptionHe(
  sectorKey: EquifySectorKey,
  growthPct: number,
  ebitdaDelta: number,
): string {
  const delta = Math.max(1, Math.round(ebitdaDelta));
  const growth = Math.round(growthPct);
  if (sectorKey === 'hospitality') {
    return `בתרחיש זה, שוק האירוח והשירותים מתכנס, מתן לקוחות משתמשים בכוח מיקוח כדי לשפר תנאים, ותזרימים מתכווצים. EBITDA יורד ב-${delta} נקודות אחוז, צמיחה מאטה ל-${growth}%, וסיכון ספציפי עולה.`;
  }
  const market = SECTOR_MARKET_HE[sectorKey];
  return `בתרחיש זה, ${market} מתכנס, לחץ מחירים מחמיר, ותזרימים מתכווצים. EBITDA יורד ב-${delta} נקודות אחוז, צמיחה מאטה ל-${growth}%, וסיכון ספציפי עולה.`;
}

function baseFullDescriptionHe(): string {
  return 'תרחיש ניטרלי: השוק ממשיך בקצב הנוכחי, הנהלה משמרת מטבח, ולא קורים שינויים מבניים. הנתונים שהזנת הם הבסיס.';
}

function bullFullDescriptionHe(
  sectorKey: EquifySectorKey,
  growthPct: number,
  ebitdaDelta: number,
): string {
  const delta = Math.max(1, Math.round(ebitdaDelta));
  const growth = Math.round(growthPct);
  if (sectorKey === 'hospitality') {
    return `בתרחיש אופטימי, הנהלה מרחיבה את המתקנים או שירותי הליווי, מושכת לקוחות עם שיעורי טוב יותר, ותזרימים משתפרים. EBITDA עולה ב-${delta} נקודות אחוז, צמיחה מתנווה ל-${growth}%.`;
  }
  const market = SECTOR_MARKET_HE[sectorKey];
  return `בתרחיש אופטימי, הנהלה מרחיבה את הפעילות ב${market}, מושכת לקוחות אסטרטגיים עם תנאים טובים יותר, ותזרימים משתפרים. EBITDA עולה ב-${delta} נקודות אחוז, צמיחה מתנווה ל-${growth}%.`;
}

/** Per-scenario short + narrative copy for PDF and results */
export function getScenarioNarrative(
  scenarioKey: ScenarioNarrativeKey,
  sectorKey: EquifySectorKey,
  params: ScenarioNarrativeParams,
  locale: 'he' | 'en' = 'he',
): ScenarioNarrativeCopy {
  const bearDelta = Math.max(
    0,
    params.baseEbitdaMarginPct - params.ebitdaMarginPct,
  );
  const bullDelta = Math.max(
    0,
    params.ebitdaMarginPct - params.baseEbitdaMarginPct,
  );

  if (scenarioKey === 'bear') {
    const delta = bearDelta || 2;
    if (locale === 'en') {
      return {
        description: `Sector slowdown · Pricing pressure · −${Math.round(delta)}% EBITDA`,
        fullDescription: bearFullDescriptionEn(sectorKey, params.growthPct, delta),
      };
    }
    return {
      description: `האטה ענפית · לחץ מחירים · −${Math.round(delta)}% EBITDA`,
      fullDescription: bearFullDescriptionHe(sectorKey, params.growthPct, delta),
    };
  }

  if (scenarioKey === 'base') {
    if (locale === 'en') {
      return {
        description: 'Current trend continues · Stable EBITDA · Unchanged customer concentration',
        fullDescription: baseFullDescriptionEn(),
      };
    }
    return {
      description: 'המשך מגמה נוכחית · EBITDA יציב · ריכוז לקוחות ללא שינוי',
      fullDescription: baseFullDescriptionHe(),
    };
  }

  const delta = bullDelta || 2;
  if (locale === 'en') {
    return {
      description: `Capacity expansion · Strategic client wins · +${Math.round(delta)}% EBITDA`,
      fullDescription: bullFullDescriptionEn(sectorKey, params.growthPct, delta),
    };
  }
  return {
    description: `הרחבת קיבולת · גיוס לקוחות אסטרטגי · +${Math.round(delta)}% EBITDA`,
    fullDescription: bullFullDescriptionHe(sectorKey, params.growthPct, delta),
  };
}

export function resolveEquifySectorKey(sector?: string): EquifySectorKey {
  const keys: EquifySectorKey[] = [
    'hospitality',
    'saas',
    'fintech',
    'cyber',
    'health',
    'services',
    'industry',
    'ecom',
    'retail_trade',
    'food_service',
    'energy',
    'defense_aerospace',
    'real_estate',
    'other',
  ];
  if (sector && keys.includes(sector as EquifySectorKey)) {
    return sector as EquifySectorKey;
  }
  return 'other';
}

export const VALUATION_METHODOLOGY_COPY =
  'דוח הערכת שווי בנוי על שלושה יסודות: תזרימי מזומנים מהוונים (DCF) בעלות הון בר-סיכון, מכפילי שוק מכוילים מתוך 12 עסקאות M&A בישראל בשנתיים האחרונות, וציון איכות המעריך את יציבות התזרים. השווי המוצג הוא ממוצע משוקלל של שלוש שיטות, לא אקדמי אלא מעשי השוק בפועל.' as const;

export const FINANCIAL_DATA_COPY =
  'הכנסות מוצגות לפי דוחות כספיים; בסיס ה-EBITDA לשווי הוא ממוצע משוקלל (30% שנה קודמת · 50% שנה נוכחית · 20% תחזית) בהתאם לנהלי M&A. צמיחת התחזית מוגבלת לתקרת הענף. ניתן להציג את הנתונים בישיבת בנק או מול משקיע.' as const;

export const FINANCIAL_DATA_COPY_EN =
  'Revenue reflects reported financials; the EBITDA base for valuation is a weighted average (30% prior · 50% current · 20% projected) per M&A practice. Forward growth is capped by sector guardrails. Suitable for bank or investor meetings.' as const;

export const WACC_DCF_METHODOLOGY_COPY =
  'עלות ההון (WACC) נמדדת לפי תורת Damodaran תחת CAPM: ריבית חסרת סיכון (אג״ח ממשלתי 10 שנים), פרמיית סיכון שוק (היסטורית), פרמיית סיכון מדינה, פרמיית גודל וסחירות. תרומת הסיכון הספציפי לעסק (Quality Score) מותאמת במודול האיכות שלנו. הערך הטרמינלי מבוסס על צמיחה ניטרלית של 2.5% כדי להימנע מהיפר-ערכה.' as const;

export const WACC_DCF_METHODOLOGY_COPY_EN =
  "Cost of capital (WACC) follows Damodaran's CAPM framework: risk-free rate (10-year government bond), historical equity risk premium, country risk premium, and size/liquidity premium. Company-specific risk (Quality Score) is calibrated in our quality module. Terminal value uses neutral 2.5% growth to avoid overvaluation." as const;

export function multiplesMethodologyCopy(sector: string): string {
  return `המכפילים מעוגנים בנתונים של 12 עסקאות M&A בישראל בתחום ${sector} (2023–2026). לכל עסקה: סכום, תאריך, שיעור EBITDA, והשוואה לחברות ציבוריות בחו״ל כאשר רלוונטי. המכפיל שלך לא נלקח מהאוויר — הוא מיקום בהתפלגות שוק אמיתית.`;
}

export function multiplesMethodologyCopyEn(sector: string): string {
  return `Multiples are anchored to 12 Israeli M&A transactions in ${sector} (2023–2026). Each deal records consideration, date, EBITDA margin, and listed international peers where relevant. Your multiple is not arbitrary — it marks a position on a real market distribution.`;
}

export interface EbitdaMultipleInterpretationParams {
  locale?: 'he' | 'en';
  effectiveMult: number;
  qualityScore: number;
  qualityGrade: string;
  multipleConcentrationPenalty?: number;
}

/** PDF multiples table — פרשנות row for EBITDA multiple (natural language). */
export function ebitdaMultipleInterpretationCopy(
  params: EbitdaMultipleInterpretationParams,
): string {
  const mult = params.effectiveMult.toFixed(1);
  const score = Math.round(params.qualityScore);
  const grade = params.qualityGrade;
  const penalty = params.multipleConcentrationPenalty ?? 0;

  if (params.locale === 'en') {
    let text = `The multiple was calibrated to ${mult}× based on the company's quality score (${score}/${grade}), reflecting its normalized risk profile versus the market.`;
    if (penalty > 0) {
      text += ` Reduced by ${penalty.toFixed(1)}× due to customer concentration.`;
    }
    return text;
  }

  let text = `המכפיל הותאם לרמה של ${mult}× על בסיס ציון האיכות של החברה (${score}/${grade}), המשקף את פרופיל הסיכון המנורמל שלה מול השוק.`;
  if (penalty > 0) {
    text += ` הופחת ב-${penalty.toFixed(1)}× בשל ריכוז לקוחות.`;
  }
  return text;
}

export const QUALITY_METHODOLOGY_COPY =
  'ציון האיכות משקלל שבעה גורמים שמשפיעים על סיכון התזרים: יציבות הכנסות (חוזרות מול חד-פעמיות), גיוון לקוחות (ריכוז מול פיזור), תלות במנהיגות או מייסדים, עוצמת התחרות בענף, הגנות קניין רוחני, אורך החוזים עם לקוחות, וקצב הצמיחה הצפוי. כל גורם קיבל משקל על בסיס רלוונטיות לעסק שלך.' as const;

export const QUALITY_METHODOLOGY_COPY_EN =
  'The Quality Score blends seven factors that affect cash-flow risk: revenue stability (recurring vs. one-off), customer diversification (concentration vs. spread), leadership or founder dependency, sector competition intensity, intellectual property protections, contract length with customers, and expected growth rate. Each factor is weighted by relevance to your business.' as const;

function qualityScoreInterpretationHe(grade: string): string {
  if (grade === 'A') return 'משמעו: עסק באיכות גבוהה, עם יציבות תזרים מובחנת.';
  if (grade === 'A−') return 'משמעו: עסק חזק, עם סיכונים מוגבלים ומנוהלים היטב.';
  if (grade === 'B+') return 'משמעו: עסק שמעל לממוצע, עם סיכונים מחושבים אך לא קריטיים.';
  if (grade === 'B') return 'משמעו: עסק בטווח הממוצע, עם חשיפות סטנדרטיות לענף.';
  if (grade === 'B−') return 'משמעו: עסק מתחת לממוצע, עם חשיפות שמחייבות הקשר בפרשנות.';
  return 'משמעו: סיכוני תזרים משמעותיים — דורש זהירות בקבלת החלטות.';
}

function qualityScoreInterpretationEn(grade: string): string {
  if (grade === 'A') return 'Interpretation: high-quality business with pronounced cash-flow stability.';
  if (grade === 'A−') return 'Interpretation: strong business with limited, well-managed risk.';
  if (grade === 'B+') return 'Interpretation: above-average business with measured, non-critical risks.';
  if (grade === 'B') return 'Interpretation: mid-range business with sector-standard exposures.';
  if (grade === 'B−') return 'Interpretation: below-average business — context required when interpreting value.';
  return 'Interpretation: material cash-flow risks — interpret valuation with caution.';
}

/** PDF page 7 — Quality Score narrative with live score and grade */
export function qualityScoreIntroCopy(score: number, grade: string): string {
  const rounded = Math.round(score);
  return `${QUALITY_METHODOLOGY_COPY} הציון שהתקבל (${rounded}/100, ${grade}) ${qualityScoreInterpretationHe(grade)}`;
}

export function qualityScoreIntroCopyEn(score: number, grade: string): string {
  const rounded = Math.round(score);
  return `${QUALITY_METHODOLOGY_COPY_EN} Score achieved: ${rounded}/100, ${grade}. ${qualityScoreInterpretationEn(grade)}`;
}

export const SCENARIOS_METHODOLOGY_COPY =
  'שלוש תרחישים משקפים מסלולים עתידיים אפשריים, בלי להניח לאחד מהם אותה מידת סבירות: דב (Bear) מניח האטה בענף וירידה בשיעור EBITDA, תרחיש בסיס (Base) משקף המשך המגמה הנוכחית, ושור (Bull) משקף הרחבת קיבולת וגיוס לקוחות אסטרטגיים.' as const;

export const SENSITIVITY_METHODOLOGY_COPY =
  'ניתוח הרגישות מראה אילו גורמים (WACC, צמיחה, מכפיל) הם הרגישים ביותר — לא להפחדה, אלא להבנה של החשיפות.' as const;

function parsePctLabel(label: string): number {
  return parseFloat(label.replace(/[+％%]/g, '')) || 0;
}

function waccStepFromMatrix(matrix: SensitivityMatrix): number {
  const waccs = matrix.waccLabels.map(parsePctLabel);
  const col = matrix.baseCol;
  if (col > 0 && col < waccs.length) {
    const left = Math.abs(waccs[col]! - waccs[col - 1]!);
    const right =
      col + 1 < waccs.length ? Math.abs(waccs[col + 1]! - waccs[col]!) : left;
    return Math.round(((left + right) / 2) * 10) / 10;
  }
  return 0.7;
}

/** PDF page 7 — WACC × growth sensitivity matrix intro */
export function sensitivityIntroCopy(
  matrix: SensitivityMatrix,
  baseGrowthPct: number,
  baseWaccPct: number,
): string {
  const growths = matrix.growthLabels.map(parsePctLabel);
  const minGrowth = Math.min(...growths);
  const maxGrowth = Math.max(...growths);
  const waccStep = waccStepFromMatrix(matrix);
  const baseGrowth = parsePctLabel(
    matrix.growthLabels[matrix.baseRow] ?? `+${baseGrowthPct}%`,
  );
  const baseWacc = parsePctLabel(
    matrix.waccLabels[matrix.baseCol] ?? `${baseWaccPct}%`,
  );

  return `הטבלאות להלן מציגות כיצד השווי משתנה כאשר:
• ציר X: עלות הון (WACC) משתנה ב-${waccStep.toFixed(1)} נקודות אחוז לכל כיוון
• ציר Y: צמיחה שנתית משתנה מ-${Math.round(minGrowth)}% עד ${Math.round(maxGrowth)}%
התא המודגש הוא התרחיש בסיס (${Math.round(baseGrowth)}% צמיחה, ${baseWacc.toFixed(1)}% WACC). השימוש בניתוח זה: להבין איזה משתנים מרמזים על רגישות גבוהה וכדי להתכונן לתרחישים אלה.`;
}

export function sensitivityIntroCopyEn(
  matrix: SensitivityMatrix,
  baseGrowthPct: number,
  baseWaccPct: number,
): string {
  const growths = matrix.growthLabels.map(parsePctLabel);
  const minGrowth = Math.min(...growths);
  const maxGrowth = Math.max(...growths);
  const waccStep = waccStepFromMatrix(matrix);
  const baseGrowth = parsePctLabel(
    matrix.growthLabels[matrix.baseRow] ?? `+${baseGrowthPct}%`,
  );
  const baseWacc = parsePctLabel(
    matrix.waccLabels[matrix.baseCol] ?? `${baseWaccPct}%`,
  );

  return `The tables below show how equity value shifts when:
• X-axis: cost of capital (WACC) moves by ${waccStep.toFixed(1)} percentage points in each direction
• Y-axis: annual growth ranges from ${Math.round(minGrowth)}% to ${Math.round(maxGrowth)}%
The highlighted cell is the base case (${Math.round(baseGrowth)}% growth, ${baseWacc.toFixed(1)}% WACC). Use this analysis to see which variables drive the most sensitivity and prepare for those outcomes.`;
}

export interface ScenariosIntroInput {
  bearGrowthPct: number;
  baseGrowthPct: number;
  bullGrowthPct: number;
  bearEbitdaMarginPct: number;
  baseEbitdaMarginPct: number;
  bullEbitdaMarginPct: number;
}

function bearEbitdaPhrase(baseMargin: number, bearMargin: number): string {
  const delta = baseMargin - bearMargin;
  if (delta >= 0.5) return `ירידה של ${delta.toFixed(1)}% בשיעור EBITDA`;
  return 'ירידה בשיעור EBITDA';
}

function bullEbitdaPhrase(baseMargin: number, bullMargin: number): string {
  const delta = bullMargin - baseMargin;
  if (delta >= 0.5) return `ושיפור של ${delta.toFixed(1)}% בשיעור EBITDA`;
  return 'ושיפור בשיעור EBITDA';
}

/** PDF / results — scenarios narrative with live assumptions */
export function scenariosIntroCopy(input: ScenariosIntroInput): string {
  return `שלוש תרחישים משקפים מסלולים עתידיים אפשריים, בלי להניח לאחד מהם אותה מידת סבירות: דב (Bear) מניח האטה בענף, ${bearEbitdaPhrase(input.baseEbitdaMarginPct, input.bearEbitdaMarginPct)}, וצמיחה של ${Math.round(input.bearGrowthPct)}% בלבד. תרחיש בסיס (Base) משקף המשך המגמה הנוכחית בצמיחה של ${Math.round(input.baseGrowthPct)}%. שור (Bull) משקף הרחבת קיבולת, גיוס לקוחות אסטרטגיים, ${bullEbitdaPhrase(input.baseEbitdaMarginPct, input.bullEbitdaMarginPct)}. ${SENSITIVITY_METHODOLOGY_COPY}`;
}

export function scenariosIntroFromRows(
  scenarios: { key: string; growthPct: number; ebitdaMarginPct: number }[],
  locale: 'he' | 'en' = 'he',
): string {
  const bear = scenarios.find((s) => s.key === 'bear');
  const base = scenarios.find((s) => s.key === 'base');
  const bull = scenarios.find((s) => s.key === 'bull');
  if (!bear || !base || !bull) {
    return locale === 'he'
      ? SCENARIOS_SENSITIVITY_METHODOLOGY_COPY
      : SCENARIOS_SENSITIVITY_METHODOLOGY_COPY_EN;
  }
  const input: ScenariosIntroInput = {
    bearGrowthPct: bear.growthPct,
    baseGrowthPct: base.growthPct,
    bullGrowthPct: bull.growthPct,
    bearEbitdaMarginPct: bear.ebitdaMarginPct,
    baseEbitdaMarginPct: base.ebitdaMarginPct,
    bullEbitdaMarginPct: bull.ebitdaMarginPct,
  };
  return locale === 'he' ? scenariosIntroCopy(input) : scenariosIntroCopyEn(input);
}

export function scenariosIntroCopyEn(input: ScenariosIntroInput): string {
  const bearDelta = input.baseEbitdaMarginPct - input.bearEbitdaMarginPct;
  const bullDelta = input.bullEbitdaMarginPct - input.baseEbitdaMarginPct;
  const bearEbitda =
    bearDelta >= 0.5
      ? `EBITDA margin down ${bearDelta.toFixed(1)}%`
      : 'lower EBITDA margin';
  const bullEbitda =
    bullDelta >= 0.5
      ? `and EBITDA margin up ${bullDelta.toFixed(1)}%`
      : 'and higher EBITDA margin';

  return `Three scenarios reflect distinct future paths, without equal likelihood: Bear assumes sector slowdown, ${bearEbitda}, and growth of ${Math.round(input.bearGrowthPct)}% only. Base continues the current trajectory at ${Math.round(input.baseGrowthPct)}% growth. Bull reflects capacity expansion, strategic client wins, ${bullEbitda}. ${SENSITIVITY_METHODOLOGY_COPY_EN}`;
}

export const SCENARIOS_SENSITIVITY_METHODOLOGY_COPY =
  `${SCENARIOS_METHODOLOGY_COPY} ${SENSITIVITY_METHODOLOGY_COPY}` as const;

export const SCENARIOS_METHODOLOGY_COPY_EN =
  'Three scenarios reflect distinct future paths, without equal likelihood: Bear assumes sector slowdown and lower EBITDA margin, Base continues the current trajectory, and Bull reflects capacity expansion and strategic client wins.' as const;

export const SENSITIVITY_METHODOLOGY_COPY_EN =
  'Sensitivity analysis shows which factors (WACC, growth, multiple) are most influential — not to alarm, but to clarify exposures.' as const;

export const SCENARIOS_SENSITIVITY_METHODOLOGY_COPY_EN =
  `${SCENARIOS_METHODOLOGY_COPY_EN} ${SENSITIVITY_METHODOLOGY_COPY_EN}` as const;

/** Scenarios section intro (results + PDF page 6) */
export const scenSub = SCENARIOS_SENSITIVITY_METHODOLOGY_COPY;
export const scenSubEn = SCENARIOS_SENSITIVITY_METHODOLOGY_COPY_EN;
