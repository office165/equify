import {
  escHtml,
  fmtMoneyCompact,
  fmtMultiple,
  fmtPercent,
  reportDateHe,
} from '../pdf/print/print_formatters';
import {
  buildEquifyCoverRingsSvg,
  buildEquifyFinancialBarChartSvg,
  buildEquifyMultiplesTracksSvg,
  buildEquifyQualityGaugeSvg,
  buildEquifyScenarioRangeSvg,
  buildEquifyWaccDonutSvg,
  computeWaterfallFills,
} from './equify-pdf-charts';
import type { ValuationData } from './types';

const TOTAL_PAGES = 7;

function equityCoverVal(equity: number): string {
  return `₪${(equity / 1_000_000).toFixed(1)}<em>M</em>`;
}

function equityM(val: number): number {
  return val / 1_000_000;
}

function head(rid: string): string {
  return `<div class="head"><span class="logo">equify<em>.</em><small>BY SBC</small></span><span class="rid">${rid}</span></div>`;
}

function foot(page: number): string {
  return `<div class="foot"><span>EQUIFY VALUATION ENGINE © 2026 SBC</span><span class="pg">עמוד <b>${page}</b> / ${TOTAL_PAGES}</span></div>`;
}

function wrapSheet(page: number, className: string, body: string): string {
  return `<div class="sheet${className ? ` ${className}` : ''}">${body}${foot(page)}</div>`;
}

function metaLine(data: ValuationData): string {
  const parts = [
    data.corporateId ? `ח.פ. ${escHtml(data.corporateId)}` : '',
    `ענף: ${escHtml(data.sectorLabel)}`,
    `מטרת ההערכה: ${escHtml(data.goalLabel)}`,
  ].filter(Boolean);
  return parts.join(' · ');
}

function identityLine(data: ValuationData): string {
  const parts = [
    escHtml(data.fullName),
    escHtml(data.phone),
    escHtml(data.email),
  ].filter((p) => p && p !== '');
  return parts.join(' · ');
}

function defaultExecutiveSummary(data: ValuationData): string {
  const parts = data.modelBlend.map(
    (r) => `${escHtml(r.name)} (${r.weightPct.toFixed(0)}%)`,
  );
  return `שקלול של ${parts.join(', ')} מניב שווי פעילות של ${fmtMoneyCompact(data.enterpriseValue)}. בניכוי חוב נטו של ${fmtMoneyCompact(data.netDebt)}, השווי לבעלים בתרחיש הבסיס עומד על ${fmtMoneyCompact(data.equity)}.`;
}

function defaultDisclaimer(): string {
  return 'דוח זה הינו אינדיקציית שווי אלגוריתמית שהופקה על ידי מנוע equify, על בסיס נתונים שהוזנו על ידי המשתמש ונתוני שוק פומביים. הדוח אינו מהווה ייעוץ השקעות, חוות דעת חשבונאית, הערכת שווי לצרכים סטטוטוריים או תחליף לבדיקת נאותות. SBC ו-equify אינן נושאות באחריות להחלטות שיתקבלו על בסיס דוח זה. © 2026 equify BY SBC. כל הזכויות שמורות.';
}

function buildPage1Cover(data: ValuationData): string {
  const dateLabel = reportDateHe(data.valuationDate);
  const body = `
  ${head(`VALUATION REPORT · #${escHtml(data.reportId)}`)}
  <div class="rule"></div>
  <div class="body">
    ${buildEquifyCoverRingsSvg()}
    <div class="cwrap">
      <span class="eyebrow" style="justify-content:center">דוח הערכת שווי · ${escHtml(dateLabel)}</span>
      <div class="c-comp">${escHtml(data.companyName)}</div>
      <div class="c-meta">${metaLine(data)}</div>
      <div class="c-id">${identityLine(data)}</div>
      <div class="c-val">${equityCoverVal(data.equity)}</div>
      <div class="c-cap">שווי לבעלים (Equity Value) · תרחיש בסיס · טווח <b class="num">${fmtMoneyCompact(data.bearEquity)} – ${fmtMoneyCompact(data.bullEquity)}</b></div>
      <div class="seal"><i></i>CERTIFIED ALGORITHMIC VALUATION · SBC METHODOLOGY</div>
      <div class="c-grid">
        <div><b>${fmtMoneyCompact(data.enterpriseValue)}</b><span>שווי פעילות (EV)</span></div>
        <div><b>${data.waccPct.toFixed(1)}%</b><span>WACC אפקטיבי</span></div>
        <div><b>${Math.round(data.qualityScore)} / ${escHtml(data.qualityGrade)}</b><span>Quality Score</span></div>
      </div>
    </div>
  </div>`;
  return wrapSheet(1, 'cover', body);
}

function buildPage2ExecSummary(data: ValuationData): string {
  const wf = computeWaterfallFills(data);
  const summary = escHtml(data.executiveSummary ?? defaultExecutiveSummary(data));
  const blendRows = data.modelBlend
    .map(
      (r) =>
        `<tr><td>${escHtml(r.name)}</td><td class="n">${fmtMoneyCompact(r.ev)}</td><td class="n">${r.weightPct.toFixed(0)}%</td><td class="n">${fmtMoneyCompact(r.contribution)}</td></tr>`,
    )
    .join('');
  const noteDate = data.valuationDateShort ?? reportDateHe(data.valuationDate);

  const body = `
  ${head(`#${escHtml(data.reportId)} · ${escHtml(data.companyName)}`)}
  <div class="rule"></div>
  <div class="body">
    <span class="eyebrow">02 · תקציר מנהלים</span>
    <h2>השורה התחתונה — קודם.</h2>
    <p class="sub">${summary}</p>
    <div class="kgrid">
      <div class="kcard"><div class="kv hl">${fmtMoneyCompact(data.equity)}</div><div class="kl">שווי לבעלים · בסיס</div></div>
      <div class="kcard"><div class="kv">${fmtMoneyCompact(data.enterpriseValue)}</div><div class="kl">שווי פעילות (EV)</div></div>
      <div class="kcard"><div class="kv">${data.waccPct.toFixed(1)}%</div><div class="kl">WACC אפקטיבי</div></div>
      <div class="kcard"><div class="kv gd">${escHtml(data.qualityGrade)} · ${Math.round(data.qualityScore)}</div><div class="kl">Quality Score</div></div>
    </div>
    <div class="box">
      <h3>מ-EV לשווי לבעלים</h3>
      <div class="wf-row"><span class="lbl">שווי פעילות</span><div class="wf-track"><div class="wf-fill" style="inset-inline-start:0;width:100%;background:linear-gradient(90deg,#4DD6CE,#00A89F)"></div></div><b>${fmtMoneyCompact(data.enterpriseValue)}</b></div>
      <div class="wf-row"><span class="lbl">חוב נטו</span><div class="wf-track"><div class="wf-fill" style="inset-inline-end:0;width:${wf.debtPct.toFixed(1)}%;background:linear-gradient(90deg,#F0ADAD,#C24A4A)"></div></div><b style="color:#C24A4A">−${fmtMoneyCompact(data.netDebt)}</b></div>
      <div class="wf-row"><span class="lbl"><b style="color:var(--pine);font-family:'Assistant'">שווי לבעלים</b></span><div class="wf-track"><div class="wf-fill" style="inset-inline-start:0;width:${wf.equityPct.toFixed(1)}%;background:linear-gradient(90deg,#00A89F,#163530)"></div></div><b style="color:var(--turq)">${fmtMoneyCompact(data.equity)}</b></div>
    </div>
    <table>
      <tr><th>מודל</th><th>שווי פעילות</th><th>משקל</th><th>תרומה</th></tr>
      ${blendRows}
      <tr class="sum"><td>שווי פעילות משולב</td><td class="n"></td><td class="n">100%</td><td class="n">${fmtMoneyCompact(data.enterpriseValue)}</td></tr>
    </table>
    <p class="note">הערכה זו בוצעה ב-${escHtml(noteDate)} על בסיס נתונים שהוזנו על ידי המשתמש ותחזיות הנהלה.</p>
  </div>`;
  return wrapSheet(2, '', body);
}

function buildPage3Financials(data: ValuationData): string {
  const cols = data.trajectory.map((t) => `<th>${escHtml(t.label)}</th>`).join('');
  const revRow = data.trajectory.map((t) => `<td class="n">${t.revenueM.toFixed(1)}</td>`).join('');
  const ebtRow = data.trajectory.map((t) => `<td class="n">${t.ebitdaM.toFixed(2)}</td>`).join('');
  const marginRow = data.trajectory
    .map((t) => {
      const m = t.revenueM > 0 ? (t.ebitdaM / t.revenueM) * 100 : 0;
      return `<td class="n">${m.toFixed(1)}%</td>`;
    })
    .join('');

  const body = `
  ${head(`#${escHtml(data.reportId)} · ${escHtml(data.companyName)}`)}
  <div class="rule"></div>
  <div class="body">
    <span class="eyebrow">03 · נתונים פיננסיים</span>
    <h2>המספרים שמאחורי המודל.</h2>
    <p class="sub">הכנסות ו-EBITDA בפועל ותחזית. צמיחה שנתית ממוצעת של ${data.growthPct.toFixed(0)}%.</p>
    <div class="box"><h3>הכנסות מול EBITDA · ₪M</h3>${buildEquifyFinancialBarChartSvg(data.trajectory)}</div>
    <table><tr><th>₪M</th>${cols}</tr><tr><td>הכנסות</td>${revRow}</tr><tr><td>EBITDA</td>${ebtRow}</tr><tr class="sum"><td>שיעור EBITDA</td>${marginRow}</tr></table>
    <p class="note">${escHtml(data.netDebtNote ?? `חוב נטו: ${fmtMoneyCompact(data.netDebt)}.`)}</p>
  </div>`;
  return wrapSheet(3, '', body);
}

function buildPage4Dcf(data: ValuationData): string {
  const waccRows = data.waccSegments
    .map(
      (s) =>
        `<tr><td><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${s.color};margin-inline-end:6px"></span>${escHtml(s.label)}</td><td class="n">${s.pct.toFixed(1)}%</td></tr>`,
    )
    .join('');
  const dcfCols = data.dcfRows.map((r) => `<th>${escHtml(r.label)}</th>`).join('');
  const fcffRow = data.dcfRows.map((r) => `<td class="n">${r.fcffM.toFixed(2)}</td>`).join('');
  const dfRow = data.dcfRows.map((r) => `<td class="n">${r.discountFactor.toFixed(3)}</td>`).join('');
  const pvRow = data.dcfRows.map((r) => `<td class="n">${r.pvM.toFixed(2)}</td>`).join('');
  const tg = data.terminalGrowthPct ?? 2.5;

  const body = `
  ${head(`#${escHtml(data.reportId)} · ${escHtml(data.companyName)}`)}
  <div class="rule"></div>
  <div class="body">
    <span class="eyebrow">04 · היוון תזרימי מזומנים</span>
    <h2>מבט קדימה: DCF.</h2>
    <p class="sub">FCFF מהוונים ב-WACC ${data.waccPct.toFixed(1)}%. צמיחה פרמננטית ${tg}%.</p>
    <div style="display:grid;grid-template-columns:64mm 1fr;gap:8mm;margin-top:6mm;align-items:start">
      <div class="box" style="margin-top:0;text-align:center"><h3 style="text-align:right">הרכב WACC</h3>${buildEquifyWaccDonutSvg(data.waccSegments, data.waccPct)}</div>
      <div><table style="margin-top:0"><tr><th>רכיב</th><th>שיעור</th></tr>${waccRows}<tr class="sum"><td>WACC אפקטיבי</td><td class="n">${data.waccPct.toFixed(1)}%</td></tr></table></div>
    </div>
    <table>
      <tr><th>₪M</th>${dcfCols}<th>טרמינלי</th></tr>
      <tr><td>FCFF חזוי</td>${fcffRow}<td class="n">${data.dcfRows.at(-1)?.fcffM.toFixed(2) ?? '—'}</td></tr>
      <tr><td>פקטור היוון</td>${dfRow}<td class="n">—</td></tr>
      <tr><td>שווי נוכחי</td>${pvRow}<td class="n">${data.terminalPvM.toFixed(1)}*</td></tr>
      <tr class="sum"><td>שווי פעילות לפי DCF</td><td class="n" colspan="${data.dcfRows.length + 1}"></td><td class="n">${fmtMoneyCompact(data.dcfEv)}</td></tr>
    </table>
    <p class="note">* ערך טרמינלי מהווה ${data.terminalSharePct.toFixed(0)}% מסך השווי.</p>
  </div>`;
  return wrapSheet(4, '', body);
}

function multiplesInterpretation(data: ValuationData): string {
  const ebitdaMed = data.industryEbitdaMedian ?? data.effectiveMult;
  const revMed = data.industryRevenueMedian ?? data.revenueMultiple;
  const marginMed = data.industryEbitdaMarginPct ?? data.marginPct;
  return `<tr><td>מכפיל EBITDA</td><td class="n">${fmtMultiple(data.effectiveMult)}</td><td class="n">${fmtMultiple(ebitdaMed)}</td><td>מכויל מול ענף</td></tr>
    <tr><td>מכפיל הכנסות</td><td class="n">${fmtMultiple(data.revenueMultiple)}</td><td class="n">${fmtMultiple(revMed)}</td><td>בטווח השוק</td></tr>
    <tr><td>שיעור EBITDA</td><td class="n">${fmtPercent(data.marginPct) ?? '—'}</td><td class="n">${fmtPercent(marginMed) ?? '—'}</td><td>רווחיות יחסית לענף</td></tr>`;
}

function buildPage5Multiples(data: ValuationData): string {
  const body = `
  ${head(`#${escHtml(data.reportId)} · ${escHtml(data.companyName)}`)}
  <div class="rule"></div>
  <div class="body">
    <span class="eyebrow">05 · מכפילי שוק</span>
    <h2>מבט הצידה: השוק.</h2>
    <p class="sub">מכפילים מכוילים מול עסקאות M&A רלוונטיות בענף.</p>
    <div class="box"><h3>מיקום מול טווח השוק</h3>${buildEquifyMultiplesTracksSvg(data.multiplesPositions)}</div>
    <table><tr><th>פרמטר</th><th>החברה</th><th>חציון השוק</th><th>פרשנות</th></tr>${multiplesInterpretation(data)}</table>
  </div>`;
  return wrapSheet(5, '', body);
}

function scenarioEquityStyle(key: string): string {
  if (key === 'bear') return ' style="color:#C24A4A;font-weight:600"';
  if (key === 'base') return ' style="color:#00A89F;font-weight:700"';
  if (key === 'bull') return ' style="color:#A8842E;font-weight:600"';
  return '';
}

function buildPage6Scenarios(data: ValuationData): string {
  const scenarioRows = data.scenarios
    .map((s) => {
      const label =
        s.key === 'bear' ? '🐻 Bear' : s.key === 'bull' ? '🚀 Bull' : '◆ Base';
      const nameCell = s.key === 'base' ? `<td><b>${label}</b></td>` : `<td>${label}</td>`;
      const rowStyle = s.key === 'base' ? ' style="background:var(--tint)"' : '';
      return `<tr${rowStyle}>${nameCell}<td class="n">${s.growthPct.toFixed(0)}%</td><td class="n">${s.ebitdaMarginPct.toFixed(1)}%</td><td class="n">${s.waccPct.toFixed(1)}%</td><td class="n">×${s.multiple.toFixed(1)}</td><td class="n">${fmtMoneyCompact(s.ev)}</td><td class="n"${scenarioEquityStyle(s.key)}>${fmtMoneyCompact(s.equity)}</td></tr>`;
    })
    .join('');
  const factorRows = data.qualityFactors
    .map(
      (f) =>
        `<tr><td>${escHtml(f.label)}</td><td>${escHtml(f.finding)}</td><td class="n">${Math.round(f.score)}</td></tr>`,
    )
    .join('');

  const body = `
  ${head(`#${escHtml(data.reportId)} · ${escHtml(data.companyName)}`)}
  <div class="rule"></div>
  <div class="body">
    <span class="eyebrow">06 · תרחישים ואיכות</span>
    <h2>לא רק כמה — באיזה טווח.</h2>
    <table><tr><th>תרחיש</th><th>צמיחה</th><th>שיעור EBITDA</th><th>WACC</th><th>מכפיל</th><th>EV</th><th>שווי לבעלים</th></tr>${scenarioRows}</table>
    <div class="box"><h3>טווח השווי לבעלים</h3>${buildEquifyScenarioRangeSvg(equityM(data.bearEquity), equityM(data.equity), equityM(data.bullEquity))}</div>
    <div style="display:grid;grid-template-columns:54mm 1fr;gap:8mm;align-items:center;margin-top:2mm">
      <div class="box" style="text-align:center;margin-top:6mm">${buildEquifyQualityGaugeSvg(data.qualityScore, data.qualityGrade)}</div>
      <table style="margin-top:6mm"><tr><th>גורם איכות</th><th>ממצא</th><th>ציון</th></tr>${factorRows}</table>
    </div>
  </div>`;
  return wrapSheet(6, '', body);
}

function blendWeightBar(data: ValuationData): string {
  const colors = ['#00A89F', '#4DD6CE', '#C5EDE9'];
  return data.modelBlend
    .map((r, i) => {
      const bg = colors[i % colors.length]!;
      const fg = i === 0 ? '#fff' : '#0F2E29';
      const short = /dcf/i.test(r.name) ? 'DCF' : /ebitda/i.test(r.name) ? 'EBITDA' : 'REV';
      return `<div style="width:${r.weightPct.toFixed(0)}%;background:${bg};display:grid;place-items:center;color:${fg};font-family:'IBM Plex Mono';font-size:9px;font-weight:600">${short} · ${r.weightPct.toFixed(0)}%</div>`;
    })
    .join('');
}

function buildPage7Combined(data: ValuationData): string {
  const dateLabel = data.valuationDateShort ?? reportDateHe(data.valuationDate);
  const body = `
  ${head(`#${escHtml(data.reportId)} · ${escHtml(data.companyName)}`)}
  <div class="rule"></div>
  <div class="body" style="text-align:center;display:flex;flex-direction:column;justify-content:center">
    <span class="eyebrow" style="justify-content:center">07 · שווי משולב</span>
    <h2>שלושה מודלים. מספר אחד.</h2>
    <div style="display:flex;height:13mm;border-radius:8px;overflow:hidden;border:1px solid var(--line);margin:8mm auto 0;max-width:150mm;width:100%">${blendWeightBar(data)}</div>
    <div class="c-val" style="margin:10mm 0 2mm">${equityCoverVal(data.equity)}</div>
    <div class="c-cap">שווי לבעלים · תרחיש בסיס · טווח <b class="num">${fmtMoneyCompact(data.bearEquity)} – ${fmtMoneyCompact(data.bullEquity)}</b> · נכון ל-${escHtml(dateLabel)}</div>
    <div class="seal" style="margin:9mm auto 0"><i></i>CERTIFIED ALGORITHMIC VALUATION · SBC METHODOLOGY</div>
    <p class="note" style="text-align:right;margin-top:12mm"><b>גילוי נאות:</b> ${escHtml(data.disclaimer ?? defaultDisclaimer())}</p>
  </div>`;
  return wrapSheet(7, '', body);
}

export function buildEquifyPdfPages(data: ValuationData): string {
  return [
    buildPage1Cover(data),
    buildPage2ExecSummary(data),
    buildPage3Financials(data),
    buildPage4Dcf(data),
    buildPage5Multiples(data),
    buildPage6Scenarios(data),
    buildPage7Combined(data),
  ].join('\n');
}

export const EQUIFY_PDF_PAGE_COUNT = TOTAL_PAGES;
