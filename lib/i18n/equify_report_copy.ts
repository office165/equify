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
  hospitality: 'שוק המלונאות והאירוח',
  saas: 'שוק התוכנה וה SaaS',
  fintech: 'שוק הפינטק והשירותים הפיננסיים',
  cyber: 'שוק הסייבר והטכנולוגיה',
  health: 'שוק הבריאות והביוטק',
  services: 'שוק השירותים המקצועיים',
  industry: 'שוק התעשייה והייצור',
  retail_unified: 'שוק הקמעונאות והמסחר',
  food_service: 'שוק המסעדנות והמזון',
  energy: 'שוק האנרגיה והתשתיות',
  defense_aerospace: 'שוק הביטחון, התעופה והחלל',
  real_estate: 'שוק הנדל"ן, הבינוי והתשתיות',
  other: 'השוק הרלוונטי',
};

const SECTOR_MARKET_EN: Record<EquifySectorKey, string> = {
  hospitality: 'hotels and hospitality',
  saas: 'software and SaaS',
  fintech: 'fintech and financial services',
  cyber: 'cyber and technology',
  health: 'healthcare and biotech',
  services: 'professional services',
  industry: 'industry and manufacturing',
  retail_unified: 'retail and commerce',
  food_service: 'food service and restaurants',
  energy: 'energy and infrastructure',
  defense_aerospace: 'defense, aviation and aerospace',
  real_estate: 'real estate, construction and infrastructure',
  other: 'the relevant market',
};

/**
 * Round 5 (display only): the narrative says only what the scenario row shows. In every case the
 * scenarios change the EBITDA margin; growth and WACC are the same as the base (checked over the
 * 385 test cases), so growth is described from the numbers and "specific risk rises" is gone.
 */
function pointsHe(delta: number): string {
  return `${delta.toFixed(1)} נקודות אחוז`;
}

function growthPhraseHe(growthPct: number, baseGrowthPct: number, direction: 'down' | 'up'): string {
  const g = Math.round(growthPct);
  const b = Math.round(baseGrowthPct);
  if (g === b) return `הצמיחה נשארת ${g}%, כמו בתרחיש הבסיס`;
  if (direction === 'down') return g < b ? `הצמיחה יורדת ל ${g}%` : `הצמיחה ${g}%`;
  return g > b ? `הצמיחה עולה ל ${g}%` : `הצמיחה ${g}%`;
}

function growthPhraseEn(growthPct: number, baseGrowthPct: number, direction: 'down' | 'up'): string {
  const g = Math.round(growthPct);
  const b = Math.round(baseGrowthPct);
  if (g === b) return `growth stays at ${g}%, as in the base case`;
  if (direction === 'down') return g < b ? `growth slows to ${g}%` : `growth is ${g}%`;
  return g > b ? `growth rises to ${g}%` : `growth is ${g}%`;
}

function bearFullDescriptionEn(sectorKey: EquifySectorKey, p: ScenarioNarrativeParams, delta: number): string {
  const market = sectorKey === 'hospitality' ? 'hospitality and services' : SECTOR_MARKET_EN[sectorKey];
  return `In this scenario, ${market} slows, pricing pressure intensifies, and cash flows contract. The EBITDA margin falls ${delta.toFixed(1)} percentage points and ${growthPhraseEn(p.growthPct, p.baseGrowthPct, 'down')}.`;
}

function baseFullDescriptionEn(): string {
  return 'Neutral case: the market continues at its current pace, management holds course, and no structural shifts occur. Your inputs are the baseline.';
}

function bullFullDescriptionEn(sectorKey: EquifySectorKey, p: ScenarioNarrativeParams, delta: number): string {
  const market = sectorKey === 'hospitality' ? 'hospitality and services' : SECTOR_MARKET_EN[sectorKey];
  return `In an optimistic scenario, management expands in ${market}, wins strategic clients on better terms, and cash flows improve. The EBITDA margin rises ${delta.toFixed(1)} percentage points and ${growthPhraseEn(p.growthPct, p.baseGrowthPct, 'up')}.`;
}

function bearFullDescriptionHe(sectorKey: EquifySectorKey, p: ScenarioNarrativeParams, delta: number): string {
  if (sectorKey === 'hospitality') {
    return `בתרחיש זה, שוק האירוח והשירותים מתכנס, לקוחות משתמשים בכוח המיקוח שלהם כדי לשפר תנאים, ותזרימים מתכווצים. שיעור EBITDA יורד ב ${pointsHe(delta)}, ו${growthPhraseHe(p.growthPct, p.baseGrowthPct, 'down')}.`;
  }
  const market = SECTOR_MARKET_HE[sectorKey];
  return `בתרחיש זה, ${market} מתכנס, לחץ מחירים מחמיר, ותזרימים מתכווצים. שיעור EBITDA יורד ב ${pointsHe(delta)}, ו${growthPhraseHe(p.growthPct, p.baseGrowthPct, 'down')}.`;
}

function baseFullDescriptionHe(): string {
  return 'תרחיש ניטרלי: השוק ממשיך בקצב הנוכחי, ההנהלה שומרת על הכיוון, ולא קורים שינויים מבניים. הנתונים שהזנת הם הבסיס.';
}

function bullFullDescriptionHe(sectorKey: EquifySectorKey, p: ScenarioNarrativeParams, delta: number): string {
  if (sectorKey === 'hospitality') {
    return `בתרחיש אופטימי, ההנהלה מרחיבה את המתקנים או את שירותי הליווי, מושכת לקוחות בתנאים טובים יותר, ותזרימים משתפרים. שיעור EBITDA עולה ב ${pointsHe(delta)}, ו${growthPhraseHe(p.growthPct, p.baseGrowthPct, 'up')}.`;
  }
  const market = SECTOR_MARKET_HE[sectorKey];
  return `בתרחיש אופטימי, ההנהלה מרחיבה את הפעילות ב${market}, מושכת לקוחות אסטרטגיים בתנאים טובים יותר, ותזרימים משתפרים. שיעור EBITDA עולה ב ${pointsHe(delta)}, ו${growthPhraseHe(p.growthPct, p.baseGrowthPct, 'up')}.`;
}

/** Per-scenario short + narrative copy for PDF and results */
export function getScenarioNarrative(
  scenarioKey: ScenarioNarrativeKey,
  sectorKey: EquifySectorKey,
  params: ScenarioNarrativeParams,
  locale: 'he' | 'en' = 'he',
): ScenarioNarrativeCopy {
  const bearDelta = Math.max(0, params.baseEbitdaMarginPct - params.ebitdaMarginPct);
  const bullDelta = Math.max(0, params.ebitdaMarginPct - params.baseEbitdaMarginPct);

  if (scenarioKey === 'bear') {
    const delta = bearDelta || 2;
    if (locale === 'en') {
      return {
        description: `Sector slowdown, pricing pressure, EBITDA margin down ${delta.toFixed(1)} points`,
        fullDescription: bearFullDescriptionEn(sectorKey, params, delta),
      };
    }
    return {
      description: `האטה ענפית, לחץ מחירים, שיעור EBITDA נמוך ב ${pointsHe(delta)}`,
      fullDescription: bearFullDescriptionHe(sectorKey, params, delta),
    };
  }

  if (scenarioKey === 'base') {
    if (locale === 'en') {
      return {
        description: 'Current trend continues, stable EBITDA, unchanged customer concentration',
        fullDescription: baseFullDescriptionEn(),
      };
    }
    return {
      description: 'המשך המגמה הנוכחית, שיעור EBITDA יציב, ריכוז לקוחות ללא שינוי',
      fullDescription: baseFullDescriptionHe(),
    };
  }

  const delta = bullDelta || 2;
  if (locale === 'en') {
    return {
      description: `Capacity expansion, strategic client wins, EBITDA margin up ${delta.toFixed(1)} points`,
      fullDescription: bullFullDescriptionEn(sectorKey, params, delta),
    };
  }
  return {
    description: `הרחבת קיבולת, גיוס לקוחות אסטרטגיים, שיעור EBITDA גבוה ב ${pointsHe(delta)}`,
    fullDescription: bullFullDescriptionHe(sectorKey, params, delta),
  };
}

export function resolveEquifySectorKey(sector?: string): EquifySectorKey {
  const legacyMap: Record<string, EquifySectorKey> = {
    ecom: 'retail_unified',
    retail_trade: 'retail_unified',
    food: 'food_service',
  };
  if (sector && legacyMap[sector]) {
    return legacyMap[sector];
  }

  const keys: EquifySectorKey[] = [
    'hospitality',
    'saas',
    'fintech',
    'cyber',
    'health',
    'services',
    'industry',
    'retail_unified',
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
  'דוח הערכת שווי בנוי על שלושה יסודות: תזרימי מזומנים מהוונים (DCF) בעלות הון מותאמת סיכון, מכפילי ענף, וציון איכות שמעריך את יציבות התזרים. השווי המוצג הוא ממוצע משוקלל של השיטות.' as const;

export const FINANCIAL_DATA_COPY =
  'הכנסות מוצגות לפי דוחות כספיים. ה EBITDA המייצג ל DCF הוא שקלול של 30% שנה קודמת, 50% שנה נוכחית ו 20% תחזית. צמיחת התחזית מוגבלת לתקרת הענף.' as const;

/**
 * Page 3 copy with the weights the engine actually used for the DCF EBITDA base
 * ("EBITDA מייצג ל DCF", finding 15). Without a prior year the engine re-weights current and projected.
 */
export function financialDataCopy(w: { past: number; current: number; projected: number }): string {
  const p = (x: number) => `${Math.round(x * 100)}%`;
  const parts = [
    ...(w.past > 0 ? [`${p(w.past)} שנה קודמת`] : []),
    `${p(w.current)} שנה נוכחית`,
    `ו ${p(w.projected)} תחזית`,
  ];
  const list = parts.length === 3 ? `${parts[0]}, ${parts[1]} ${parts[2]}` : `${parts[0]} ${parts[1]}`;
  return `הכנסות מוצגות לפי דוחות כספיים. ה EBITDA המייצג ל DCF הוא שקלול של ${list}. צמיחת התחזית מוגבלת לתקרת הענף.`;
}

export const FINANCIAL_DATA_COPY_EN =
  'Revenue reflects reported financials; the EBITDA base for valuation is a weighted average (30% prior · 50% current · 20% projected) per M&A practice. Forward growth is capped by sector guardrails. Suitable for bank or investor meetings.' as const;

export const WACC_DCF_METHODOLOGY_COPY =
  'עלות ההון (WACC) מחושבת לפי CAPM: ריבית חסרת סיכון, בטא ענפית ממונפת כפול פרמיית סיכון שוק, פרמיית גודל ופרמיה ספציפית לעסק לפי ציון האיכות. עלות החוב היא הריבית חסרת הסיכון ועוד 2 נקודות, אחרי מס של 23%. התזרים בשנה הטרמינלית צומח ב 2.5% בשנה.' as const;

export const WACC_DCF_METHODOLOGY_COPY_EN =
  'Cost of capital (WACC) follows CAPM: risk-free rate, sector levered beta times the equity risk premium, a size premium and a company-specific premium from the Quality Score. Cost of debt is the risk-free rate plus 2 points, after 23% tax. Terminal-year cash flow grows at 2.5% a year.' as const;

export function multiplesMethodologyCopy(sector: string): string {
  return `המכפיל של החברה נקבע לפי טווח המכפילים של הענף ${sector}, ציון האיכות שלה והנחת סחירות וגודל לחברה פרטית.`;
}

export function multiplesMethodologyCopyEn(sector: string): string {
  return `The company multiple is set from the sector multiple range (${sector}), its quality score, and a marketability and size discount for a private company.`;
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
    let text = `The multiple was calibrated to ×${mult} based on the company's quality score (${score}/100, ${grade}), reflecting its normalized risk profile versus the market.`;
    if (penalty > 0) {
      text += ` Reduced by ×${penalty.toFixed(1)} due to customer concentration.`;
    }
    return text;
  }

  let text = `המכפיל הותאם לרמה של ×${mult} על בסיס ציון האיכות של החברה (\u2066${score}/100, ${grade}\u2069), המשקף את פרופיל הסיכון המנורמל שלה מול השוק.`;
  if (penalty > 0) {
    text += ` הופחת ב ×${penalty.toFixed(1)} בשל ריכוז הלקוחות.`;
  }
  return text;
}

export const QUALITY_METHODOLOGY_COPY =
  'ציון האיכות משקלל שבעה גורמים שמשפיעים על סיכון התזרים: יציבות הכנסות (חוזרות מול חד פעמיות), גיוון לקוחות (ריכוז מול פיזור), תלות במנהיגות או מייסדים, עוצמת התחרות בענף, הגנות קניין רוחני, אורך החוזים עם לקוחות, וקצב הצמיחה הצפוי. הציון הוא סכום הנקודות של הגורמים לפני עיגול (עד 110), עם תקרה של 100.' as const;

export const QUALITY_METHODOLOGY_COPY_EN =
  'The Quality Score blends seven factors that affect cash-flow risk: revenue stability (recurring vs. one-off), customer diversification (concentration vs. spread), leadership or founder dependency, sector competition intensity, intellectual property protections, contract length with customers, and expected growth rate. The score is the sum of the factor points before rounding (up to 110), capped at 100.' as const;

function qualityScoreInterpretationHe(grade: string): string {
  if (grade === 'A') return 'משמעו: עסק באיכות גבוהה, עם יציבות תזרים מובחנת.';
  if (grade === 'A−') return 'משמעו: עסק חזק, עם סיכונים מוגבלים ומנוהלים היטב.';
  if (grade === 'B+') return 'משמעו: עסק שמעל לממוצע, עם סיכונים מחושבים אך לא קריטיים.';
  if (grade === 'B') return 'משמעו: עסק בטווח הממוצע, עם חשיפות סטנדרטיות לענף.';
  if (grade === 'B−') return 'משמעו: עסק מתחת לממוצע, עם חשיפות שמחייבות הקשר בפרשנות.';
  return 'משמעו: סיכוני תזרים משמעותיים, ודורש זהירות בקבלת החלטות.';
}

function qualityScoreInterpretationEn(grade: string): string {
  if (grade === 'A') return 'Interpretation: high-quality business with pronounced cash-flow stability.';
  if (grade === 'A−') return 'Interpretation: strong business with limited, well-managed risk.';
  if (grade === 'B+') return 'Interpretation: above-average business with measured, non-critical risks.';
  if (grade === 'B') return 'Interpretation: mid-range business with sector-standard exposures.';
  if (grade === 'B−') return 'Interpretation: below-average business; context required when interpreting value.';
  return 'Interpretation: material cash-flow risks; interpret valuation with caution.';
}

/** PDF page 7 — Quality Score narrative with live score and grade */
export function qualityScoreIntroCopy(score: number, grade: string): string {
  const rounded = Math.round(score);
  return `${QUALITY_METHODOLOGY_COPY} הציון שהתקבל (\u2066${rounded}/100, ${grade}\u2069) ${qualityScoreInterpretationHe(grade)}`;
}

export function qualityScoreIntroCopyEn(score: number, grade: string): string {
  const rounded = Math.round(score);
  return `${QUALITY_METHODOLOGY_COPY_EN} Score achieved: ${rounded}/100, ${grade}. ${qualityScoreInterpretationEn(grade)}`;
}

export const SCENARIOS_METHODOLOGY_COPY =
  'שלושה תרחישים משקפים מסלולים עתידיים אפשריים, בלי להניח לאחד מהם אותה מידת סבירות: דב (Bear) מניח האטה בענף וירידה בשיעור EBITDA, תרחיש בסיס (Base) משקף המשך המגמה הנוכחית, ושור (Bull) משקף הרחבת קיבולת וגיוס לקוחות אסטרטגיים.' as const;

export const SENSITIVITY_METHODOLOGY_COPY =
  'ניתוח הרגישות מראה אילו גורמים (WACC, צמיחה, מכפיל) הם הרגישים ביותר, לא להפחדה אלא להבנה של החשיפות.' as const;

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

/** PDF page 7: sensitivity intro (round 2: every cell is an engine run). */
export function sensitivityIntroCopy(
  matrix: SensitivityMatrix,
  _baseGrowthPct: number,
  baseWaccPct: number,
): string {
  const growths = matrix.growthLabels.map(parsePctLabel);
  const minGrowth = Math.min(...growths);
  const maxGrowth = Math.max(...growths);
  const waccStep = waccStepFromMatrix(matrix);
  const baseGrowth = parsePctLabel(matrix.growthLabels[matrix.baseRow] ?? '2.5%');
  const baseWacc = parsePctLabel(matrix.waccLabels[matrix.baseCol] ?? `${baseWaccPct}%`);
  return `הטבלאות מציגות את השווי לבעלים כשמשנים שני משתנים, וכל תא הוא הרצה מלאה של המנוע:
• טבלה ראשונה: WACC בצעדים של ${waccStep.toFixed(1)} נקודות לכל כיוון, מול צמיחה טרמינלית מ ${minGrowth.toFixed(1)}% עד ${maxGrowth.toFixed(1)}%
• טבלה שנייה: EBITDA בצעדים של 10%, מול המכפיל בצעדים של 0.5
התא המודגש הוא תרחיש הבסיס (WACC ${baseWacc.toFixed(1)}%, צמיחה טרמינלית ${baseGrowth.toFixed(1)}%).`;
}

export function sensitivityIntroCopyEn(
  matrix: SensitivityMatrix,
  _baseGrowthPct: number,
  baseWaccPct: number,
): string {
  const growths = matrix.growthLabels.map(parsePctLabel);
  const minGrowth = Math.min(...growths);
  const maxGrowth = Math.max(...growths);
  const waccStep = waccStepFromMatrix(matrix);
  const baseGrowth = parsePctLabel(matrix.growthLabels[matrix.baseRow] ?? '2.5%');
  const baseWacc = parsePctLabel(matrix.waccLabels[matrix.baseCol] ?? `${baseWaccPct}%`);
  return `The tables show equity value when two inputs change; every cell is a full engine run:
• Table 1: WACC in steps of ${waccStep.toFixed(1)} points each way, against terminal growth from ${minGrowth.toFixed(1)}% to ${maxGrowth.toFixed(1)}%
• Table 2: EBITDA in steps of 10%, against the multiple in steps of 0.5
The highlighted cell is the base case (WACC ${baseWacc.toFixed(1)}%, terminal growth ${baseGrowth.toFixed(1)}%).`;
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
  if (delta >= 0.5) return `ירידה של ${delta.toFixed(1)} נקודות אחוז בשיעור EBITDA`;
  return 'ירידה בשיעור EBITDA';
}

function bullEbitdaPhrase(baseMargin: number, bullMargin: number): string {
  const delta = bullMargin - baseMargin;
  if (delta >= 0.5) return `ושיפור של ${delta.toFixed(1)} נקודות אחוז בשיעור EBITDA`;
  return 'ושיפור בשיעור EBITDA';
}

/** PDF / results — scenarios narrative with live assumptions */
export function scenariosIntroCopy(input: ScenariosIntroInput): string {
  const g = (x: number) => Math.round(x);
  const sameGrowth = g(input.bearGrowthPct) === g(input.baseGrowthPct) && g(input.bullGrowthPct) === g(input.baseGrowthPct);
  const bearGrowth = sameGrowth ? '' : `, וצמיחה של ${g(input.bearGrowthPct)}%`;
  const bullGrowth = sameGrowth ? '' : `, וצמיחה של ${g(input.bullGrowthPct)}%`;
  const growthNote = sameGrowth ? ` בשלושת התרחישים הצמיחה ${g(input.baseGrowthPct)}%, ומה שמשתנה הוא שיעור ה EBITDA.` : '';
  return `שלושה תרחישים משקפים מסלולים עתידיים אפשריים, בלי להניח לאחד מהם אותה מידת סבירות: דב (Bear) מניח האטה בענף ו${bearEbitdaPhrase(input.baseEbitdaMarginPct, input.bearEbitdaMarginPct)}${bearGrowth}. תרחיש בסיס (Base) משקף המשך המגמה הנוכחית בצמיחה של ${g(input.baseGrowthPct)}%. שור (Bull) משקף הרחבת קיבולת, גיוס לקוחות אסטרטגיים, ${bullEbitdaPhrase(input.baseEbitdaMarginPct, input.bullEbitdaMarginPct)}${bullGrowth}.${growthNote} ${SENSITIVITY_METHODOLOGY_COPY}`;
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
  'Sensitivity analysis shows which factors (WACC, growth, multiple) are most influential, not to alarm but to clarify exposures.' as const;

export const SCENARIOS_SENSITIVITY_METHODOLOGY_COPY_EN =
  `${SCENARIOS_METHODOLOGY_COPY_EN} ${SENSITIVITY_METHODOLOGY_COPY_EN}` as const;

/** Scenarios section intro (results + PDF page 6) */
export const scenSub = SCENARIOS_SENSITIVITY_METHODOLOGY_COPY;
export const scenSubEn = SCENARIOS_SENSITIVITY_METHODOLOGY_COPY_EN;
