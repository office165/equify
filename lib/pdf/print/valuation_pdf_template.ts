import type { ForecastMatrixWithDiagnostics } from '../../../valuation_forecast';
import type { ValuationLocale } from '../../../api_client';
import type { ValuationReportData } from '../types';
import { getLegalDisclaimer } from '../../legal/disclaimer';
import {
  buildFinancialTrajectoryBarsSvg,
  buildMultiplesPositionSvg,
  buildQualityGaugeSvg,
  buildScenarioRangeSvg,
  buildWaccDonutSvg,
} from './valuation_pdf_charts';
import { formatNetDebtLine } from '../../format/currency';
import { escHtml, equityCoverValHtml, fmtMoneyCompact } from './print_formatters';
import { ebitdaMultipleInterpretationCopy } from '../../i18n/equify_report_copy';
import {
  BLEND_TABLE_WIDTHS,
  MULTIPLES_TABLE_WIDTHS,
  reportColgroup,
} from '../../pdf-template/report-table-layout';
import { equifyLogoHtml } from '../../brand/equify-logo-html';
import { buildCoverCircleStageHtml } from '../../pdf-template/cover-circle-graphic';
import { buildValuationPdfSheetCss } from './valuation_pdf_styles';
import {
  buildValuationPdfViewModel,
  type ValuationPdfViewModel,
} from './valuation_pdf_view_model';

export type { ValuationPdfViewModel };

function formatPrintNetDebtRow(vm: ValuationPdfViewModel): {
  label: string;
  valueHtml: string;
  barWidthPct: number;
  barStyle: string;
} {
  const netDebtK = vm.netDebt / 1000;
  const line = formatNetDebtLine(netDebtK, 'he', 'ILS');
  const color =
    line.tone === 'positive'
      ? 'var(--turq)'
      : line.tone === 'negative'
        ? '#C24A4A'
        : 'var(--text)';
  const barWidthPct = Math.min(
    100,
    (Math.abs(vm.netDebt) / Math.max(vm.enterpriseValue, 1)) * 100,
  );
  const barStyle =
    line.tone === 'positive'
      ? `inset-inline-start:0;width:${barWidthPct.toFixed(1)}%;background:linear-gradient(90deg,#4DD6CE,#00A89F)`
      : `inset-inline-end:0;width:${barWidthPct.toFixed(1)}%;background:linear-gradient(90deg,#F0ADAD,#C24A4A)`;
  return {
    label: line.labelHe,
    valueHtml: `<b style="color:${color}">${escHtml(line.displayValue)}</b>`,
    barWidthPct,
    barStyle,
  };
}

export interface BuildValuationPdfTemplateOptions {
  matrix: ForecastMatrixWithDiagnostics;
  locale?: ValuationLocale;
}

function logoHtml(): string {
  return equifyLogoHtml('light-bg', { heightPt: 28 });
}

function sheetHead(vm: ValuationPdfViewModel, ridSuffix?: string): string {
  const rid = ridSuffix ?? vm.reportId;
  const company = ridSuffix ? ` · ${escHtml(vm.companyName)}` : `VALUATION REPORT · #${escHtml(rid)}`;
  return `<div class="head">${logoHtml()}<span class="rid">#${escHtml(rid)}${company}</span></div><div class="rule"></div>`;
}

function sheetFoot(page: number, total = 7): string {
  return `<div class="foot"><span>EQUIFY VALUATION ENGINE © 2026 SBC</span><span class="pg">עמוד <b>${page}</b> / ${total}</span></div>`;
}

function wrapSheet(
  page: number,
  inner: string,
  opts: { cover?: boolean } = {},
): string {
  const cls = opts.cover ? 'sheet cover' : 'sheet';
  return `<div class="${cls}">${inner}${sheetFoot(page)}</div>`;
}

function buildPage1Cover(vm: ValuationPdfViewModel): string {
  const metaParts = [
    vm.corporateId ? `ח.פ. ${escHtml(vm.corporateId)}` : '',
    vm.industrySector ? `ענף: ${escHtml(vm.industrySector)}` : '',
    `מטרת ההערכה: ${escHtml(vm.goalLabel)}`,
  ].filter(Boolean);

  const body = `
  ${sheetHead(vm)}
  <div class="body cover-layout">
    <div class="cover-hero-zone">
      <div class="cover-header">
        <span class="eyebrow cover-eyebrow">דוח הערכת שווי · ${escHtml(vm.valuationDate)}</span>
        <div class="c-comp">${escHtml(vm.companyName)}</div>
        <div class="c-meta">${metaParts.join(' · ')}</div>
      </div>
      ${buildCoverCircleStageHtml(equityCoverValHtml(vm.finalEquity), vm.finalEquity)}
    </div>
    <div class="cover-lower-stack">
      <div class="c-cap">שווי לבעלים (Equity Value) · תרחיש בסיס · טווח <b class="num">${escHtml(fmtMoneyCompact(vm.bearEquity))} – ${escHtml(fmtMoneyCompact(vm.bullEquity))}</b></div>
      <div class="seal"><i></i>CERTIFIED ALGORITHMIC VALUATION · SBC METHODOLOGY</div>
      <div class="cover-metrics c-grid c-grid--cover">
        <div><b class="hl">${escHtml(fmtMoneyCompact(vm.finalEquity))}</b><span>שווי לבעלים · בסיס</span></div>
        <div><b>${vm.waccPct.toFixed(1)}%</b><span>WACC אפקטיבי</span></div>
        <div><b class="gd">${vm.qualityScore} / ${escHtml(vm.qualityGrade)}</b><span>Quality Score</span></div>
      </div>
    </div>
  </div>`;

  return wrapSheet(1, body, { cover: true });
}

function buildPage2Exec(vm: ValuationPdfViewModel): string {
  const netDebtRow = formatPrintNetDebtRow(vm);
  const blendRows = vm.modelBlend
    .map(
      (row) => `<tr>
        <td>${escHtml(row.name)}</td>
        <td class="n">${escHtml(fmtMoneyCompact(row.ev))}</td>
        <td class="n">${row.weightPct.toFixed(0)}%</td>
        <td class="n">${escHtml(fmtMoneyCompact(row.contribution))}</td>
      </tr>`,
    )
    .join('');

  const body = `
  ${sheetHead(vm, vm.reportId)}
  <div class="body page-body--exec page-body--distributed">
    <div class="page-intro">
      <span class="eyebrow">02 · תקציר מנהלים</span>
      <h2>השורה התחתונה — קודם.</h2>
      <p class="sub">${escHtml(vm.executiveSummary)}</p>
    </div>
    <div class="page-stack">
      <section class="page-section page-section--kpi">
        <div class="kgrid">
          <div class="kcard"><div class="kv hl">${escHtml(fmtMoneyCompact(vm.finalEquity))}</div><div class="kl">שווי לבעלים · בסיס</div></div>
          <div class="kcard"><div class="kv">${escHtml(fmtMoneyCompact(vm.enterpriseValue))}</div><div class="kl">שווי פעילות (EV)</div></div>
          <div class="kcard"><div class="kv">${vm.waccPct.toFixed(1)}%</div><div class="kl">WACC אפקטיבי</div></div>
          <div class="kcard"><div class="kv gd">${escHtml(vm.qualityGrade)} · ${vm.qualityScore}</div><div class="kl">Quality Score</div></div>
        </div>
      </section>
      <section class="page-section page-section--waterfall">
        <div class="box">
          <h3>מ-EV לשווי לבעלים</h3>
          <div class="wf-row"><span class="lbl">שווי פעילות</span><div class="wf-track"><div class="wf-fill" style="inset-inline-start:0;width:100%;background:linear-gradient(90deg,#4DD6CE,#00A89F)"></div></div><b>${escHtml(fmtMoneyCompact(vm.enterpriseValue))}</b></div>
          <div class="wf-row"><span class="lbl">${netDebtRow.label}</span><div class="wf-track"><div class="wf-fill" style="${netDebtRow.barStyle}"></div></div>${netDebtRow.valueHtml}</div>
          <div class="wf-row"><span class="lbl"><b style="color:var(--pine);font-family:Assistant,sans-serif">שווי לבעלים</b></span><div class="wf-track"><div class="wf-fill" style="inset-inline-start:0;width:${vm.equityWidthPct}%;background:linear-gradient(90deg,#00A89F,#163530)"></div></div><b style="color:var(--turq)">${escHtml(fmtMoneyCompact(vm.finalEquity))}</b></div>
        </div>
      </section>
      <section class="page-section page-section--blend">
        <table class="report-table report-table--blend">
          <tr><th>מודל</th><th>שווי פעילות</th><th>משקל</th><th>תרומה</th></tr>
          ${blendRows}
          <tr class="sum"><td>שווי פעילות משולב</td><td class="n"></td><td class="n">100%</td><td class="n">${escHtml(fmtMoneyCompact(vm.enterpriseValue))}</td></tr>
        </table>
        <p class="note">הערכה זו בוצעה ב-${escHtml(vm.valuationDateShort)} על בסיס נתונים שהוזנו על ידי המשתמש ונתוני שוק מכוילים.</p>
      </section>
    </div>
  </div>`;

  return wrapSheet(2, body);
}

function buildPage3Financials(vm: ValuationPdfViewModel): string {
  const chart = buildFinancialTrajectoryBarsSvg(vm.trajectory, vm.trajectoryCeilingM);
  const yearHeaders = vm.trajectory.map((y) => `<th>${escHtml(y.label)}</th>`).join('');
  const revRow = vm.trajectory
    .map((y) => `<td class="n">${y.revenueM.toFixed(1)}</td>`)
    .join('');
  const ebtRow = vm.trajectory
    .map((y) => `<td class="n">${y.ebitdaM.toFixed(2)}</td>`)
    .join('');
  const marginRow = vm.trajectory
    .map((y) => {
      const m = y.revenueM > 0 ? (y.ebitdaM / y.revenueM) * 100 : 0;
      return `<td class="n">${m.toFixed(1)}%</td>`;
    })
    .join('');

  const body = `
  ${sheetHead(vm, vm.reportId)}
  <div class="body">
    <span class="eyebrow">03 · נתונים פיננסיים</span>
    <h2>המספרים שמאחורי המודל.</h2>
    <p class="sub">הכנסות ו-EBITDA בפועל ותחזית. צמיחה שנתית ממוצעת ושיפור הדרגתי בשיעור ה-EBITDA.</p>
    <div class="box">
      <h3>הכנסות מול EBITDA · ₪M</h3>
      ${chart}
    </div>
    <table>
      <tr><th>₪M</th>${yearHeaders}</tr>
      <tr><td>הכנסות</td>${revRow}</tr>
      <tr><td>EBITDA</td>${ebtRow}</tr>
      <tr class="sum"><td>שיעור EBITDA</td>${marginRow}</tr>
    </table>
    <p class="note">${escHtml(vm.netDebtNote)}</p>
  </div>`;

  return wrapSheet(3, body);
}

function buildPage4Dcf(vm: ValuationPdfViewModel): string {
  const donut = buildWaccDonutSvg(vm.waccPct, vm.waccSegments);
  const waccRows = vm.waccSegments
    .map(
      (seg) => `<tr><td><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${seg.color};margin-inline-end:6px"></span>${escHtml(seg.label)}</td><td class="n">${seg.pct.toFixed(1)}%</td></tr>`,
    )
    .join('');

  const yearCols = vm.dcfFcffRows.map((r) => `<th>${escHtml(r.label)}</th>`).join('');
  const fcffCells = vm.dcfFcffRows.map((r) => `<td class="n">${r.fcffM.toFixed(2)}</td>`).join('');
  const dfCells = vm.dcfFcffRows.map((r) => `<td class="n">${r.discountFactor.toFixed(3)}</td>`).join('');
  const pvCells = vm.dcfFcffRows.map((r) => `<td class="n">${r.pvM.toFixed(2)}</td>`).join('');

  const body = `
  ${sheetHead(vm, vm.reportId)}
  <div class="body page-body--dcf page-body--distributed">
    <div class="page-intro">
      <span class="eyebrow">04 · היוון תזרימי מזומנים</span>
      <h2>מבט קדימה: DCF.</h2>
      <p class="sub">תזרימי המזומנים החופשיים (FCFF) מהוונים בעלות הון משוקללת של ${vm.waccPct.toFixed(1)}%. הערך הטרמינלי חושב בצמיחה פרמננטית של 2.5%.</p>
    </div>
    <div class="page-stack">
      <section class="page-section page-section--wacc">
        <div class="dcf-wacc-layout">
          <div class="box box-chart-visible">
            <h3>הרכב WACC</h3>
            ${donut}
          </div>
          <div class="dcf-wacc-table-wrap">
            <table class="report-table report-table--wacc">
              <tr><th>רכיב</th><th>שיעור</th></tr>
              ${waccRows}
              <tr class="sum"><td>WACC אפקטיבי</td><td class="n">${vm.waccPct.toFixed(1)}%</td></tr>
            </table>
          </div>
        </div>
      </section>
      <section class="page-section page-section--horizon">
        <table class="report-table report-table--dcf">
          <tr><th>₪M</th>${yearCols}<th>טרמינלי</th></tr>
          <tr><td>FCFF חזוי</td>${fcffCells}<td class="n">${vm.terminalPvM.toFixed(2)}</td></tr>
          <tr><td>פקטור היוון</td>${dfCells}<td class="n">—</td></tr>
          <tr><td>שווי נוכחי</td>${pvCells}<td class="n">${vm.terminalPvM.toFixed(1)}*</td></tr>
          <tr class="sum"><td>שווי פעילות לפי DCF</td><td class="n" colspan="${vm.dcfFcffRows.length}"></td><td class="n">${escHtml(fmtMoneyCompact(vm.evDcf))}</td></tr>
        </table>
        <p class="note">* ערך טרמינלי מהווה ${vm.terminalSharePct}% מסך השווי לפי DCF — רגישות גבוהה להנחת הצמיחה הפרמננטית.</p>
      </section>
    </div>
  </div>`;

  return wrapSheet(4, body);
}

function buildPage5Multiples(vm: ValuationPdfViewModel): string {
  const chart = buildMultiplesPositionSvg(vm.multiplesPositions);

  const body = `
  ${sheetHead(vm, vm.reportId)}
  <div class="body page-body--multiples page-body--distributed">
    <div class="page-intro">
      <span class="eyebrow">05 · מכפילי שוק</span>
      <h2>מבט הצידה: השוק.</h2>
      <p class="sub">המכפילים מכוילים מול עסקאות M&A ישראליות בענף ${escHtml(vm.industrySector)}. הפס האפור מציג את טווח השוק; הסימון — את מיקום החברה בתוכו.</p>
    </div>
    <div class="page-stack">
      <section class="page-section page-section--tracks">
        <div class="box box-chart-visible">
          <h3>מיקום מול טווח השוק</h3>
          ${chart}
        </div>
      </section>
      <section class="page-section page-section--compare">
        <table class="report-table report-table--multiples multiples-compare-table">
          ${reportColgroup([...MULTIPLES_TABLE_WIDTHS])}
          <tr><th>פרמטר</th><th>החברה</th><th>חציון השוק</th><th>פרשנות</th></tr>
          <tr><td>מכפיל EBITDA</td><td class="n">×${vm.ebitdaMultiple.toFixed(1)}</td><td class="n">×${vm.industryEbitdaMedian.toFixed(1)}</td><td class="interp-cell">${escHtml(ebitdaMultipleInterpretationCopy({ effectiveMult: vm.ebitdaMultiple, qualityScore: vm.qualityScore, qualityGrade: vm.qualityGrade }))}</td></tr>
          <tr><td>מכפיל הכנסות</td><td class="n">×${vm.revenueMultiple.toFixed(1)}</td><td class="n">×${vm.industryRevenueMedian.toFixed(1)}</td><td class="interp-cell">בתוך טווח השוק</td></tr>
          <tr><td>שיעור EBITDA</td><td class="n">${vm.ebitdaMarginPct.toFixed(1)}%</td><td class="n">${vm.industryEbitdaMarginPct.toFixed(1)}%</td><td class="interp-cell">רווחיות ביחס לענף</td></tr>
        </table>
        <p class="note">מכפילים מותאמים לגודל, צמיחה ושיעור הכנסות חוזרות (Quality-adjusted).</p>
      </section>
    </div>
  </div>`;

  return wrapSheet(5, body);
}

function buildPage6Scenarios(vm: ValuationPdfViewModel): string {
  const scenarioRows = vm.scenarios
    .map((s) => {
      const bg = s.key === 'base' ? ' style="background:var(--tint)"' : '';
      const eqStyle =
        s.key === 'bear'
          ? 'color:#C24A4A;font-weight:600'
          : s.key === 'bull'
            ? 'color:#A8842E;font-weight:600'
            : 'color:#00A89F;font-weight:700';
      const label = s.key === 'base' ? `<b>${escHtml(s.label)}</b>` : escHtml(s.label);
      return `<tr${bg}><td>${label}</td><td class="n">${s.growthPct.toFixed(0)}%</td><td class="n">${s.ebitdaMarginPct.toFixed(1)}%</td><td class="n">${s.waccPct.toFixed(1)}%</td><td class="n">×${s.multiple.toFixed(1)}</td><td class="n">${escHtml(fmtMoneyCompact(s.ev))}</td><td class="n" style="${eqStyle}">${escHtml(fmtMoneyCompact(s.equity))}</td></tr>`;
    })
    .join('');

  const rangeChart = buildScenarioRangeSvg(vm.bearEquity, vm.finalEquity, vm.bullEquity);
  const qualityGauge = buildQualityGaugeSvg(vm.qualityScore, vm.qualityGrade);
  const qualityRows = vm.qualityFactors
    .map(
      (f) => `<tr><td>${escHtml(f.label)}</td><td>${escHtml(f.finding)}</td><td class="n">${f.score}</td></tr>`,
    )
    .join('');

  const body = `
  ${sheetHead(vm, vm.reportId)}
  <div class="body">
    <span class="eyebrow">06 · תרחישים ואיכות</span>
    <h2>לא רק כמה — באיזה טווח.</h2>
    <p class="sub">שלושה תרחישים מלאים, כל אחד עם הנחות צמיחה, רווחיות ועלות הון משלו, לצד ציון איכות המכייל את המודל.</p>
    <table>
      <tr><th>תרחיש</th><th>צמיחה</th><th>שיעור EBITDA</th><th>WACC</th><th>מכפיל</th><th>EV</th><th>שווי לבעלים</th></tr>
      ${scenarioRows}
    </table>
    <div class="box">
      <h3>טווח השווי לבעלים</h3>
      ${rangeChart}
    </div>
    <div style="display:grid;grid-template-columns:54mm 1fr;gap:8mm;align-items:center;margin-top:2mm">
      <div class="box" style="text-align:center;margin-top:6mm">${qualityGauge}</div>
      <table style="margin-top:6mm">
        <tr><th>גורם איכות</th><th>ממצא</th><th>ציון</th></tr>
        ${qualityRows}
      </table>
    </div>
  </div>`;

  return wrapSheet(6, body);
}

function buildPage7Combined(vm: ValuationPdfViewModel, locale: ValuationLocale): string {
  const disclaimer = getLegalDisclaimer(locale, 'full');

  const body = `
  ${sheetHead(vm, vm.reportId)}
  <div class="body" style="text-align:center;display:flex;flex-direction:column;justify-content:center">
    <span class="eyebrow" style="justify-content:center">07 · שווי משולב</span>
    <h2>שלושה מודלים. מספר אחד.</h2>
    <div class="blend-bar">
      <div class="blend-seg" style="width:50%;background:#00A89F;color:#fff">DCF · 50%</div>
      <div class="blend-seg" style="width:30%;background:#4DD6CE;color:#0F2E29">EBITDA · 30%</div>
      <div class="blend-seg" style="width:20%;background:#C5EDE9;color:#0F2E29">REV · 20%</div>
    </div>
    <div class="c-val" style="margin:10mm 0 2mm">${equityCoverValHtml(vm.finalEquity)}</div>
    <div class="c-cap">שווי לבעלים · תרחיש בסיס · טווח <b class="num">${escHtml(fmtMoneyCompact(vm.bearEquity))} – ${escHtml(fmtMoneyCompact(vm.bullEquity))}</b> · נכון ל-${escHtml(vm.valuationDateShort)}</div>
    <div class="seal" style="margin:9mm auto 0"><i></i>CERTIFIED ALGORITHMIC VALUATION · SBC METHODOLOGY</div>
    <p class="note" style="text-align:right;margin-top:12mm"><b>גילוי נאות:</b> ${escHtml(disclaimer)}</p>
  </div>`;

  return wrapSheet(7, body);
}

export function buildValuationPdfTemplateHtml(
  data: ValuationReportData,
  options: BuildValuationPdfTemplateOptions,
): string {
  const locale = options.locale ?? 'he';
  if (!data.canonical) {
    throw new Error('ValuationReportData.canonical is required for PDF template');
  }

  const vm = buildValuationPdfViewModel(data, options.matrix, locale);
  const css = buildValuationPdfSheetCss();

  const pages = [
    buildPage1Cover(vm),
    buildPage2Exec(vm),
    buildPage3Financials(vm),
    buildPage4Dcf(vm),
    buildPage5Multiples(vm),
    buildPage6Scenarios(vm),
    buildPage7Combined(vm, locale),
  ].join('\n');

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <meta name="robots" content="noindex, nofollow"/>
  <title>equify — דוח הערכת שווי (PDF) — ${escHtml(data.companyName)}</title>
  <style>${css}</style>
</head>
<body>${pages}</body>
</html>`;
}

export const VALUATION_PDF_SHEET_COUNT = 7;
