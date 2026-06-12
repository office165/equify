import { equifyLogoHtml } from './equify-logo-html';
import type { EquityBridgeMetrics } from '../valuation/equity_bridge';
import { formatDlomPercent } from '../valuation/equity_bridge';
import type { VerdictMetrics } from '../valuation/verdict_metrics';
import { valuationCopy } from './valuation_copy';

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtMoney(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value);
}

export interface VerdictHeroHtmlOptions {
  companyName: string;
  metrics: VerdictMetrics;
  bridge: EquityBridgeMetrics;
  clientHeaderLines?: string[];
  scenarioEquities?: { bear: number; base: number; bull: number };
}

function waterfallRow(
  label: string,
  value: number,
  body: string,
  opts: { operator?: string; emphasis?: boolean; dlomPct?: string } = {},
): string {
  const border = opts.emphasis ? '#34d399' : '#e2e8f0';
  const bg = opts.emphasis ? '#ecfdf5' : '#fafafa';
  const size = opts.emphasis ? '14pt' : '12pt';
  const dlom = opts.dlomPct
    ? `<span style="font-size:8pt;color:#64748b;margin-inline-start:4pt">${esc(opts.dlomPct)}</span>`
    : '';
  const op = opts.operator
    ? `<div style="text-align:center;margin:4pt 0"><span style="display:inline-flex;align-items:center;justify-content:center;width:18pt;height:18pt;border-radius:50%;border:0.5pt solid #34d399;color:#059669;font-size:9pt">${esc(opts.operator)}</span></div>`
    : '';

  return `${op}
<div class="pdf-card-break" style="border:0.5pt solid ${border};background:${bg};border-radius:6pt;padding:8pt;margin-bottom:2pt">
  <div style="display:flex;justify-content:space-between;gap:8pt;align-items:flex-start">
    <div style="flex:1">
      <div style="font-size:9pt;font-weight:700;color:#0d1b2a">${esc(label)}${dlom}</div>
      <div style="font-size:7.5pt;color:#64748b;margin-top:3pt;line-height:1.45">${esc(body)}</div>
    </div>
    <div class="num-ltr" style="font-size:${size};font-weight:700;color:#0d1b2a;white-space:nowrap">${esc(fmtMoney(value))}</div>
  </div>
</div>`;
}

function scenarioStrip(equities: { bear: number; base: number; bull: number }): string {
  const cell = (name: string, value: number, highlight: boolean) => `
<div style="flex:1;text-align:center;padding:6pt;border-radius:6pt;border:0.5pt solid ${highlight ? '#34d399' : '#e2e8f0'};background:${highlight ? '#ecfdf5' : '#fff'}">
  <div style="font-size:7pt;color:#64748b;text-transform:uppercase;letter-spacing:0.08em">${esc(name)}</div>
  <div class="num-ltr" style="font-size:11pt;font-weight:700;color:#0d1b2a;margin-top:2pt">${esc(fmtMoney(value))}</div>
</div>`;

  return `
<div class="pdf-card-break" style="display:flex;gap:6pt;margin:10pt 0">
  ${cell('דובי', equities.bear, false)}
  ${cell('בסיס', equities.base, true)}
  ${cell('שורי', equities.bull, false)}
</div>`;
}

export function verdictHeroHtml(opts: VerdictHeroHtmlOptions): string {
  const { metrics, companyName, bridge, clientHeaderLines = [], scenarioEquities } = opts;

  const clientLines = clientHeaderLines
    .filter(Boolean)
    .map((line) => `<div style="font-size:8pt;color:#475569;line-height:1.5">${esc(line)}</div>`)
    .join('');

  const dlomFootnote = `* שווי המניות לבעלים מחושב לאחר הפחתת דיסקאונט אי־סחירות (DLOM) של ${formatDlomPercent(bridge.dlomRate)} המקובל בהערכות שווי של חברות פרטיות בישראל, המשקף את פערי הנזילות מול חברה ציבורית.`;

  const rows = [
    waterfallRow(
      'שווי הפעילות',
      bridge.enterpriseValue,
      'כמה שווה מנוע העסק עצמו — מחושב בשקלול תזרים מהוון (DCF) ומכפילים ענפיים ישראליים.',
    ),
    waterfallRow(
      'חוב פיננסי נטו',
      bridge.netDebt,
      'הלוואות והתחייבויות לבנקים, בניכוי המזומנים והפיקדונות בקופה.',
      { operator: '−' },
    ),
  ];

  if (bridge.dlomDeduction > 0 && bridge.dlomRate > 0) {
    rows.push(
      waterfallRow(
        'דיסקאונט אי־סחירות (DLOM)',
        bridge.dlomDeduction,
        'הפחתה מקובלת בחברות פרטיות, כי מניה פרטית קשה יותר למכירה ממניה בבורסה.',
        { operator: '−', dlomPct: formatDlomPercent(bridge.dlomRate) },
      ),
    );
  }

  if (bridge.controlPremiumApplied && bridge.controlPremiumAmount > 0) {
    rows.push(
      waterfallRow(
        'פרמיית שליטה',
        bridge.controlPremiumAmount,
        'תוספת מקובלת בהערכות למכירה או גיוס הכוללים מעבר שליטה.',
        { operator: '+' },
      ),
    );
  }

  rows.push(
    waterfallRow(
      'שווי לבעלים',
      bridge.finalEquityValue,
      'מה שנשאר לבעלי המניות לאחר חוב ותיקוני נזילות.',
      { operator: '=', emphasis: true },
    ),
  );

  const scenarios = scenarioEquities ?? {
    bear: metrics.bearEquity,
    base: metrics.baseEquity,
    bull: metrics.bullEquity,
  };

  return `
<div class="pdf-card-break" style="margin-bottom:12pt;background:#fff;padding:10pt;border-radius:6pt">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10pt;border-bottom:1.5pt solid #0d1b2a;padding-bottom:8pt">
    ${equifyLogoHtml('light-bg', { heightPt: 22 })}
    <div style="text-align:left">${clientLines}</div>
  </div>
  <div style="font-size:9pt;color:#64748b;text-align:center;letter-spacing:0.12em;text-transform:uppercase;font-weight:300">${esc(valuationCopy('he', 'conclusionEyebrow'))}</div>
  <div class="num-ltr" style="text-align:center;font-size:32pt;font-weight:800;color:#0d1b2a;margin:8pt 0;line-height:1">${esc(fmtMoney(metrics.equityValue))}</div>
  <div style="text-align:center;font-size:8.5pt;color:#475569;max-width:420pt;margin:0 auto 8pt;line-height:1.5">
    ${esc(valuationCopy('he', 'equityHeadlineSubtitle'))}
  </div>
  <div style="font-size:8pt;color:#94a3b8;text-align:center;margin-bottom:10pt">${esc(companyName)}</div>
  <div style="font-size:9pt;font-weight:600;color:#334155;text-align:center;margin-bottom:8pt">${esc(valuationCopy('he', 'howWeArrived'))}</div>
  ${rows.join('')}
  <div style="font-size:7.5pt;color:#64748b;text-align:center;font-style:italic;line-height:1.5;margin-top:8pt">${esc(dlomFootnote)}</div>
  <div style="font-size:8pt;color:#64748b;text-align:center;margin:10pt 0 6pt">שלושה תרחישים — אותו מנוע. ההבדל: הנחות הצמיחה והסיכון.</div>
  ${scenarioStrip(scenarios)}
</div>`;
}
