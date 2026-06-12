import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import type { ValuationLocale } from '../../api_client';

export interface ExecutiveSummaryBlock {
  title: string;
  paragraphs: string[];
}

function avgGrowth(rates: number[]): number {
  if (!rates.length) return 0;
  return rates.reduce((a, b) => a + b, 0) / rates.length;
}

function ebitdaMargin(matrix: ForecastMatrixWithDiagnostics): number {
  const rev = matrix.assumptions.base_revenue;
  const ebit = matrix.assumptions.adjusted_ebit;
  return rev > 0 ? ebit / rev : 0;
}

/**
 * MVP dynamic executive narrative from valuation inputs (2–3 sentences).
 */
export function buildExecutiveSummary(
  matrix: ForecastMatrixWithDiagnostics,
  locale: ValuationLocale,
): ExecutiveSummaryBlock {
  const wacc = matrix.assumptions.wacc;
  const gTerminal = matrix.assumptions.g_terminal;
  const confidence = matrix.meta.confidence_score;
  const growth = avgGrowth(matrix.assumptions.revenue_growth_rates ?? []);
  const margin = ebitdaMargin(matrix);
  const bear = matrix.scenarios?.bear?.enterprise_value ?? 0;
  const bull = matrix.scenarios?.bull?.enterprise_value ?? 0;
  const spread = bear > 0 ? (bull - bear) / bear : 0;

  const sentencesHe: string[] = [];
  const sentencesEn: string[] = [];

  if (growth >= 0.1) {
    sentencesHe.push(
      'מומנטום צמיחה חזק בתחזית ההכנסות תומך בהרחבת שווי הפעילות ומצדיק דיוק בבחינת יכולת ביצוע מול תחזיות השוק.',
    );
    sentencesEn.push(
      'Strong revenue growth momentum supports enterprise value expansion and warrants rigorous execution tracking against market expectations.',
    );
  } else if (growth >= 0.05) {
    sentencesHe.push(
      'קצב הצמיחה המתון-יציב מצביע על בגרות תפעולית, עם פוטנציאל להרחבת שוליים באמצעות ייעול הון חוזר והשקעות ממוקדות.',
    );
    sentencesEn.push(
      'Measured growth reflects operational maturity, with margin expansion potential through working-capital efficiency and targeted reinvestment.',
    );
  } else {
    sentencesHe.push(
      'קצב הצמיחה השמרני מחייב דגש על שימור תזרים והגנת שווי באמצעות שליטה בהוצאות ומיקוד בלקוחות רווחיים.',
    );
    sentencesEn.push(
      'Conservative growth underscores the need to protect value through cash preservation, cost discipline, and profitable customer focus.',
    );
  }

  if (wacc >= 0.14) {
    sentencesHe.push(
      `עלות ההון המשוקללת (WACC ${(wacc * 100).toFixed(1)}%) גבוהה יחסית — מומלץ לצמצם פרופיל סיכון באמצעות גיוון הכנסות, חיזוק מסחריות חוזרת והפחתת ריכוזיות לקוחות.`,
    );
    sentencesEn.push(
      `Elevated WACC (${(wacc * 100).toFixed(1)}%) suggests prioritizing risk mitigation via revenue diversification, recurring mix, and reduced customer concentration.`,
    );
  } else {
    sentencesHe.push(
      `פרופיל היוון (${(wacc * 100).toFixed(1)}% WACC) תומך בהערכת שווי יציבה יחסית, בכפוף לשמירה על יתרון תחרותי ותזרים חופשי עקבי.`,
    );
    sentencesEn.push(
      `The discount profile (${(wacc * 100).toFixed(1)}% WACC) supports a relatively stable valuation outlook, contingent on sustained competitive advantage and free cash flow.`,
    );
  }

  if (spread > 0.35) {
    sentencesHe.push(
      'פער רחב בין תרחיש דובי לשורי משקף אי-ודאות מהותית — מומלץ לבנות תוכנית עסקית עם אבני דרך ברורות לפני גיוס הון או מו"מ מכירה.',
    );
    sentencesEn.push(
      'A wide bear-to-bull spread signals material uncertainty; define clear milestones before capital raises or sell-side negotiations.',
    );
  } else if (confidence >= 75 && margin >= 0.15) {
    sentencesHe.push(
      `ציון הביטחון (${confidence}%) ושולי EBITDA תומכים בנרטיב השקעה איכותי — מומלץ להציג לדירקטוריון תרחיש בסיס עם צמיחה לטווח ארוך של ${(gTerminal * 100).toFixed(1)}%.`,
    );
    sentencesEn.push(
      `Confidence (${confidence}%) and EBITDA margins support a quality investment narrative; present a base case anchored on ${(gTerminal * 100).toFixed(1)}% terminal growth.`,
    );
  } else {
    sentencesHe.push(
      'מומלץ לחזק את איכות הנתונים הפיננסיים ולבצע בדיקת רגישות רבעונית ל-WACC ולשיעורי צמיחה לפני פרסום הדוח לגורמים חיצוניים.',
    );
    sentencesEn.push(
      'Strengthen financial data quality and run quarterly WACC and growth sensitivity before external distribution of this report.',
    );
  }

  const paragraphs = (locale === 'he' ? sentencesHe : sentencesEn).slice(0, 3);

  return {
    title:
      locale === 'he'
        ? 'סיכום מנהלים והמלצות אסטרטגיות'
        : 'Executive Summary & Strategic Recommendations',
    paragraphs,
  };
}
