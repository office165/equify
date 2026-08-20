import type { ValuationLocale } from '../../../api_client';
import { BRAND_NAME, BRAND_NAME_SHORT } from '../../brand/brand-identity';
import { formatCurrencyShort } from '../../utils/formatCurrency';
import { buildWhatsAppSupportUrl } from '../../wizard/whatsapp_support';
import { EMAIL_THEME } from './theme';

export interface MarketingReportEmailParams {
  companyName: string;
  recipientName?: string;
  /**
   * Signed HTTPS URL to the PDF. Omit/null/empty/"#" → no CTA at all.
   * Never render a dead button.
   */
  metricsAccessUrl?: string | null;
  locale: ValuationLocale;
  indicativeEnterpriseValue?: number | null;
  currency?: string;
}

export function hasUsableReportDownloadUrl(
  url: string | null | undefined,
): boolean {
  const raw = url?.trim() ?? '';
  if (!raw || raw === '#') return false;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

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

function copy(
  locale: ValuationLocale,
  companyName: string,
  recipientName: string | undefined,
  hasDownloadLink: boolean,
) {
  const name = recipientName?.trim() || companyName;
  if (locale === 'he') {
    return {
      subject: `דוח הערכת שווי: ${companyName} | ${BRAND_NAME}`,
      preheader: hasDownloadLink
        ? `מדדי ההערכה והדוח המלא של ${companyName} מוכנים לצפייה.`
        : `הדוח המלא של ${companyName} מצורף למייל.`,
      greeting: `שלום ${escapeHtml(name)},`,
      intro: hasDownloadLink
        ? `השלמנו עבורך הערכת שווי אלגוריתמית עבור <strong>${escapeHtml(companyName)}</strong>. הדוח המלא מצורף למייל, ובאפשרותך לגשת למדדי ההערכה המלאים בלחיצה אחת.`
        : `השלמנו עבורך הערכת שווי אלגוריתמית עבור <strong>${escapeHtml(companyName)}</strong>. הדוח מצורף למייל.`,
      metricsCta: 'לצפייה במדדי ההערכה והורדת הדוח (PDF)',
      pdfCta: 'להורדת דוח הערכת השווי המלא (PDF)',
      methodologyTitle: `איך ${BRAND_NAME_SHORT} חישב את השווי שלך?`,
      methodologyIntro:
        'הפלטפורמה שלנו משלבת מנועי הערכה אלגוריתמיים עם נרמול מול מכפילי ענף רלוונטיים:',
      dcf: 'מודל תזרים מזומנים מהוון (Corporate DCF) עם תחזית רב-שנתית ותרחישי דובי / בסיס / שורי.',
      wacc: 'אלגוריתמי WACC דינמיים המשקללים עלות הון, פרמיית סיכון ומבנה הון אופטימלי.',
      multiples:
        'מסגרת מכפילים מנורמלת לפי סקטור, שלב חיים ואיכות הכנסות, לצורך אימות וריאליות התוצאה.',
      indicativeLabel: 'שווי ארגוני אינדיקטיבי (תרחיש בסיס)',
      upsellTitle: 'שירותי ייעוץ פרימיום לחברות צמיחה',
      upsellIntro: `צוות ${BRAND_NAME} מלווה יזמים, מנהלים ומשקיעים בהחלטות אסטרטגיות מורכבות:`,
      upsellItems: [
        'פגישת ייעוץ אסטרטגית מול כלכלן ורואה חשבון בכיר.',
        'ליווי אקטיבי להכנת החברה לתהליך מכירה, מיזוג או רכישה (M&A).',
        'בניית תוכנית עסקית מקיפה ומודלים פיננסיים מתקדמים למשקיעים.',
      ],
      upsellCta: 'לתיאום שיחת ייעוץ',
      footer: `${BRAND_NAME}: אינדיקציית שווי אלגוריתמית | סודי ומיועד לנמען בלבד`,
      plainAccess: 'קישור למדדי ההערכה והורדת הדוח',
    };
  }

  return {
    subject: `Valuation Report: ${companyName} | ${BRAND_NAME}`,
    preheader: hasDownloadLink
      ? `Your valuation metrics and full report for ${companyName} are ready.`
      : `The full report for ${companyName} is attached to this email.`,
    greeting: `Hello ${escapeHtml(name)},`,
    intro: hasDownloadLink
      ? `We completed an algorithmic valuation indication for <strong>${escapeHtml(companyName)}</strong>. Your PDF is attached and your full evaluation metrics are one click away.`
      : `We completed an algorithmic valuation indication for <strong>${escapeHtml(companyName)}</strong>. The report is attached to this email.`,
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
    footer: `${BRAND_NAME}: Algorithmic valuation indication | Confidential`,
    plainAccess: 'Evaluation metrics & report link',
  };
}

export function buildMarketingReportEmailHtml(
  params: MarketingReportEmailParams,
): string {
  const hasDownloadLink = hasUsableReportDownloadUrl(params.metricsAccessUrl);
  const t = copy(
    params.locale,
    params.companyName,
    params.recipientName,
    hasDownloadLink,
  );
  const ev = formatValue(
    params.indicativeEnterpriseValue,
    params.locale,
    params.currency,
  );
  const advisoryUrl = buildWhatsAppSupportUrl(
    params.locale === 'he'
      ? `היי, סיימתי הערכת שווי ב-equify עבור ${params.companyName} ואשמח לשיחת ייעוץ.`
      : `Hi, I completed an Equify valuation for ${params.companyName} and would like an advisory call.`,
  );
  const upsellRows = t.upsellItems
    .map(
      (item) => `
        <tr>
          <td style="padding:0 0 12px 0;color:${EMAIL_THEME.bodyText};font-size:15px;line-height:1.7;font-family:${EMAIL_THEME.fontFamily};">
            <span style="color:${EMAIL_THEME.accent};font-weight:bold;">✦</span>
            &nbsp;${escapeHtml(item)}
          </td>
        </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="${params.locale === 'he' ? 'he' : 'en'}" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${escapeHtml(t.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${EMAIL_THEME.outerBackground};font-family:${EMAIL_THEME.fontFamily};direction:rtl;text-align:right;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(t.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${EMAIL_THEME.outerBackground};margin:0;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="${EMAIL_THEME.maxWidthPx}" cellspacing="0" cellpadding="0" border="0" style="max-width:${EMAIL_THEME.maxWidthPx}px;width:100%;margin:0 auto;">
          <tr>
            <td bgcolor="${EMAIL_THEME.headerBackground}" style="background:${EMAIL_THEME.headerBackground};padding:28px 24px;text-align:center;">
              <img src="${EMAIL_THEME.logoUrl}" alt="equify BY SBC" width="${EMAIL_THEME.logoWidthPx}" style="width:${EMAIL_THEME.logoWidthPx}px;max-width:70%;height:auto;display:block;border:0;margin:0 auto;" />
              <div style="margin:14px 0 0 0;color:${EMAIL_THEME.brandInk};font-size:24px;line-height:1.4;font-weight:700;font-family:${EMAIL_THEME.fontFamily};">
                equify BY SBC
              </div>
              <div style="margin-top:8px;color:#d7e6e5;font-size:13px;line-height:1.6;font-family:${EMAIL_THEME.fontFamily};">
                ${params.locale === 'he' ? 'אינדיקציית שווי אלגוריתמית לעסקים בצמיחה' : 'Algorithmic valuation indication for growth companies'}
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:${EMAIL_THEME.cardBackground};border:1px solid ${EMAIL_THEME.border};padding:32px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="color:${EMAIL_THEME.headingText};font-size:22px;line-height:1.5;font-weight:700;padding:0 0 12px 0;font-family:${EMAIL_THEME.fontFamily};text-align:right;">
                    ${t.greeting}
                  </td>
                </tr>
                <tr>
                  <td style="color:${EMAIL_THEME.bodyText};font-size:16px;line-height:1.9;padding:0 0 24px 0;font-family:${EMAIL_THEME.fontFamily};text-align:right;">
                    ${t.intro}
                  </td>
                </tr>
                ${
                  hasDownloadLink
                    ? `<tr>
                  <td align="center" style="padding:4px 0 28px 0;text-align:center;">
                    <a href="${escapeHtml(params.metricsAccessUrl as string)}"
                       style="display:inline-block;background:${EMAIL_THEME.ctaBackground};color:${EMAIL_THEME.ctaText};font-size:16px;line-height:1.2;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:4px;font-family:${EMAIL_THEME.fontFamily};">
                      ${t.metricsCta}
                    </a>
                  </td>
                </tr>`
                    : ''
                }
                <tr>
                  <td style="background:${EMAIL_THEME.blockBackground};border:1px solid ${EMAIL_THEME.border};border-right:3px solid ${EMAIL_THEME.accent};padding:20px 22px;text-align:right;">
                    <div style="color:${EMAIL_THEME.secondaryText};font-size:12px;line-height:1.6;font-weight:600;margin-bottom:6px;font-family:${EMAIL_THEME.fontFamily};">
                      ${t.indicativeLabel}
                    </div>
                    <div style="color:${EMAIL_THEME.headingText};font-size:32px;line-height:1.2;font-weight:800;font-family:${EMAIL_THEME.fontFamily};">
                      ${escapeHtml(ev)}
                    </div>
                  </td>
                </tr>
                <tr><td style="height:20px;line-height:20px;">&nbsp;</td></tr>
                <tr>
                  <td style="color:${EMAIL_THEME.headingText};font-size:18px;line-height:1.5;font-weight:700;padding:0 0 10px 0;font-family:${EMAIL_THEME.fontFamily};text-align:right;">
                    ${t.methodologyTitle}
                  </td>
                </tr>
                <tr>
                  <td style="color:${EMAIL_THEME.bodyText};font-size:15px;line-height:1.8;padding:0 0 14px 0;font-family:${EMAIL_THEME.fontFamily};text-align:right;">
                    ${t.methodologyIntro}
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 10px 0;color:${EMAIL_THEME.bodyText};font-size:14px;line-height:1.75;font-family:${EMAIL_THEME.fontFamily};text-align:right;">
                    <strong style="color:${EMAIL_THEME.headingText};">DCF</strong>: ${escapeHtml(t.dcf)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 10px 0;color:${EMAIL_THEME.bodyText};font-size:14px;line-height:1.75;font-family:${EMAIL_THEME.fontFamily};text-align:right;">
                    <strong style="color:${EMAIL_THEME.headingText};">WACC</strong>: ${escapeHtml(t.wacc)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 24px 0;color:${EMAIL_THEME.bodyText};font-size:14px;line-height:1.75;font-family:${EMAIL_THEME.fontFamily};text-align:right;">
                    <strong style="color:${EMAIL_THEME.headingText};">${params.locale === 'he' ? 'מכפילים' : 'Multiples'}</strong>: ${escapeHtml(t.multiples)}
                  </td>
                </tr>
                <tr>
                  <td style="background:${EMAIL_THEME.blockBackground};border:1px solid ${EMAIL_THEME.border};border-right:3px solid ${EMAIL_THEME.accent};padding:22px 24px;text-align:right;">
                    <div style="color:${EMAIL_THEME.headingText};font-size:17px;line-height:1.5;font-weight:700;padding:0 0 8px 0;font-family:${EMAIL_THEME.fontFamily};">
                      ${t.upsellTitle}
                    </div>
                    <div style="color:${EMAIL_THEME.bodyText};font-size:14px;line-height:1.8;padding:0 0 14px 0;font-family:${EMAIL_THEME.fontFamily};">
                      ${t.upsellIntro}
                    </div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      ${upsellRows}
                    </table>
                    ${
                      advisoryUrl
                        ? `<div style="padding-top:8px;">
                      <a href="${escapeHtml(advisoryUrl)}"
                         style="color:${EMAIL_THEME.accentText};font-size:14px;line-height:1.5;font-weight:700;text-decoration:none;border-bottom:1px solid ${EMAIL_THEME.accentText};font-family:${EMAIL_THEME.fontFamily};">
                        ${t.upsellCta} →
                      </a>
                    </div>`
                        : ''
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 24px 0 24px;text-align:center;">
              <div style="color:${EMAIL_THEME.signatureText};font-size:14px;line-height:1.7;font-family:${EMAIL_THEME.fontFamily};margin-bottom:8px;">
                צוות equify<br />
                מבית Solutions, Banking &amp; Capital
              </div>
              <div style="color:${EMAIL_THEME.footerText};font-size:12px;line-height:1.7;font-family:${EMAIL_THEME.fontFamily};">
                © 2026 Solutions, Banking &amp; Capital. כל הזכויות שמורות.
              </div>
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
  const hasDownloadLink = hasUsableReportDownloadUrl(params.metricsAccessUrl);
  const t = copy(
    params.locale,
    params.companyName,
    params.recipientName,
    hasDownloadLink,
  );
  const ev = formatValue(
    params.indicativeEnterpriseValue,
    params.locale,
    params.currency,
  );
  const upsell = t.upsellItems.map((item) => `• ${item}`).join('\n');

  const accessLine = hasDownloadLink
    ? `\n${t.plainAccess}: ${params.metricsAccessUrl}\n`
    : '';

  return `${t.greeting}

${t.intro.replace(/<[^>]+>/g, '')}
${accessLine}
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
  return copy(
    params.locale,
    params.companyName,
    params.recipientName,
    hasUsableReportDownloadUrl(params.metricsAccessUrl),
  ).subject;
}
