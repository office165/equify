import { BRAND_NAME } from '../brand/brand-identity';
import { equifyLogoHtml } from '../brand/equify-logo-html';
import { verdictHeroHtml } from '../brand/verdict-hero-html';
import { bridgeFromEnterpriseValue } from '../valuation/equity_bridge';
import { buildPdfFontFaceCss } from './pdf_font_faces';
import type { ValuationReportData } from './types';

export interface BuildPdfHtmlOptions {
  /** Puppeteer render — disables animations and applies print-safe layout. */
  pdfMode?: boolean;
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtILS(val: number | null | undefined): string {
  if (val == null || !Number.isFinite(val)) return '—';
  if (Math.abs(val) >= 1e9) return `₪ ${(val / 1e9).toFixed(1)}B`;
  if (Math.abs(val) >= 1e6) return `₪ ${(val / 1e6).toFixed(1)}M`;
  if (Math.abs(val) >= 1e3) return `₪ ${(val / 1e3).toFixed(0)}K`;
  return `₪ ${val.toLocaleString('he-IL')}`;
}

type Locale = 'he' | 'en';

const COPY = {
  he: {
    logoSub: 'הערכת שווי חכמה לעסקים',
    reportTitle: 'דוח הערכת שווי שוק הוגן',
    dateLabel: 'תאריך',
    methodLabel: 'שיטה',
    method: 'DCF + מכפילי שוק ישראלי 2026',
    heroLabel: 'שווי פעילות — תרחיש בסיס',
    heroBadge: 'ממוצע DCF + מכפילים',
    revLabel: 'הכנסות שנתיות',
    revSub: 'שנה נוכחית',
    ebitdaSub: 'מרווח תפעולי',
    waccSub: 'מחיר הון',
    findingsTitle: 'המלצות מרכזיות',
    rangeTitle: 'טווח הערכת שווי סופי',
    bull: 'תרחיש שורי',
    base: 'תרחיש בסיס',
    bear: 'תרחיש דובי',
    evLabel: 'שווי פעילות',
    arbLabel: 'ארביטראז׳ מול אסמכתא',
    reinvestLabel: 'שיעור השקעה מחודש לטווח ארוך',
    disclaimer:
      `הערה משפטית: ${BRAND_NAME} מספקת אינדיקציה אלגוריתמית בלבד. אין בדוח זה ייעוץ פיננסי, השקעות או מס. כל החלטה על בסיס דוח זה הינה באחריות הבלעדית של המשתמש.`,
    pg: (n: number) => `עמוד ${n} מתוך 3`,
    multiplesTitle: 'ניתוח מכפילי שוק — השוואה לענף 2026',
    multCols: ['מכפיל', 'חציון ענף', 'חברתך', 'שווי משתמע', 'סטטוס'],
    inRange: 'בטווח',
    high: 'מעל ממוצע',
    low: 'מתחת',
    avgMultiples: 'ממוצע שווי מכפילים',
    blended: 'ממוצע משולב DCF + מכפילים',
    scoreTitle: 'ציון בריאות עסקית',
    scoreLabel: 'ציון',
    ratiosTitle: 'פרופיל פיננסי ויחסים עיקריים',
    dcfTitle: 'מסלול הערכת שווי — DCF תרחיש בסיס',
    chartTitle: 'מסלול שווי פעילות (₪M)',
    leg1: 'מסלול שווי פעילות',
    leg2: 'תזרים חופשי לפירמה',
    tableTitle: 'תרחיש בסיס — תזרים מפורש',
    cols: ['שנה', 'הכנסות', 'EBIT', 'תזרים חופשי', 'ערך נוכחי', 'ערך נוכחי מצטבר'],
    termRow: 'ערך נוכחי טרמינלי (שנה 5)',
    evRow: 'שווי פעילות לפי DCF בלבד — רכיב אחד בשקלול',
    modelMethodNote:
      'המודל מיישם היוון אמצע-שנה והנחות השקעה-חוזרת סטנדרטיות (McKinsey framework).',
    multiplesSubordinate:
      'מכפילי שוק — הקשר השוואתי בלבד; השקלול הסופי מוצג בעמוד הראשון.',
    weightingRow: 'שקלול שווי פעילות',
    assumTitle: 'הנחות טכניות',
    rangeWord: 'טווח:',
    healthy: 'תקין',
    needsAttention: 'דורש תשומת לב',
    profitLabel: 'רווחיות',
    growthLabel: 'מסלול צמיחה',
    riskLabel: 'פרופיל סיכון',
    opsLabel: 'יעילות תפעולית',
    quickRatio: 'יחס מהיר',
    currentRatio: 'יחס שוטף',
    debtEquity: 'חוב להון',
    assetTurnover: 'מחזור נכסים',
    quickTarget: 'יעד: ≥ 1.0',
    currentTarget: 'יעד: ≥ 1.5',
    debtTarget: 'שמרני: < 1.5',
    turnoverHint: 'גבוה = יעיל יותר',
    clientIdentityTitle: 'פרטי לקוח ואימות זהות',
    clientFullName: 'שם מלא',
    clientCompany: 'שם חברה',
    clientNationalId: 'ת.ז. / ח.פ.',
    clientCorporateTaxId: 'ע.מ. / ח.פ. תאגידי',
    clientPhone: 'טלפון',
    clientEmail: 'דוא״ל',
  },
  en: {
    logoSub: 'Smart Business Valuation',
    reportTitle: 'Fair Market Valuation Report',
    dateLabel: 'Date',
    methodLabel: 'Method',
    method: 'DCF + Israeli Market Multiples 2026',
    heroLabel: 'Enterprise Value — Base Case',
    heroBadge: 'DCF + Multiples Average',
    revLabel: 'Annual Revenue',
    revSub: 'Current Year',
    ebitdaSub: 'Operating Margin',
    waccSub: 'Cost of Capital',
    findingsTitle: 'Key Findings',
    rangeTitle: 'Final Valuation Range',
    bull: 'Bull Case',
    base: 'Base Case',
    bear: 'Bear Case',
    evLabel: 'Enterprise Value',
    arbLabel: 'Arbitrage vs. Benchmark',
    reinvestLabel: 'Long-term Reinvestment Rate',
    disclaimer:
      `Legal notice: ${BRAND_NAME} provides an algorithmic indication only. This report does not constitute financial, investment, or tax advice. All decisions based on this report are the sole responsibility of the user.`,
    pg: (n: number) => `Page ${n} of 3`,
    multiplesTitle: 'Market Multiples Analysis — Industry Benchmark 2026',
    multCols: ['Multiple', 'Industry Median', 'Your Company', 'Implied EV', 'Status'],
    inRange: 'In range',
    high: 'Above avg',
    low: 'Below avg',
    avgMultiples: 'Multiples average EV',
    blended: 'Blended DCF + Multiples',
    scoreTitle: 'Business Health Score',
    scoreLabel: 'Score',
    ratiosTitle: 'Financial Profile & Key Ratios',
    dcfTitle: 'Valuation Path — DCF Base Case',
    chartTitle: 'Enterprise Value Trajectory (₪M)',
    leg1: 'Implied EV trajectory',
    leg2: 'Free Cash Flow to Firm',
    tableTitle: 'Base Case — Explicit Forecast',
    cols: ['Year', 'Revenue', 'EBIT', 'Free Cash Flow', 'PV of CF', 'Cumulative PV'],
    termRow: 'Terminal Value PV (Year 5)',
    evRow: 'DCF-only enterprise value — one blend component',
    modelMethodNote:
      'Mid-year discounting with standard reinvestment assumptions (McKinsey framework).',
    multiplesSubordinate:
      'Market multiples — comparative context only; headline blend is on page 1.',
    weightingRow: 'Enterprise value blend',
    assumTitle: 'Technical Assumptions',
    rangeWord: 'Range:',
    healthy: 'Healthy',
    needsAttention: 'Needs attention',
    profitLabel: 'Profitability',
    growthLabel: 'Growth trajectory',
    riskLabel: 'Risk profile',
    opsLabel: 'Operational efficiency',
    quickRatio: 'Quick Ratio',
    currentRatio: 'Current Ratio',
    debtEquity: 'Debt to Equity',
    assetTurnover: 'Asset Turnover',
    quickTarget: 'Target: ≥ 1.0',
    currentTarget: 'Target: ≥ 1.5',
    debtTarget: 'Conservative: < 1.5',
    turnoverHint: 'Higher = more efficient',
    clientIdentityTitle: 'Client & Identity Verification',
    clientFullName: 'Full name',
    clientCompany: 'Company name',
    clientNationalId: 'National ID / Reg. no.',
    clientCorporateTaxId: 'Corporate tax ID',
    clientPhone: 'Phone',
    clientEmail: 'Email',
  },
} as const;

type ReportCopy = (typeof COPY)[Locale];

function buildChartSvg(
  dcfRows: ValuationReportData['dcfRows'],
  t: ReportCopy,
): string {
  const maxEV = Math.max(...dcfRows.map((r) => r.cumulativePV ?? 0), 1);
  const maxFcf = Math.max(...dcfRows.map((r) => r.fcff ?? 0), 1);
  const evPoints = dcfRows
    .map((r, i) => {
      const x = 60 + i * 110;
      const y = 105 - ((r.cumulativePV ?? 0) / maxEV) * 90;
      return `${x},${y}`;
    })
    .join(' ');
  const fcfPoints = dcfRows
    .map((r, i) => {
      const x = 60 + i * 110;
      const y = 105 - ((r.fcff ?? 0) / maxFcf) * 70;
      return `${x},${y}`;
    })
    .join(' ');
  const dots = dcfRows
    .map((r, i) => {
      const x = 60 + i * 110;
      const y = 105 - ((r.cumulativePV ?? 0) / maxEV) * 90;
      return `<circle cx="${x}" cy="${y}" r="3" fill="#00D4C8"/>`;
    })
    .join('');
  const labels = dcfRows
    .map((_, i) => {
      const x = 60 + i * 110;
      return `<text x="${x}" y="118" text-anchor="middle" font-size="7" fill="#666">Y${i + 1}</text>`;
    })
    .join('');

  return `
    <svg width="100%" height="130" viewBox="0 0 620 130" data-pdf-ready="true" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="620" height="130" fill="#f7f7f5" rx="4"/>
      <line x1="50" y1="105" x2="580" y2="105" stroke="#ddd" stroke-width="1"/>
      ${evPoints ? `<polyline points="${evPoints}" fill="none" stroke="#0b2c24" stroke-width="2"/>` : ''}
      ${dots}
      ${fcfPoints ? `<polyline points="${fcfPoints}" fill="none" stroke="#00a080" stroke-width="1.5" stroke-dasharray="4 3"/>` : ''}
      ${labels}
      <g font-size="7" fill="#555">
        <rect x="420" y="8" width="8" height="8" fill="#0b2c24"/>
        <text x="432" y="15">${esc(t.leg1)}</text>
        <line x1="420" y1="24" x2="428" y2="24" stroke="#00a080" stroke-width="1.5" stroke-dasharray="3 2"/>
        <text x="432" y="27">${esc(t.leg2)}</text>
      </g>
    </svg>`;
}

function scoreBadge(
  label: string,
  status: 'ok' | 'warn',
  t: ReportCopy,
): string {
  const cls = status === 'ok' ? 'badge-ok' : 'badge-warn';
  const text = status === 'ok' ? t.healthy : t.needsAttention;
  return `<div class="no-break health-score-row" style="display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%;margin-bottom:4pt"><span class="${cls}">${esc(label)}:</span><span class="small muted">${esc(text)}</span></div>`;
}

export function buildPdfHtml(
  data: ValuationReportData,
  locale: Locale,
  options: BuildPdfHtmlOptions = {},
): string {
  const pdfMode = options.pdfMode ?? false;
  const isHe = locale === 'he';
  const dir = isHe ? 'rtl' : 'ltr';
  const align = isHe ? 'right' : 'left';
  const t = COPY[locale];

  const equifyBrandHtml = equifyLogoHtml('light-bg', { heightPt: 26 });
  const firmLogoHtml = data.firmLogoUrl
    ? `<img src="${esc(data.firmLogoUrl)}" alt="" style="max-height:36pt;max-width:120pt;margin-${isHe ? 'left' : 'right'}:8pt"/>`
    : '';

  const reportDate = new Date().toLocaleDateString(
    isHe ? 'he-IL' : 'en-GB',
    { day: 'numeric', month: 'long', year: 'numeric' },
  );

  const chartSub = isHe
    ? `WACC ${data.wacc?.toFixed(1) ?? '14'}% · צמיחה לטווח ארוך ${data.terminalGrowth?.toFixed(1) ?? '2.5'}%`
    : `WACC ${data.wacc?.toFixed(1) ?? '14'}% · Long-term growth ${data.terminalGrowth?.toFixed(1) ?? '2.5'}%`;

  const multiples = data.multiplesAnalysis ?? [];
  const multRows = multiples
    .map((m) => {
      const status =
        m.ratio >= m.medianRatio * 0.9 && m.ratio <= m.medianRatio * 1.1
          ? t.inRange
          : m.ratio > m.medianRatio
            ? t.high
            : t.low;
      const cells = isHe
        ? [status, fmtILS(m.impliedEV), `${m.ratio.toFixed(1)}x`, `${m.medianRatio.toFixed(1)}x`, m.name]
        : [m.name, `${m.medianRatio.toFixed(1)}x`, `${m.ratio.toFixed(1)}x`, fmtILS(m.impliedEV), status];
      return `<tr class="no-break">${cells.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`;
    })
    .join('');

  const multAvg =
    multiples.length > 0
      ? multiples.reduce((s, m) => s + (m.impliedEV ?? 0), 0) / multiples.length
      : null;

  const dcfRows = data.dcfRows ?? [];
  const tableRows = dcfRows
    .map((r, i) => {
      const cells = isHe
        ? [
            fmtILS(r.cumulativePV),
            fmtILS(r.pvFCFF),
            fmtILS(r.fcff),
            fmtILS(r.ebit),
            fmtILS(r.revenue),
            `Y${i + 1}`,
          ]
        : [
            `Y${i + 1}`,
            fmtILS(r.revenue),
            fmtILS(r.ebit),
            fmtILS(r.fcff),
            fmtILS(r.pvFCFF),
            fmtILS(r.cumulativePV),
          ];
      return `<tr class="no-break">${cells.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`;
    })
    .join('');

  const colHeaders = (isHe ? [...t.cols].reverse() : [...t.cols])
    .map((c) => `<th>${esc(c)}</th>`)
    .join('');
  const multColHeaders = (isHe ? [...t.multCols].reverse() : [...t.multCols])
    .map((c) => `<th>${esc(c)}</th>`)
    .join('');

  const termRow = isHe
    ? `<tr class="total-row no-break"><td colspan="${t.cols.length - 1}">${esc(t.termRow)}</td><td>${esc(fmtILS(data.terminalValuePV))}</td></tr>`
    : `<tr class="total-row no-break"><td>${esc(t.termRow)}</td><td colspan="${t.cols.length - 1}">${esc(fmtILS(data.terminalValuePV))}</td></tr>`;

  const dcfOnlyEv = data.evDcf ?? data.baseEV;
  const evRow = isHe
    ? `<tr class="total-row no-break"><td colspan="${t.cols.length - 1}">${esc(t.evRow)}</td><td>${esc(fmtILS(dcfOnlyEv))}</td></tr>`
    : `<tr class="total-row no-break"><td>${esc(t.evRow)}</td><td colspan="${t.cols.length - 1}">${esc(fmtILS(dcfOnlyEv))}</td></tr>`;

  const findingsHtml = (data.findings ?? [])
    .map(
      (f) =>
        `<div class="no-break" style="margin-bottom:5pt;display:flex;gap:6pt;align-items:flex-start"><span class="teal bold">•</span><span>${esc(f)}</span></div>`,
    )
    .join('');

  const ratioCards = [
    {
      label: t.quickRatio,
      val: data.quickRatio,
      desc: t.quickTarget,
      suffix: '',
    },
    {
      label: t.currentRatio,
      val: data.currentRatio,
      desc: t.currentTarget,
      suffix: '',
    },
    {
      label: t.debtEquity,
      val: data.debtToEquity,
      desc: t.debtTarget,
      suffix: 'x',
    },
    {
      label: t.assetTurnover,
      val: data.assetTurnover,
      desc: t.turnoverHint,
      suffix: 'x',
    },
  ]
    .map(
      (r) => `
    <div class="ratio-card no-break">
      <div class="small muted">${esc(r.label)}</div>
      <div class="bold" style="font-size:11pt;margin:2pt 0">${r.val != null ? esc(r.val.toFixed(2) + r.suffix) : '—'}</div>
      <div class="small muted">${esc(r.desc)}</div>
    </div>`,
    )
    .join('');

  const scoreCircle = `
    <div style="text-align:center">
      <div style="width:56pt;height:56pt;border-radius:50%;border:3pt solid #00D4C8;display:flex;align-items:center;justify-content:center;margin:0 auto 4pt">
        <span class="bold" style="font-size:16pt;color:#0b2c24">${data.confidenceScore ?? 78}</span>
      </div>
      <div class="small muted">${esc(t.scoreLabel)}</div>
    </div>`;

  const identity = data.clientIdentity;

  const identityHeaderLines = identity
    ? [
        identity.fullName.trim() ? `${t.clientFullName}: ${identity.fullName.trim()}` : '',
        identity.companyName.trim() ? `${t.clientCompany}: ${identity.companyName.trim()}` : '',
        identity.userPhone.trim() ? `${t.clientPhone}: ${identity.userPhone.trim()}` : '',
        identity.userEmail.trim() ? `${t.clientEmail}: ${identity.userEmail.trim()}` : '',
        identity.nationalId.trim() ? `${t.clientNationalId}: ${identity.nationalId.trim()}` : '',
        identity.corporateTaxId.trim()
          ? `${t.clientCorporateTaxId}: ${identity.corporateTaxId.trim()}`
          : '',
      ].filter(Boolean)
    : [];

  const verdictBlock =
    data.verdict != null
      ? verdictHeroHtml({
          companyName: data.companyName,
          metrics: data.verdict,
          bridge:
            data.equityBridge ??
            bridgeFromEnterpriseValue(data.baseEV, undefined, data.netDebt ?? 0),
          scenarioEquities: {
            bear: data.bearEquity ?? data.verdict.bearEquity,
            base: data.baseEquity ?? data.verdict.baseEquity,
            bull: data.bullEquity ?? data.verdict.bullEquity,
          },
          clientHeaderLines: identityHeaderLines,
        })
      : '';

  const pageHeader = (pageNum: number) => {
    const logoBlock = `
      <div style="text-align:${align}">
        ${equifyBrandHtml}
        <div class="small muted" style="margin-top:4pt">${esc(t.logoSub)}</div>
        ${firmLogoHtml}
      </div>`;
    const metaBlock = `
      <div style="text-align:${isHe ? 'left' : 'right'};font-size:8pt;line-height:1.5">
        ${identityHeaderLines.map((line) => `<div>${esc(line)}</div>`).join('')}
        <div><span class="muted">${esc(t.dateLabel)}:</span> ${esc(reportDate)}</div>
        <div><span class="muted">ID:</span> ${esc(data.reportId)}</div>
        <div><span class="muted">${esc(t.methodLabel)}:</span> ${esc(t.method)}</div>
      </div>`;
    return `
    <div class="page-header no-break">
      ${isHe ? metaBlock + logoBlock : logoBlock + metaBlock}
    </div>`;
  };

  const pageFooter = (n: number) => `
    <div class="pdf-footer">
      <span>${isHe ? `${BRAND_NAME} © ${new Date().getFullYear()}` : ''}</span>
      <span>${esc(t.pg(n))}</span>
      <span>${isHe ? '' : `${BRAND_NAME} © ${new Date().getFullYear()}`}</span>
    </div>`;

  const fontFaces = buildPdfFontFaceCss();
  const pdfModeCss = pdfMode
    ? `
    html.pdf-mode *, html.pdf-mode *::before, html.pdf-mode *::after {
      animation: none !important;
      transition: none !important;
    }`
    : '';

  const css = `
    ${fontFaces}
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: 'Heebo', Arial, sans-serif;
      font-size: 10pt;
      color: #1a1a1a;
      background: #fff;
      direction: ${dir};
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
    }
    body {
      overflow: visible !important;
    }
    .page {
      width: 100%;
      max-width: 100%;
      width: 100%;
      min-height: auto;
      height: auto;
      padding: 0;
      page-break-after: always;
      overflow: visible;
    }
    .page:last-child { page-break-after: avoid; }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    table:not(.dcf-table) {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    table:not(.dcf-table) thead {
      display: table-header-group;
    }
    table.dcf-table {
      page-break-inside: auto;
    }
    table.dcf-table thead {
      display: table-header-group;
    }
    table.dcf-table tbody tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .card, .section, .chart-container {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    h2, h3, .section-title {
      break-after: avoid;
      page-break-after: avoid;
    }
    .no-break { break-inside: avoid; page-break-inside: avoid; }
    .pdf-card-break {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      -webkit-column-break-inside: avoid !important;
    }
    .pdf-block-contain {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      display: block;
      width: 100%;
      position: relative;
    }
    .pdf-block-contain-spaced {
      margin-top: 1.5rem;
      margin-bottom: 1.5rem;
    }
    img { max-width: 100%; }
    .logo-text { font-size: 18pt; font-weight: 700; color: #0b2c24; }
    .logo-text span { color: #00D4C8; }
    .teal { color: #00a080; }
    .muted { color: #888; }
    .small { font-size: 8pt; }
    .bold { font-weight: 700; }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 10pt;
      border-bottom: 2pt solid #0b2c24;
      margin-bottom: 12pt;
    }
    .hero {
      border: 1.5pt solid #00D4C8;
      border-radius: 5pt;
      padding: 10pt 14pt;
      margin-bottom: 10pt;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .hero-badge {
      background: #0b2c24;
      color: #00D4C8;
      padding: 5pt 10pt;
      border-radius: 3pt;
      font-size: 8pt;
      font-weight: 700;
      white-space: nowrap;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6pt;
      margin-bottom: 10pt;
    }
    .metric-card {
      background: #f7f7f5;
      border-radius: 3pt;
      padding: 7pt 9pt;
      text-align: ${align};
    }
    .section-title {
      font-size: 8pt;
      font-weight: 700;
      color: #00a080;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      border-bottom: 0.5pt solid #eee;
      padding-bottom: 2pt;
      margin: 8pt 0 5pt;
    }
    .range-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6pt;
      margin-bottom: 8pt;
    }
    .range-bull { border: 0.5pt solid #9FE1CB; border-radius: 3pt; padding: 7pt 9pt; text-align: ${align}; }
    .range-base { border: 1pt solid #00D4C8; border-radius: 3pt; padding: 7pt 9pt; background: #f0fdf8; text-align: ${align}; }
    .range-bear { border: 0.5pt solid #F7C1C1; border-radius: 3pt; padding: 7pt 9pt; text-align: ${align}; }
    .badge-ok { background: #E1F5EE; color: #085041; padding: 1pt 5pt; border-radius: 8pt; font-size: 7pt; font-weight: 700; }
    .badge-warn { background: #FAEEDA; color: #633806; padding: 1pt 5pt; border-radius: 8pt; font-size: 7pt; font-weight: 700; }
    th { background: #0b2c24; color: #00D4C8; padding: 4pt 7pt; font-size: 8pt; text-align: ${align}; }
    td { padding: 4pt 7pt; border-bottom: 0.5pt solid #eee; font-size: 8.5pt; text-align: ${align}; }
    tr:nth-child(even) td { background: #f8f8f6; }
    .total-row td { background: #f0fdf8; font-weight: 700; border-top: 1pt solid #00D4C8; }
    .chart-wrap,
    .chart-container {
      background: #f7f7f5;
      border-radius: 3pt;
      padding: 8pt;
      margin-bottom: 8pt;
    }
    .ratio-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5pt;
      margin-bottom: 8pt;
    }
    .ratio-card { border: 0.5pt solid #eee; border-radius: 3pt; padding: 6pt 8pt; text-align: ${align}; }
    .score-grid { display: grid; grid-template-columns: 72pt 1fr; gap: 10pt; align-items: start; margin-bottom: 8pt; }
    .pdf-footer {
      margin-top: 14pt;
      padding-top: 4pt;
      border-top: 0.5pt solid #eee;
      display: flex;
      justify-content: space-between;
      font-size: 7pt;
      color: #bbb;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    @media print {
      html, body {
        overflow: visible !important;
        height: auto !important;
      }
      .page {
        min-height: auto !important;
        height: auto !important;
        overflow: visible !important;
      }
      .card, .section, .chart-container {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      h2, h3, .section-title {
        break-after: avoid;
        page-break-after: avoid;
      }
      table:not(.dcf-table) {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      table thead {
        display: table-header-group;
      }
    }
    ${pdfModeCss}
    .disclaimer { font-size: 7pt; color: #ccc; margin-top: 8pt; line-height: 1.5; text-align: ${align}; }
    .arb-row {
      background: #f7f7f5;
      border-radius: 3pt;
      padding: 6pt 10pt;
      font-size: 8.5pt;
      color: #555;
      margin-bottom: 8pt;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .company-title { font-size: 16pt; font-weight: 700; color: #0b2c24; margin-bottom: 4pt; text-align: ${align}; }
    .company-sub { font-size: 9pt; color: #666; margin-bottom: 10pt; text-align: ${align}; }
    .client-identity-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4pt 12pt;
      margin-bottom: 10pt;
      font-size: 8.5pt;
      border: 0.5pt solid #e8e8e4;
      border-radius: 3pt;
      padding: 7pt 9pt;
      background: #fafaf8;
    }
    .client-identity-item { line-height: 1.45; }
    .client-identity-label { color: #888; font-size: 7.5pt; display: block; }
    .client-identity-value { font-weight: 700; color: #0b2c24; }
    .num-ltr { direction: ltr; unicode-bidi: embed; display: inline-block; }
  `;

  const chartSvg = buildChartSvg(dcfRows, t);

  const identityValue = (value: string) =>
    value.trim() ? esc(value.trim()) : '—';
  const clientIdentityHtml = identity
    ? `
    <div class="section-title">${esc(t.clientIdentityTitle)}</div>
    <div class="client-identity-grid no-break">
      <div class="client-identity-item">
        <span class="client-identity-label">${esc(t.clientFullName)}</span>
        <span class="client-identity-value">${identityValue(identity.fullName)}</span>
      </div>
      <div class="client-identity-item">
        <span class="client-identity-label">${esc(t.clientCompany)}</span>
        <span class="client-identity-value">${identityValue(identity.companyName)}</span>
      </div>
      <div class="client-identity-item">
        <span class="client-identity-label">${esc(t.clientNationalId)}</span>
        <span class="client-identity-value num-ltr">${identityValue(identity.nationalId)}</span>
      </div>
      <div class="client-identity-item">
        <span class="client-identity-label">${esc(t.clientCorporateTaxId)}</span>
        <span class="client-identity-value num-ltr">${identityValue(identity.corporateTaxId)}</span>
      </div>
      <div class="client-identity-item">
        <span class="client-identity-label">${esc(t.clientPhone)}</span>
        <span class="client-identity-value num-ltr">${identityValue(identity.userPhone)}</span>
      </div>
      <div class="client-identity-item">
        <span class="client-identity-label">${esc(t.clientEmail)}</span>
        <span class="client-identity-value num-ltr">${identityValue(identity.userEmail)}</span>
      </div>
    </div>`
    : '';

  const htmlLang = isHe ? 'he' : 'en';

  return `<!DOCTYPE html>
<html lang="${htmlLang}" dir="${dir}"${pdfMode ? ' class="pdf-mode"' : ''}>
<head>
  <meta charset="utf-8"/>
  <title>${esc(t.reportTitle)} — ${esc(data.companyName)}</title>
  <style>${css}</style>
</head>
<body${pdfMode ? ' class="pdf-mode"' : ''}>
  <div class="page section">
    ${verdictBlock || `${pageHeader(1)}${clientIdentityHtml}`}
    <div class="company-title" style="margin-top:8pt">${esc(data.companyName)}</div>
    <div class="company-sub">${esc(data.industrySector)} · ${esc(data.lifecycleStage)} · Israel</div>
    ${verdictBlock ? '' : clientIdentityHtml}

    <div class="metrics-grid no-break">
      <div class="metric-card card">
        <div class="small muted">${esc(t.revLabel)}</div>
        <div class="bold" style="font-size:12pt"><span class="num-ltr">${esc(fmtILS(data.revenue))}</span></div>
        <div class="small muted">${esc(t.revSub)}</div>
      </div>
      <div class="metric-card card">
        <div class="small muted">EBITDA</div>
        <div class="bold" style="font-size:12pt"><span class="num-ltr">${esc(fmtILS(data.ebitda))}</span></div>
        <div class="small muted">${esc(t.ebitdaSub)}: ${data.ebitdaMargin?.toFixed(1) ?? '—'}%</div>
      </div>
      <div class="metric-card card">
        <div class="small muted">WACC</div>
        <div class="bold" style="font-size:12pt"><span class="num-ltr">${data.wacc?.toFixed(1) ?? '—'}%</span></div>
        <div class="small muted">${esc(t.waccSub)}</div>
      </div>
    </div>

    <div class="section-title">${esc(t.findingsTitle)}</div>
    ${findingsHtml}

    <div class="section-title">${esc(t.rangeTitle)}</div>
    <div class="range-grid no-break section">
      <div class="range-bull card">
        <div class="small muted">${esc(t.bull)}</div>
        <div class="bold"><span class="num-ltr">${esc(fmtILS(data.bullEV))}</span></div>
        <div class="small muted">${esc(t.evLabel)}</div>
      </div>
      <div class="range-base card">
        <div class="small teal bold">${esc(t.base)}</div>
        <div class="bold" style="font-size:12pt"><span class="num-ltr">${esc(fmtILS(data.baseEV))}</span></div>
        <div class="small muted">${esc(t.evLabel)}</div>
      </div>
      <div class="range-bear card">
        <div class="small muted">${esc(t.bear)}</div>
        <div class="bold"><span class="num-ltr">${esc(fmtILS(data.bearEV))}</span></div>
        <div class="small muted">${esc(t.evLabel)}</div>
      </div>
    </div>

    ${
      data.weightingLabelHe
        ? `<div class="arb-row no-break"><span class="bold">${esc(t.weightingRow)}:</span> <span>${esc(data.weightingLabelHe)}</span></div>`
        : ''
    }

    <div class="arb-row no-break">
      <span>${esc(t.arbLabel)}: <span class="num-ltr bold">${esc(fmtILS(data.arbitrageGap))}</span></span>
      <span>${esc(t.reinvestLabel)}: ${data.reinvestmentRate?.toFixed(1) ?? '—'}%</span>
    </div>

    <div class="disclaimer">${esc(t.disclaimer)}</div>
    ${pageFooter(1)}
  </div>

  <div class="page section">
    ${pageHeader(2)}
    <div class="section-title" style="margin-top:0">${esc(t.multiplesTitle)}</div>
    <div class="small muted no-break" style="margin-bottom:8pt;line-height:1.5">${esc(t.multiplesSubordinate)}</div>
    <table class="no-break section">
      <thead><tr>${multColHeaders}</tr></thead>
      <tbody>${multRows}</tbody>
    </table>
    ${
      multAvg
        ? `<div class="no-break small" style="margin-bottom:8pt"><span class="bold">${esc(t.avgMultiples)}:</span> <span class="num-ltr">${esc(fmtILS(multAvg))}</span> · <span class="bold">${esc(t.blended)}:</span> <span class="num-ltr">${esc(fmtILS(data.blendedEV ?? data.baseEV))}</span></div>`
        : ''
    }

    <div class="section-title">${esc(t.scoreTitle)}</div>
    <div class="score-grid no-break">
      ${isHe ? '' : scoreCircle}
      <div>
        ${scoreBadge(t.profitLabel, 'warn', t)}
        ${scoreBadge(t.growthLabel, 'ok', t)}
        ${scoreBadge(t.riskLabel, 'warn', t)}
        ${scoreBadge(t.opsLabel, 'ok', t)}
      </div>
      ${isHe ? scoreCircle : ''}
    </div>

    <div class="section-title">${esc(t.ratiosTitle)}</div>
    <div class="ratio-grid">${ratioCards}</div>

    <div class="disclaimer">${esc(t.disclaimer)}</div>
    ${pageFooter(2)}
  </div>

  <div class="page section">
    ${pageHeader(3)}
    <div class="section-title" style="margin-top:0">${esc(t.dcfTitle)}</div>
    <div class="chart-wrap chart-container no-break">
      <div class="bold" style="font-size:9pt;margin-bottom:2pt">${esc(t.chartTitle)}</div>
      <div class="small muted" style="margin-bottom:6pt">${esc(chartSub)}</div>
      ${chartSvg}
    </div>

    <div class="section-title">${esc(t.tableTitle)}</div>
    <table class="dcf-table section">
      <thead><tr>${colHeaders}</tr></thead>
      <tbody>
        ${tableRows}
        ${termRow}
        ${evRow}
      </tbody>
    </table>

    <div class="section-title">${esc(t.assumTitle)}</div>
    <div class="small muted no-break" style="line-height:1.6;text-align:${align}">
      ${esc(t.modelMethodNote)}
    </div>

    <div class="disclaimer">${esc(t.disclaimer)}</div>
    ${pageFooter(3)}
  </div>
</body>
</html>`;
}
