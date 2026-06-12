import type { ValuationLocale } from '../../api_client';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import { getWizardContext } from '../pdf/wizard_context';
import { formatCurrencyShort } from '../utils/formatCurrency';

export type HealthStatus = 'green' | 'yellow' | 'red';

export interface HealthScoreItem {
  id: 'profitability' | 'growth' | 'risk';
  label: string;
  status: HealthStatus;
  summary: string;
}

export interface FundamentalAnalysisResult {
  title: string;
  paragraphs: string[];
  healthScores: HealthScoreItem[];
}

export interface FundamentalInsightsInput {
  matrix: ForecastMatrixWithDiagnostics;
  baseEnterpriseValue: number;
  growthDeltaPp: number;
  marginDeltaPp: number;
  locale: ValuationLocale;
}

function avgGrowth(rates: number[], growthDeltaPp: number): number {
  if (!rates.length) return growthDeltaPp / 100;
  const base = rates.reduce((a, b) => a + b, 0) / rates.length;
  return base + growthDeltaPp / 100;
}

function ebitdaMargin(matrix: ForecastMatrixWithDiagnostics): number {
  const rev = matrix.assumptions.base_revenue;
  const ebitda =
    matrix.diagnostics_inputs?.ebitda ??
    matrix.assumptions.adjusted_ebit / 0.85;
  return rev > 0 ? ebitda / rev : 0;
}

function scoreProfitability(margin: number, locale: ValuationLocale): HealthScoreItem {
  let status: HealthStatus = 'red';
  let summaryEn = 'Margins are thin — focus on unit economics and cost discipline.';
  let summaryHe = 'שוליים צרים — יש להתמקד בכלכלת יחידה ובשליטה בהוצאות.';

  if (margin >= 0.15) {
    status = 'green';
    summaryEn =
      'Strong operating margin — excellent cost control and durable competitive positioning.';
    summaryHe = 'שולי תפעול חזקים — שליטה מעולה בעלויות ויתרון תחרותי יציב.';
  } else if (margin >= 0.08) {
    status = 'yellow';
    summaryEn = 'Moderate margins — room to improve efficiency before scaling aggressively.';
    summaryHe = 'שוליים בינוניים — מקום לשיפור יעילות לפני האצת צמיחה.';
  }

  return {
    id: 'profitability',
    label: locale === 'he' ? 'רווחיות' : 'Profitability',
    status,
    summary: locale === 'he' ? summaryHe : summaryEn,
  };
}

function scoreGrowth(avgG: number, locale: ValuationLocale): HealthScoreItem {
  let status: HealthStatus = 'red';
  let summaryEn = 'Growth trajectory is conservative — valuation relies on cash preservation.';
  let summaryHe = 'מסלול צמיחה שמרני — ההערכה נשענת על שימור תזרים.';

  if (avgG >= 0.08) {
    status = 'green';
    summaryEn = 'Healthy growth trajectory supports revenue expansion and value creation.';
    summaryHe = 'מסלול צמיחה בריא תומך בהרחבת הכנסות וביצירת שווי.';
  } else if (avgG >= 0.04) {
    status = 'yellow';
    summaryEn = 'Steady, moderate growth — execution consistency will determine upside.';
    summaryHe = 'צמיחה יציבה ומתונה — עקביות ביצוע תקבע את פוטנציאל העלייה.';
  }

  return {
    id: 'growth',
    label: locale === 'he' ? 'מסלול צמיחה' : 'Growth Trajectory',
    status,
    summary: locale === 'he' ? summaryHe : summaryEn,
  };
}

function scoreRisk(
  wacc: number,
  concentrationHigh: boolean,
  concentrationPct: number,
  recurringPct: number,
  locale: ValuationLocale,
): HealthScoreItem {
  let status: HealthStatus = 'green';
  let summaryEn = 'Risk profile is balanced relative to private-market benchmarks.';
  let summaryHe = 'פרופיל הסיכון מאוזן ביחס לשוק הפרטי.';

  if (wacc > 0.16 || concentrationHigh || concentrationPct >= 35) {
    status = 'red';
    summaryEn =
      'Elevated risk — high discount rate and/or customer concentration cap valuation upside.';
    summaryHe =
      'סיכון מוגבר — שיעור היוון גבוה ו/או ריכוז לקוחות מגבילים את פוטנציאל השווי.';
  } else if (wacc > 0.12 || concentrationPct >= 20 || recurringPct < 40) {
    status = 'yellow';
    summaryEn =
      'Moderate risk — diversifying revenue and securing recurring contracts can lower the hurdle rate.';
    summaryHe =
      'סיכון בינוני — גיוון הכנסות וחוזים חוזרים יכולים להפחית את שיעור ההיוון.';
  }

  return {
    id: 'risk',
    label: locale === 'he' ? 'פרופיל סיכון' : 'Risk Profile',
    status,
    summary: locale === 'he' ? summaryHe : summaryEn,
  };
}

/**
 * Plain-language fundamental narrative bound to live valuation inputs.
 */
export function generateFundamentalInsights(
  input: FundamentalInsightsInput,
): FundamentalAnalysisResult {
  const { matrix, baseEnterpriseValue, growthDeltaPp, marginDeltaPp, locale } = input;
  const wizard = getWizardContext(matrix);
  const margin = ebitdaMargin(matrix) + marginDeltaPp / 100;
  const wacc = matrix.assumptions.wacc;
  const gTerminal = matrix.assumptions.g_terminal;
  const avgG = avgGrowth(matrix.assumptions.revenue_growth_rates ?? [], growthDeltaPp);
  const recurring = wizard.recurring_revenue_percent;
  const concentrationHigh =
    wizard.customer_concentration_over_20 || wizard.customer_concentration_pct >= 20;
  const waccPct = (wacc * 100).toFixed(1);
  const gTerminalPct = (gTerminal * 100).toFixed(1);
  const marginPct = (margin * 100).toFixed(1);
  const avgGPct = (avgG * 100).toFixed(1);

  const paragraphsHe: string[] = [];
  const paragraphsEn: string[] = [];

  if (margin >= 0.15) {
    paragraphsHe.push(
      `העסק מציג שולי EBITDA של כ-${marginPct}% — רמה חזקה המעידה על שליטה תפעולית טובה ויתרון תחרותי עמיד. שוליים כאלה תומכים בהערכת שווי בסיס של כ-${formatCurrencyShort(baseEnterpriseValue, matrix.meta.currency ?? 'ILS')}.`,
    );
    paragraphsEn.push(
      `The business shows an EBITDA margin of ~${marginPct}% — a strong level indicating solid cost control and a durable competitive edge. Margins at this level support the current base-case enterprise value.`,
    );
  } else if (margin >= 0.08) {
    paragraphsHe.push(
      `שולי EBITDA של כ-${marginPct}% נמצאים בטווח בינוני. יש פוטנציאל להרחבת שווי באמצעות ייעול עלויות והגדלת מכירות חוזרות מעל ${recurring}%.`,
    );
    paragraphsEn.push(
      `An EBITDA margin of ~${marginPct}% is moderate. Value can expand through cost optimization and growing recurring revenue above ${recurring}%.`,
    );
  } else {
    paragraphsHe.push(
      `שולי EBITDA של כ-${marginPct}% נמוכים יחסית — ההערכה מדגישה שמירה על תזרים מזומנים ומיקוד בלקוחות רווחיים לפני האצת צמיחה.`,
    );
    paragraphsEn.push(
      `An EBITDA margin of ~${marginPct}% is relatively low — the valuation emphasizes cash preservation and profitable customer focus before accelerating growth.`,
    );
  }

  if (concentrationHigh) {
    paragraphsHe.push(
      `זוהה גורם סיכון מהותי: ריכוז לקוחות (לקוח מוביל ~${wizard.customer_concentration_pct}% מההכנסות). תלות בלקוח בודד מעלה את פרופיל הסיכון ומשתקפת בשיעור היוון (WACC) גבוה יותר, מה שמגביל את תקרת ההערכה בשוק הנוכחי.`,
    );
    paragraphsEn.push(
      `A material risk factor is customer concentration (top client ~${wizard.customer_concentration_pct}% of revenue). Reliance on a single major client increases the risk profile (reflected in a higher discount rate), which caps maximum valuation in the current market.`,
    );
  } else if (recurring >= 60) {
    paragraphsHe.push(
      `מנגנון הכנסה חוזרת חזק (${recurring}% מההכנסות) מפחית את תנודתיות התזרים ותומך בפרופיל סיכון נמוך יותר — גורם חיובי להערכת השווי.`,
    );
    paragraphsEn.push(
      `A strong recurring revenue engine (${recurring}% of revenue) reduces cash-flow volatility and supports a lower risk profile — a positive valuation driver.`,
    );
  }

  paragraphsHe.push(
    `האלגוריתם חישב את "עלות ההון" (WACC) בשיעור ${waccPct}%. ניתן לחשוב על זה כעל שיעור הסיכון שעל העסק לעמוד בו כדי ליצור שווי. הפחתת סיכונים מורגשים (למשל חוזים ארוכי טווח) תוריד שיעור זה ותגביר את שווי החברה באופן מיידי.`,
  );
  paragraphsEn.push(
    `The algorithm calculated your Cost of Capital (WACC) at ${waccPct}%. Think of this as the hurdle rate your business must clear to create value. Lowering perceived risks (e.g., securing long-term contracts) will decrease this rate and immediately boost company value.`,
  );

  paragraphsHe.push(
    `צמיחת הכנסות ממוצעת בתחזית היא כ-${avgGPct}% לשנה, עם הנחת צמיחה לטווח ארוך (Terminal Growth) של ${gTerminalPct}%. שילוב זה מניע את תזרים המזומנים העתידי בדוח ה-DCF המפורט שבהמשך.`,
  );
  paragraphsEn.push(
    `Average forecast revenue growth is ~${avgGPct}% per year, with a long-term terminal growth assumption of ${gTerminalPct}%. Together these drive future cash flows in the detailed DCF schedule below.`,
  );

  const healthScores = [
    scoreProfitability(margin, locale),
    scoreGrowth(avgG, locale),
    scoreRisk(wacc, concentrationHigh, wizard.customer_concentration_pct, recurring, locale),
  ];

  return {
    title:
      locale === 'he'
        ? 'ניתוח פונדמנטלי ותובנות עסקיות'
        : 'Fundamental Analysis & Business Insights',
    paragraphs: (locale === 'he' ? paragraphsHe : paragraphsEn).slice(0, 4),
    healthScores,
  };
}

export function healthStatusLabel(status: HealthStatus, locale: ValuationLocale): string {
  const map = {
    en: { green: 'Healthy', yellow: 'Watch', red: 'Attention' },
    he: { green: 'תקין', yellow: 'למעקב', red: 'דורש תשומת לב' },
  };
  return map[locale === 'he' ? 'he' : 'en'][status];
}

export const HEALTH_COLORS: Record<HealthStatus, string> = {
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
};
