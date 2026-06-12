import { escHtml, fmtMoneyCompact } from '../pdf/print/print_formatters';
import {
  buildCoverRingsSvg,
  buildDcfTimelineSvg,
  buildEbitdaSensitivityTable,
  buildFinancialBarChartSvg,
  buildModelBlendBarSvg,
  buildMultiplesTracksSvg,
  buildQualityArcGaugeSvg,
  buildQualityFactorBarsSvg,
  buildScenarioRibbonSvg,
  buildSensitivityMatrixTable,
  buildWaccDonutSvg,
  buildWaccStackedBarSvg,
  buildWaterfallSvg,
} from './charts';
import type { ScenarioRow, ValuationData } from './types';

const TOTAL_PAGES = 8;

function equityM(data: ValuationData): string {
  return (data.equity / 1_000_000).toFixed(1);
}

function letterhead(data: ValuationData, subtitle?: string): string {
  const rid = subtitle ?? `#${escHtml(data.reportId)} · ${escHtml(data.companyName)}`;
  return `<div class="lh">
    <div class="logo-txt">equify<em>.</em><small>BY SBC</small></div>
    <div class="rid">${rid}<br>STRICTLY CONFIDENTIAL</div>
  </div>
  <div class="rule-grad"></div>`;
}

function footer(page: number): string {
  return `<div class="foot">
    <span class="foot-l">EQUIFY VALUATION ENGINE © 2026 equify BY SBC · CONFIDENTIAL</span>
    <span class="foot-r foot-pg">עמוד <b>${page}</b> / ${TOTAL_PAGES}</span>
  </div>`;
}

function wrapPage(page: number, inner: string): string {
  return `<div class="page">${inner}${footer(page)}</div>`;
}

function metaLine(data: ValuationData): string {
  const parts = [
    data.corporateId ? `ח.פ. ${escHtml(data.corporateId)}` : '',
    `ענף: ${escHtml(data.sectorLabel)}`,
    `מטרה: ${escHtml(data.goalLabel)}`,
  ].filter(Boolean);
  return parts.join(' · ');
}

function defaultExecutiveSummary(data: ValuationData): string {
  const dcf = data.modelBlend.find((r) => /dcf/i.test(r.name));
  const ebitda = data.modelBlend.find((r) => /ebitda/i.test(r.name));
  const rev = data.modelBlend.find((r) => /הכנסות|revenue|rev/i.test(r.name));
  const parts = [
    dcf ? `DCF (${dcf.weightPct.toFixed(0)}%)` : null,
    ebitda ? `מכפיל EBITDA (${ebitda.weightPct.toFixed(0)}%)` : null,
    rev ? `מכפיל הכנסות (${rev.weightPct.toFixed(0)}%)` : null,
  ].filter(Boolean);
  return `שקלול ${parts.join(', ')} מניב שווי פעילות של ${fmtMoneyCompact(data.enterpriseValue)}. בניכוי חוב נטו ${fmtMoneyCompact(data.netDebt)} — שווי לבעלים ${fmtMoneyCompact(data.equity)}.`;
}

function blendPills(data: ValuationData): string {
  return data.modelBlend
    .map(
      (row) =>
        `<span class="pill pill-green">${escHtml(row.name)} ${row.weightPct.toFixed(0)}%</span>`,
    )
    .join('');
}

export function buildPage1Cover(data: ValuationData): string {
  const inner = `
  ${letterhead(data, `VALUATION REPORT · #${escHtml(data.reportId)}`)}
  <div class="body" style="display:flex;flex-direction:column;justify-content:center;padding-top:4mm">
    <div class="cover-hero">
      ${buildCoverRingsSvg()}
      <div class="cover-content">
        <div class="eyebrow" style="justify-content:center">הערכת שווי מוסדית · equify Engine · ${escHtml(data.valuationDate)}</div>
        <div class="cv-company" style="margin-top:3mm">${escHtml(data.companyName)}</div>
        <div class="cv-meta">${metaLine(data)}</div>
        <div class="cv-big">₪<span>${equityM(data)}</span>M</div>
        <div class="cv-range">שווי לבעלים (Equity Value) · תרחיש בסיס · טווח <b>${escHtml(fmtMoneyCompact(data.bearEquity))} – ${escHtml(fmtMoneyCompact(data.bullEquity))}</b></div>
        <div class="seal"><i></i>CERTIFIED ALGORITHMIC VALUATION · SBC METHODOLOGY · IFRS COMPLIANT</div>
      </div>
    </div>
    <div class="krow">
      <div class="kc"><b class="hl">${escHtml(fmtMoneyCompact(data.enterpriseValue))}</b><div class="kc-label">שווי פעילות (EV)</div><span>Weighted blend · ${data.modelBlend.length} models</span></div>
      <div class="kc"><b>${data.waccPct.toFixed(1)}%</b><div class="kc-label">WACC אפקטיבי</div><span>Damodaran CRP · CAPM</span></div>
      <div class="kc"><b>×${data.effectiveMult.toFixed(1)}</b><div class="kc-label">מכפיל EBITDA</div><span>Market-calibrated</span></div>
      <div class="kc"><b class="gd">${escHtml(data.qualityGrade)} · ${data.qualityScore}</b><div class="kc-label">Quality Score</div><span>Risk-adjusted · ${data.qualityFactors.length} factors</span></div>
    </div>
    <div style="display:flex;gap:6px;margin:3mm 0;flex-wrap:wrap">${blendPills(data)}</div>
    <div class="chart-title">מבנה הניתוח</div>
    <div class="flow">
      <div class="flow-step"><span class="fs-num">01</span><div class="fs-lbl">פרופיל &amp; נתונים</div><div class="fs-sub">Inputs · IFRS</div></div>
      <div class="flow-step"><span class="fs-num">02</span><div class="fs-lbl">WACC + DCF</div><div class="fs-sub">5Y + Terminal</div></div>
      <div class="flow-step"><span class="fs-num">03</span><div class="fs-lbl">Market Comps</div><div class="fs-sub">EBITDA · Revenue ×</div></div>
      <div class="flow-step"><span class="fs-num">04</span><div class="fs-lbl">Weighted Blend</div><div class="fs-sub">Bear / Base / Bull</div></div>
    </div>
    <div class="disclaimer">דוח זה הינו אינדיקציית שווי אלגוריתמית בלבד. אינו מהווה ייעוץ השקעות, חוות דעת חשבונאית או הערכת שווי לצרכים סטטוטוריים.</div>
  </div>`;
  return wrapPage(1, inner);
}

export function buildPage2Executive(data: ValuationData): string {
  const summary = data.executiveSummary ?? defaultExecutiveSummary(data);
  const blendRows = data.modelBlend
    .map(
      (row) => `<tr>
        <td>${escHtml(row.name)}</td>
        <td class="n">${escHtml(fmtMoneyCompact(row.ev))}</td>
        <td class="n">${row.weightPct.toFixed(0)}%</td>
        <td class="n">${escHtml(fmtMoneyCompact(row.contribution))}</td>
      </tr>`,
    )
    .join('');

  const inner = `
  ${letterhead(data)}
  <div class="body">
    <div class="section-divider"><span class="section-num">02</span><h2>תקציר מנהלים</h2><div class="sd-line"></div></div>
    <p class="sub">${escHtml(summary)}</p>
    <div class="cols2" style="margin-top:3mm">
      <div>
        <div class="chart-title">תרומת מודלים לשווי המשולב</div>
        <table>
          <tr><th>מודל</th><th>EV</th><th>משקל</th><th>תרומה</th></tr>
          ${blendRows}
          <tr class="sum"><td>שווי פעילות משולב (EV)</td><td class="n"></td><td class="n">100%</td><td class="n">${escHtml(fmtMoneyCompact(data.enterpriseValue))}</td></tr>
        </table>
        <div class="chart-title" style="margin-top:3mm">משקלות מודלים</div>
        ${buildModelBlendBarSvg(data.modelBlend)}
      </div>
      <div>
        <div class="chart-title">waterfall — מ-EV לשווי לבעלים (₪M)</div>
        ${buildWaterfallSvg(data.enterpriseValue, data.netDebt, data.equity)}
      </div>
    </div>
    <div class="chart-title" style="margin-top:3mm">טווח שווי לבעלים — שלושה תרחישים (₪M)</div>
    ${buildScenarioRibbonSvg(data.bearEquity, data.equity, data.bullEquity)}
    ${data.keyFindings ? `<div class="callout gold"><b>עיקרי הממצאים:</b> ${escHtml(data.keyFindings)}</div>` : ''}
  </div>`;
  return wrapPage(2, inner);
}

export function buildPage3Financials(data: ValuationData): string {
  const yearHeaders = data.trajectory.map((y) => `<th>${escHtml(y.label)}</th>`).join('');
  const revRow = data.trajectory.map((y) => `<td class="n">${y.revenueM.toFixed(1)}</td>`).join('');
  const ebtRow = data.trajectory.map((y) => `<td class="n">${y.ebitdaM.toFixed(2)}</td>`).join('');
  const marginRow = data.trajectory
    .map((y) => {
      const m = y.revenueM > 0 ? (y.ebitdaM / y.revenueM) * 100 : 0;
      return `<td class="n">${m.toFixed(1)}%</td>`;
    })
    .join('');
  const fcffRow = data.trajectory
    .map((y) => `<td class="n">${y.fcffM != null ? y.fcffM.toFixed(2) : '—'}</td>`)
    .join('');

  const inner = `
  ${letterhead(data)}
  <div class="body">
    <div class="section-divider"><span class="section-num">03</span><h2>נתונים פיננסיים</h2><div class="sd-line"></div></div>
    <p class="sub">הכנסות ו-EBITDA בפועל ותחזית. צמיחה שנתית ${data.growthPct.toFixed(0)}% · שיעור EBITDA ${data.marginPct.toFixed(1)}%.</p>
    <div class="chart-wrap">
      <div class="chart-title">הכנסות מול EBITDA · ₪M</div>
      ${buildFinancialBarChartSvg(data.trajectory)}
    </div>
    <table>
      <tr><th>₪M</th>${yearHeaders}</tr>
      <tr><td>הכנסות</td>${revRow}</tr>
      <tr><td>EBITDA</td>${ebtRow}</tr>
      <tr class="hl-row"><td>שיעור EBITDA</td>${marginRow}</tr>
      <tr><td>FCFF</td>${fcffRow}</tr>
    </table>
    ${data.netDebtNote ? `<div class="callout">${escHtml(data.netDebtNote)}</div>` : `<div class="callout">חוב נטו ליום ההערכה: <b>${escHtml(fmtMoneyCompact(data.netDebt))}</b></div>`}
  </div>`;
  return wrapPage(3, inner);
}

export function buildPage4Dcf(data: ValuationData): string {
  const waccRows = data.waccSegments
    .map(
      (seg) => `<tr>
        <td>${escHtml(seg.label)}</td>
        <td class="n">${escHtml(seg.symbol ?? '')}</td>
        <td class="n">${seg.pct.toFixed(1)}%</td>
        <td style="font-size:8px;color:var(--dim)">${escHtml(seg.source ?? '')}</td>
      </tr>`,
    )
    .join('');

  const yearCols = data.dcfRows.map((r) => `<th>${escHtml(r.label)}</th>`).join('');
  const fcffCells = data.dcfRows.map((r) => `<td class="n">${r.fcffM.toFixed(2)}</td>`).join('');
  const dfCells = data.dcfRows.map((r) => `<td class="n">${r.discountFactor.toFixed(3)}</td>`).join('');
  const pvCells = data.dcfRows.map((r) => `<td class="n">${r.pvM.toFixed(2)}</td>`).join('');
  const totalDcfM = data.dcfEv / 1_000_000;
  const g = data.terminalGrowthPct ?? 2.5;

  const inner = `
  ${letterhead(data)}
  <div class="body">
    <div class="section-divider"><span class="section-num">04</span><h2>DCF + WACC</h2><div class="sd-line"></div></div>
    <p class="sub">היוון תזרימי מזומנים חופשיים + ערך טרמינלי. WACC ${data.waccPct.toFixed(1)}% על בסיס CAPM + Damodaran CRP.</p>
    <div class="cols-6-4">
      <div>
        <div class="chart-title">הרכב WACC — ${data.waccPct.toFixed(1)}%</div>
        ${buildWaccStackedBarSvg(data.waccSegments, data.waccPct)}
        <table>
          <tr><th>רכיב WACC</th><th>סימון</th><th>ערך</th><th>מקור</th></tr>
          ${waccRows}
          <tr class="sum"><td>WACC אפקטיבי</td><td class="n"></td><td class="n">${data.waccPct.toFixed(1)}%</td><td></td></tr>
        </table>
        <div class="chart-title" style="margin-top:3mm">תזרימי מזומנים מהוונים — DCF</div>
        <table>
          <tr><th>₪M</th>${yearCols}<th>TV</th></tr>
          <tr><td>FCFF</td>${fcffCells}<td class="n">—</td></tr>
          <tr><td>פקטור היוון</td>${dfCells}<td class="n">—</td></tr>
          <tr><td>PV</td>${pvCells}<td class="n">${data.terminalPvM.toFixed(1)}*</td></tr>
          <tr class="sum"><td>שווי פעילות DCF</td><td class="n" colspan="${data.dcfRows.length}">${escHtml(fmtMoneyCompact(data.dcfEv))} &nbsp;→&nbsp; TV מהווה <b>${data.terminalSharePct.toFixed(0)}%</b></td><td></td></tr>
        </table>
        <div style="font-size:8px;color:var(--dim)">* TV · g=${g.toFixed(1)}%</div>
      </div>
      <div>
        <div class="chart-title">תרומת שנים ל-DCF</div>
        ${buildDcfTimelineSvg(data.dcfRows, data.terminalPvM, totalDcfM, data.terminalSharePct)}
        <div class="box tint" style="text-align:center;margin-top:3mm">${buildWaccDonutSvg(data.waccPct, data.waccSegments)}</div>
      </div>
    </div>
  </div>`;
  return wrapPage(4, inner);
}

export function buildPage5Multiples(data: ValuationData): string {
  const comps = data.compsTransactions ?? [];
  const compRows = comps
    .map((c) => {
      const cls = c.highlight === 'subject' ? ' class="sum"' : c.highlight === 'median' ? ' class="hl-row"' : '';
      return `<tr${cls}>
        <td>${c.index >= 0 ? c.index : '—'}</td>
        <td>${escHtml(c.sector)}</td>
        <td class="n">${c.year}</td>
        <td class="n">${c.evM.toFixed(1)}</td>
        <td class="n">${c.ebitdaMultiple.toFixed(1)}×</td>
        <td class="n">${c.revenueMultiple.toFixed(1)}×</td>
        <td class="n">${c.ebitdaMarginPct.toFixed(0)}%</td>
        <td style="font-size:8px;color:var(--dim)">${escHtml(c.note ?? '')}</td>
      </tr>`;
    })
    .join('');

  const inner = `
  ${letterhead(data)}
  <div class="body">
    <div class="section-divider"><span class="section-num">05</span><h2>מכפילי שוק</h2><div class="sd-line"></div></div>
    <p class="sub">השוואה לעסקאות M&A ישראליות בענף ${escHtml(data.sectorLabel)}. הנקודה מציגה את מיקום החברה ביחס לטווח השוק.</p>
    <div class="chart-wrap">
      <div class="chart-title">מיקום מול טווח שוק — EV/EBITDA · EV/Revenue · DCF</div>
      ${buildMultiplesTracksSvg(data.multiplesPositions)}
    </div>
    ${comps.length ? `
    <div class="chart-title" style="margin-top:2mm">עסקאות השוואה</div>
    <table>
      <tr><th>#</th><th>ענף</th><th>שנה</th><th>EV (₪M)</th><th>EV/EBITDA</th><th>EV/Rev</th><th>EBITDA%</th><th>הערה</th></tr>
      ${compRows}
    </table>` : ''}
    <table>
      <tr><th>פרמטר</th><th>החברה</th><th>חציון השוק</th><th>פרשנות</th></tr>
      <tr><td>מכפיל EBITDA</td><td class="n">×${data.effectiveMult.toFixed(1)}</td><td class="n">×${(data.industryEbitdaMedian ?? data.effectiveMult).toFixed(1)}</td><td>מיקום יחסי מול חציון ענף</td></tr>
      <tr><td>מכפיל הכנסות</td><td class="n">×${data.revenueMultiple.toFixed(1)}</td><td class="n">×${(data.industryRevenueMedian ?? data.revenueMultiple).toFixed(1)}</td><td>בתוך טווח השוק</td></tr>
      <tr><td>שיעור EBITDA</td><td class="n">${data.marginPct.toFixed(1)}%</td><td class="n">${(data.industryEbitdaMarginPct ?? data.marginPct).toFixed(1)}%</td><td>רווחיות ביחס לענף</td></tr>
    </table>
  </div>`;
  return wrapPage(5, inner);
}

export function buildPage6Quality(data: ValuationData): string {
  const inner = `
  ${letterhead(data)}
  <div class="body">
    <div class="section-divider"><span class="section-num">06</span><h2>Quality Score &amp; Risk Analysis</h2><div class="sd-line"></div></div>
    <p class="sub">ה-Quality Score (0–100) מכייל את המכפיל ואת פרמיית הסיכון הספציפית. ציון גבוה יותר → מכפיל גבוה יותר + WACC נמוך יותר.</p>
    <div class="cols-4-6">
      <div>
        <div class="chart-title">Quality Score — ${data.qualityScore} / 100 (${escHtml(data.qualityGrade)})</div>
        ${buildQualityArcGaugeSvg(data.qualityScore, data.qualityGrade)}
        <table style="margin-top:0">
          <tr><th>ציון</th><th>דירוג</th><th>המשמעות</th></tr>
          <tr style="opacity:.5"><td class="n">85–100</td><td><span class="pill pill-green">A</span></td><td style="font-size:8px">מינוף תפעולי גבוה</td></tr>
          <tr style="background:rgba(0,168,159,.06)"><td class="n"><b>${data.qualityScore}</b></td><td><span class="pill pill-gold">${escHtml(data.qualityGrade)}</span></td><td style="font-size:8px">דירוג נוכחי</td></tr>
          <tr style="opacity:.5"><td class="n">0–49</td><td><span class="pill pill-red">C</span></td><td style="font-size:8px">סיכון מוגבר</td></tr>
        </table>
      </div>
      <div>
        <div class="chart-title">פירוט Quality Factors</div>
        ${buildQualityFactorBarsSvg(data.qualityFactors, data.qualityScore, data.qualityGrade)}
        <table>
          <tr><th>גורם</th><th>ממצא</th><th>ציון</th></tr>
          ${data.qualityFactors
            .map(
              (f) => `<tr><td>${escHtml(f.label)}</td><td>${escHtml(f.finding)}</td><td class="n">${f.score}${f.maxScore ? `/${f.maxScore}` : ''}</td></tr>`,
            )
            .join('')}
        </table>
      </div>
    </div>
  </div>`;
  return wrapPage(6, inner);
}

function scenarioCard(s: ScenarioRow): string {
  const styles: Record<string, { border: string; bg: string; color: string; pill: string; icon: string }> = {
    bear: { border: '#C24A4A44', bg: 'rgba(194,74,74,.03)', color: '#C24A4A', pill: 'pill-red', icon: '🐻' },
    base: { border: '#00A89F55', bg: 'rgba(0,168,159,.04)', color: '#163530', pill: 'pill-green', icon: '◆' },
    bull: { border: '#A8842E55', bg: 'rgba(168,132,46,.03)', color: '#A8842E', pill: 'pill-gold', icon: '🚀' },
  };
  const st = styles[s.key];
  return `<div class="box" style="border-color:${st.border};background:${st.bg}">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2mm">
      <span style="font-size:14px">${st.icon}</span>
      <span class="pill ${st.pill}">${escHtml(s.label)}</span>
    </div>
    <div style="font-family:'IBM Plex Mono',monospace;font-size:22px;font-weight:700;color:${st.color};direction:ltr;text-align:right">${escHtml(fmtMoneyCompact(s.equity))}</div>
    <div style="font-size:8px;color:var(--dim);margin-top:1mm">שווי לבעלים</div>
    <hr style="border:none;border-top:1px solid #D6E8E4;margin:3mm 0">
    <div style="font-size:8.5px;display:grid;gap:2mm">
      <div style="display:flex;justify-content:space-between"><span style="color:var(--dim)">צמיחה</span><b class="mono">+${s.growthPct.toFixed(0)}%</b></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--dim)">WACC</span><b class="mono">${s.waccPct.toFixed(1)}%</b></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--dim)">מכפיל</span><b class="mono">×${s.multiple.toFixed(1)}</b></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--dim)">EV</span><b class="mono">${escHtml(fmtMoneyCompact(s.ev))}</b></div>
    </div>
    ${s.narrative ? `<div style="font-size:7.5px;color:var(--dim);margin-top:3mm;border-top:1px dashed #D6E8E4;padding-top:2mm">${escHtml(s.narrative)}</div>` : ''}
  </div>`;
}

export function buildPage7Scenarios(data: ValuationData): string {
  const cards = data.scenarios.map(scenarioCard).join('');
  const sensGrowth = data.sensitivityGrowthWacc
    ? buildSensitivityMatrixTable(data.sensitivityGrowthWacc)
    : '';
  const sensEbitda = data.sensitivityEbitdaMult
    ? buildEbitdaSensitivityTable(data.sensitivityEbitdaMult)
    : '';

  const inner = `
  ${letterhead(data)}
  <div class="body">
    <div class="section-divider"><span class="section-num">07</span><h2>תרחישים וניתוח רגישות</h2><div class="sd-line"></div></div>
    <div class="cols3" style="margin-bottom:4mm">${cards}</div>
    ${sensGrowth ? `
    <div class="section-divider" style="margin-top:3mm"><h3>ניתוח רגישות — שווי לבעלים (₪M)</h3><div class="sd-line"></div></div>
    <p class="sub" style="margin-bottom:2mm">ציר X: WACC · ציר Y: צמיחה שנתית. תא מרכזי = תרחיש בסיס.</p>
    ${sensGrowth}` : ''}
    ${sensEbitda ? `
    <div style="margin-top:3mm">
      <div class="chart-title">רגישות מכפיל — EV/EBITDA × שינוי EBITDA (EV ₪M)</div>
      ${sensEbitda}
    </div>` : ''}
  </div>`;
  return wrapPage(7, inner);
}

export function buildPage8Conclusion(data: ValuationData): string {
  const disclaimer =
    data.disclaimer ??
    'דוח זה הינו אינדיקציית שווי אלגוריתמית שהופקה על ידי מנוע equify BY SBC, על בסיס נתונים שהוזנו על ידי המשתמש ונתוני שוק פומביים. הדוח אינו מהווה ייעוץ השקעות, חוות דעת חשבונאית, הערכת שווי לצרכים סטטוטוריים, תחליף לבדיקת נאותות או ייעוץ משפטי. © 2026 equify BY SBC.';

  const blendBar = data.modelBlend
    .map((row, i) => {
      const colors = ['#00A89F', '#4DD6CE', '#C5EDE9'];
      const color = colors[i % colors.length];
      const textColor = i === 0 ? 'white' : '#163530';
      return `<div style="width:${row.weightPct}%;background:${color};display:grid;place-items:center;color:${textColor};font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:600">${escHtml(row.name.split(' ')[0])} · ${row.weightPct.toFixed(0)}%</div>`;
    })
    .join('');

  const inner = `
  ${letterhead(data)}
  <div class="body" style="display:flex;flex-direction:column;justify-content:space-between">
    <div>
      <div class="section-divider"><span class="section-num">08</span><h2>שווי משולב — Conclusion</h2><div class="sd-line"></div></div>
      <div style="display:flex;height:14mm;border-radius:8px;overflow:hidden;border:1px solid var(--line);margin:4mm 0">${blendBar}</div>
      <div style="text-align:center;margin:4mm 0">
        <div style="font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:60px;color:#163530;direction:ltr;line-height:1">₪${equityM(data)}M</div>
        <div style="font-size:10px;color:var(--dim);margin-top:1.5mm">שווי לבעלים · תרחיש בסיס · טווח ${escHtml(fmtMoneyCompact(data.bearEquity))} – ${escHtml(fmtMoneyCompact(data.bullEquity))} · נכון ל-${escHtml(data.valuationDateShort ?? data.valuationDate)}</div>
        <div class="seal" style="margin:4mm auto 0;display:inline-flex"><i></i>CERTIFIED ALGORITHMIC VALUATION · equify BY SBC</div>
      </div>
      <table style="margin-top:4mm">
        <tr><th>מדד</th><th>ערך</th><th>מדד</th><th>ערך</th></tr>
        <tr><td>שווי פעילות (EV)</td><td class="n">${escHtml(fmtMoneyCompact(data.enterpriseValue))}</td><td>WACC אפקטיבי</td><td class="n">${data.waccPct.toFixed(1)}%</td></tr>
        <tr><td>חוב נטו</td><td class="n">${escHtml(fmtMoneyCompact(data.netDebt))}</td><td>מכפיל EBITDA</td><td class="n">×${data.effectiveMult.toFixed(1)}</td></tr>
        <tr><td>EBITDA שנתי (Base)</td><td class="n">${escHtml(fmtMoneyCompact(data.ebitda))}</td><td>Quality Score</td><td class="n">${escHtml(data.qualityGrade)} · ${data.qualityScore}</td></tr>
        <tr><td>TV כ-% מ-DCF</td><td class="n">${data.terminalSharePct.toFixed(0)}%</td><td>שנות תחזית</td><td class="n">5Y + Terminal</td></tr>
        <tr class="sum"><td>שווי לבעלים · Base</td><td class="n">${escHtml(fmtMoneyCompact(data.equity))}</td><td>טווח כולל</td><td class="n">${escHtml(fmtMoneyCompact(data.bearEquity))} – ${escHtml(fmtMoneyCompact(data.bullEquity))}</td></tr>
      </table>
    </div>
    <div class="disclaimer"><b>גילוי נאות מלא:</b> ${escHtml(disclaimer)}</div>
  </div>`;
  return wrapPage(8, inner);
}

export function buildAllPages(data: ValuationData): string {
  return [
    buildPage1Cover(data),
    buildPage2Executive(data),
    buildPage3Financials(data),
    buildPage4Dcf(data),
    buildPage5Multiples(data),
    buildPage6Quality(data),
    buildPage7Scenarios(data),
    buildPage8Conclusion(data),
  ].join('\n');
}

export const PDF_PAGE_COUNT = TOTAL_PAGES;
