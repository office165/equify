import type { ValuationLocale } from '../../../api_client';
import { BRAND_NAME, BRAND_NAME_SHORT } from '../../brand/brand-identity';
import { formatCurrencyShort } from '../../utils/formatCurrency';

export interface MarketingReportEmailParams {
  companyName: string;
  recipientName?: string;
  /** Direct link to PDF or live evaluation metrics dashboard */
  metricsAccessUrl: string;
  locale: ValuationLocale;
  indicativeEnterpriseValue?: number | null;
  currency?: string;
}

const BRAND = {
  forest: '#0b2c24',
  card: '#0f3d32',
  mint: '#00bfa5',
  mintDark: '#009e8a',
  text: '#e8f5f0',
  muted: '#9ec7bb',
  border: '#1a5246',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatValue(
  value: number | null | undefined,
  locale: ValuationLocale,
  currency = 'ILS',
): string {
  if (value == null || !Number.isFinite(value)) {
    return locale === 'he' ? `לפי מודל ${BRAND_NAME_SHORT}` : `Per ${BRAND_NAME_SHORT} model`;
  }
  return formatCurrencyShort(value, currency);
}

function copy(locale: ValuationLocale, companyName: string, recipientName?: string) {
  const name = recipientName?.trim() || companyName;
  if (locale === 'he') {
    return {
      subject: `דוח הערכת שווי — ${companyName} | ${BRAND_NAME}`,
      preheader: `מדדי ההערכה והדוח המלא של ${companyName} מוכנים לצפייה.`,
      greeting: `שלום ${escapeHtml(name)},`,
      intro: `השלמנו עבורך הערכת שווי אלגוריתמית עבור <strong>${escapeHtml(companyName)}</strong>. הדוח המלא מצורף למייל, ובאפשרותך לגשת למדדי ההערכה המלאים בלחיצה אחת.`,
      metricsCta: 'לצפייה במדדי ההערכה והורדת הדוח (PDF)',
      pdfCta: 'להורדת דוח הערכת השווי המלא (PDF)',
      methodologyTitle: `איך ${BRAND_NAME_SHORT} חישב את השווי שלך?`,
      methodologyIntro:
        'הפלטפורמה שלנו משלבת מנועי הערכה אלגוריתמיים עם נרמול מול מכפילי ענף רלוונטיים:',
      dcf: 'מודל תזרים מזומנים מהוון (Corporate DCF) עם תחזית רב-שנתית ותרחישי דובי / בסיס / שורי.',
      wacc: 'אלגוריתמי WACC דינמיים המשקללים עלות הון, פרמיית סיכון ומבנה הון אופטימלי.',
      multiples:
        'מסגרת מכפילים מנורמלת לפי סקטור, שלב חיים ואיכות הכנסות — לצורך אימות וריאליות התוצאה.',
      indicativeLabel: 'שווי ארגוני אינדיקטיבי (תרחיש בסיס)',
      upsellTitle: 'שירותי ייעוץ פרימיום לחברות צמיחה',
      upsellIntro: `צוות ${BRAND_NAME} מלווה יזמים, מנהלים ומשקיעים בהחלטות אסטרטגיות מורכבות:`,
      upsellItems: [
        'פגישת ייעוץ אסטרטגית מול כלכלן ורואה חשבון בכיר.',
        'ליווי אקטיבי להכנת החברה לתהליך מכירה, מיזוג או רכישה (M&A).',
        'בניית תוכנית עסקית מקיפה ומודלים פיננסיים מתקדמים למשקיעים.',
      ],
      upsellCta: 'לתיאום שיחת ייעוץ',
      footer: `${BRAND_NAME} — אינדיקציית שווי אלגוריתמית | סודי ומיועד לנמען בלבד`,
      plainAccess: 'קישור למדדי ההערכה והורדת הדוח',
    };
  }

  return {
    subject: `Valuation Report — ${companyName} | ${BRAND_NAME}`,
    preheader: `Your valuation metrics and full report for ${companyName} are ready.`,
    greeting: `Hello ${escapeHtml(name)},`,
    intro: `We completed an algorithmic valuation indication for <strong>${escapeHtml(companyName)}</strong>. Your PDF is attached and your full evaluation metrics are one click away.`,
    metricsCta: 'View Evaluation Metrics & Download PDF',
    pdfCta: 'Download Full Valuation Report (PDF)',
    methodologyTitle: `How ${BRAND_NAME_SHORT} calculated your value`,
    methodologyIntro:
      'Our platform combines algorithmic valuation engines with sector-normalized benchmarks:',
    dcf: 'Corporate discounted cash flow (DCF) with multi-year forecasts and bear / base / bull scenarios.',
    wacc: 'Dynamic WACC algorithms weighting cost of capital, risk premia, and capital structure.',
    multiples:
      'Normalized sector multiple framework by industry, lifecycle stage, and revenue quality.',
    indicativeLabel: 'Indicative enterprise value (base case)',
    upsellTitle: 'Premium corporate advisory services',
    upsellIntro:
      `The ${BRAND_NAME} team supports founders, operators, and investors with strategic execution:`,
    upsellItems: [
      'Strategic advisory session with a senior economist and CPA.',
      'Active preparation for sale, merger, or acquisition (M&A) processes.',
      'Comprehensive business plans and investor-grade financial models.',
    ],
    upsellCta: 'Schedule an advisory call',
    footer: `${BRAND_NAME} — Algorithmic valuation indication | Confidential`,
    plainAccess: 'Evaluation metrics & report link',
  };
}

export function buildMarketingReportEmailHtml(
  params: MarketingReportEmailParams,
): string {
  const t = copy(params.locale, params.companyName, params.recipientName);
  const ev = formatValue(
    params.indicativeEnterpriseValue,
    params.locale,
    params.currency,
  );
  const upsellRows = t.upsellItems
    .map(
      (item) => `
        <tr>
          <td style="padding:0 0 12px 0;color:${BRAND.text};font-size:15px;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
            <span style="color:${BRAND.mint};font-weight:bold;">✦</span>
            &nbsp;${escapeHtml(item)}
          </td>
        </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="${params.locale === 'he' ? 'he' : 'en'}" dir="${params.locale === 'he' ? 'rtl' : 'ltr'}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <title>${escapeHtml(t.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#061912;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(t.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#061912;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background:${BRAND.forest};border:1px solid ${BRAND.border};border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
              <div style="font-size:28px;font-weight:800;letter-spacing:0.08em;color:${BRAND.mint};">EQUIFY</div>
              <div style="margin-top:8px;font-size:13px;color:${BRAND.muted};letter-spacing:0.12em;text-transform:uppercase;">
                ${params.locale === 'he' ? 'אינדיקציית שווי אלגוריתמית' : 'Algorithmic Valuation Indication'}
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:${BRAND.card};border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};padding:32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="color:${BRAND.text};font-size:22px;line-height:1.4;font-weight:700;padding-bottom:12px;">
                    ${t.greeting}
                  </td>
                </tr>
                <tr>
                  <td style="color:${BRAND.muted};font-size:16px;line-height:1.7;padding-bottom:24px;">
                    ${t.intro}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:8px 0 28px 0;">
                    <a href="${escapeHtml(params.metricsAccessUrl)}"
                       style="display:inline-block;background:linear-gradient(135deg,${BRAND.mint} 0%,${BRAND.mintDark} 100%);color:#04241d;font-size:16px;font-weight:700;text-decoration:none;padding:16px 28px;border-radius:12px;box-shadow:0 8px 24px rgba(0,191,165,0.35);">
                      ${t.metricsCta}
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="background:#0a3229;border:1px solid ${BRAND.border};border-radius:12px;padding:20px 22px;">
                    <div style="color:${BRAND.muted};font-size:12px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">
                      ${t.indicativeLabel}
                    </div>
                    <div style="color:${BRAND.mint};font-size:28px;font-weight:800;line-height:1.2;">
                      ${escapeHtml(ev)}
                    </div>
                  </td>
                </tr>
                <tr><td style="height:20px;line-height:20px;">&nbsp;</td></tr>
                <tr>
                  <td style="color:${BRAND.text};font-size:18px;font-weight:700;padding-bottom:10px;">
                    ${t.methodologyTitle}
                  </td>
                </tr>
                <tr>
                  <td style="color:${BRAND.muted};font-size:15px;line-height:1.7;padding-bottom:14px;">
                    ${t.methodologyIntro}
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:10px;color:${BRAND.text};font-size:14px;line-height:1.65;">
                    <strong style="color:${BRAND.mint};">DCF</strong> — ${escapeHtml(t.dcf)}
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:10px;color:${BRAND.text};font-size:14px;line-height:1.65;">
                    <strong style="color:${BRAND.mint};">WACC</strong> — ${escapeHtml(t.wacc)}
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:24px;color:${BRAND.text};font-size:14px;line-height:1.65;">
                    <strong style="color:${BRAND.mint};">${params.locale === 'he' ? 'מכפילים' : 'Multiples'}</strong> — ${escapeHtml(t.multiples)}
                  </td>
                </tr>
                <tr>
                  <td style="background:${BRAND.forest};border:1px solid ${BRAND.border};border-radius:12px;padding:22px 24px;">
                    <div style="color:${BRAND.mint};font-size:17px;font-weight:700;padding-bottom:8px;">
                      ${t.upsellTitle}
                    </div>
                    <div style="color:${BRAND.muted};font-size:14px;line-height:1.6;padding-bottom:14px;">
                      ${t.upsellIntro}
                    </div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      ${upsellRows}
                    </table>
                    <div style="padding-top:8px;">
                      <a href="mailto:advisory@equify.app?subject=${encodeURIComponent(params.companyName)}"
                         style="color:${BRAND.mint};font-size:14px;font-weight:700;text-decoration:none;border-bottom:1px solid ${BRAND.mint};">
                        ${t.upsellCta} →
                      </a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:${BRAND.forest};border:1px solid ${BRAND.border};border-top:none;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;color:${BRAND.muted};font-size:12px;line-height:1.6;">
              ${t.footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildMarketingReportEmailText(
  params: MarketingReportEmailParams,
): string {
  const t = copy(params.locale, params.companyName, params.recipientName);
  const ev = formatValue(
    params.indicativeEnterpriseValue,
    params.locale,
    params.currency,
  );
  const upsell = t.upsellItems.map((item) => `• ${item}`).join('\n');

  return `${t.greeting}

${t.intro.replace(/<[^>]+>/g, '')}

${t.plainAccess}: ${params.metricsAccessUrl}

${t.indicativeLabel}: ${ev}

${t.methodologyTitle}
${t.methodologyIntro}
- DCF: ${t.dcf}
- WACC: ${t.wacc}
- Multiples: ${t.multiples}

${t.upsellTitle}
${t.upsellIntro}
${upsell}

${t.footer}`;
}

export function buildMarketingReportEmailSubject(
  params: MarketingReportEmailParams,
): string {
  return copy(params.locale, params.companyName, params.recipientName).subject;
}
