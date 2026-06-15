import {
  escHtml,
  equityCoverValHtml,
  fmtMoneyCompactHtml,
  fmtMoneyCompactSignedHtml,
  fmtMultipleHtml,
  fmtPercentHtml,
  multHtml,
  numHtml,
  pctHtml,
  reportDateHe,
} from '../pdf/print/print_formatters';
import {
  buildEbitdaSensitivityTable,
  buildSensitivityMatrixTable,
} from './charts';
import {
  buildEquifyCoverRingsSvg,
  buildEquifyFinancialBarChartSvg,
  buildEquifyMultiplesTracksSvg,
  buildEquifyQualityGaugeSvg,
  buildEquifyScenarioRangeSvg,
  buildEquifyWaccDonutSvg,
  computeWaterfallFills,
} from './equify-pdf-charts';
import { FINANCIAL_DATA_COPY, multiplesMethodologyCopy, qualityScoreIntroCopy, qualityScoreIntroCopyEn, scenariosIntroFromRows, sensitivityIntroCopy, sensitivityIntroCopyEn, WACC_DCF_METHODOLOGY_COPY } from '../i18n/equify_report_copy';
import type { ValuationData } from './types';

const TOTAL_PAGES = 8;

function pdfFmt(locale?: ValuationData['locale']) {
  return {
    money: (v: number | null | undefined) => fmtMoneyCompactHtml(v, locale),
    moneySigned: (v: number) => fmtMoneyCompactSignedHtml(v, locale),
    equityCover: (v: number) => equityCoverValHtml(v, locale),
    pct: (v: number, decimals = 1) => pctHtml(v, decimals),
    mult: (v: number, decimals = 1) => multHtml(v, decimals),
    multiple: (v: number | null | undefined) => fmtMultipleHtml(v),
    pctLabel: (
      v: number | null | undefined,
      opts?: { decimals?: number; isRatio?: boolean },
    ) => fmtPercentHtml(v, opts),
    fixed: (v: number, decimals: number) => numHtml(v.toFixed(decimals)),
    int: (v: number) => numHtml(Math.round(v)),
    raw: (s: string | number) => numHtml(s),
  };
}

function equityM(val: number): number {
  return val / 1_000_000;
}

function head(rid: string): string {
  return `<div class="head"><span class="logo">equify<em>.</em><small>BY SBC</small></span><span class="rid">${rid}</span></div>`;
}

function foot(page: number, locale?: ValuationData['locale']): string {
  const f = pdfFmt(locale);
  const pageLabel =
    locale === 'en'
      ? `Page ${f.int(page)} / ${f.int(TOTAL_PAGES)}`
      : `עמוד ${f.int(page)} / ${f.int(TOTAL_PAGES)}`;
  return `<div class="foot"><span>EQUIFY VALUATION ENGINE © 2026 SBC</span><span class="pg">${pageLabel}</span></div>`;
}

function wrapSheet(
  page: number,
  className: string,
  body: string,
  locale?: ValuationData['locale'],
): string {
  return `<div class="sheet${className ? ` ${className}` : ''}">${body}${foot(page, locale)}</div>`;
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
  const f = pdfFmt(data.locale);
  const parts = data.modelBlend.map(
    (r) => `${escHtml(r.name)} (${f.pct(r.weightPct, 0)})`,
  );
  return `שקלול של ${parts.join(', ')} מניב שווי פעילות של ${f.money(data.enterpriseValue)}. בניכוי חוב נטו של ${f.money(data.netDebt)}, השווי לבעלים בתרחיש הבסיס עומד על ${f.money(data.equity)}.`;
}

function defaultDisclaimer(): string {
  return 'דוח זה הינו אינדיקציית שווי אלגוריתמית שהופקה על ידי מנוע equify, על בסיס נתונים שהוזנו על ידי המשתמש ונתוני שוק פומביים. הדוח אינו מהווה ייעוץ השקעות, חוות דעת חשבונאית, הערכת שווי לצרכים סטטוטוריים או תחליף לבדיקת נאותות. SBC ו-equify אינן נושאות באחריות להחלטות שיתקבלו על בסיס דוח זה. © 2026 equify BY SBC. כל הזכויות שמורות.';
}

function buildPage1Cover(data: ValuationData): string {
  const f = pdfFmt(data.locale);
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
      <div class="c-val">${f.equityCover(data.equity)}</div>
      <div class="c-cap">שווי לבעלים (Equity Value) · תרחיש בסיס · טווח ${f.money(data.bearEquity)} – ${f.money(data.bullEquity)}</div>
      <div class="seal"><i></i>CERTIFIED ALGORITHMIC VALUATION · SBC METHODOLOGY</div>
      <div class="c-grid">
        <div><b>${f.money(data.enterpriseValue)}</b><span>שווי פעילות (EV)</span></div>
        <div><b>${f.pct(data.waccPct)}</b><span>WACC אפקטיבי</span></div>
        <div><b>${f.int(data.qualityScore)} / ${escHtml(data.qualityGrade)}</b><span>Quality Score</span></div>
      </div>
    </div>
  </div>`;
  return wrapSheet(1, 'cover', body, data.locale);
}

function buildPage2ExecSummary(data: ValuationData): string {
  const f = pdfFmt(data.locale);
  const wf = computeWaterfallFills(data);
  const summary = escHtml(data.executiveSummary ?? defaultExecutiveSummary(data));
  const blendRows = data.modelBlend
    .map(
      (r) =>
        `<tr><td>${escHtml(r.name)}</td><td class="n">${f.money(r.ev)}</td><td class="n">${f.pct(r.weightPct, 0)}</td><td class="n">${f.money(r.contribution)}</td></tr>`,
    )
    .join('');
  const noteDate = data.valuationDateShort ?? reportDateHe(data.valuationDate);

  const body = `
  ${head(`#${escHtml(data.reportId)} · ${escHtml(data.companyName)}`)}
  <div class="rule"></div>
  <div class="body">
    <span class="eyebrow">02 · תקציר מנהלים</span>
    <h2>תקציר מנהלים</h2>
    <p class="sub">${summary}</p>
    <div class="kgrid">
      <div class="kcard"><div class="kv hl">${f.money(data.equity)}</div><div class="kl">שווי לבעלים · בסיס</div></div>
      <div class="kcard"><div class="kv">${f.money(data.enterpriseValue)}</div><div class="kl">שווי פעילות (EV)</div></div>
      <div class="kcard"><div class="kv">${f.pct(data.waccPct)}</div><div class="kl">WACC אפקטיבי</div></div>
      <div class="kcard"><div class="kv gd">${escHtml(data.qualityGrade)} · ${f.int(data.qualityScore)}</div><div class="kl">Quality Score</div></div>
    </div>
    <div class="box">
      <h3>מ-EV לשווי לבעלים</h3>
      <div class="wf-row"><span class="lbl">שווי פעילות</span><div class="wf-track"><div class="wf-fill" style="inset-inline-start:0;width:100%;background:linear-gradient(90deg,#4DD6CE,#00A89F)"></div></div><b>${f.money(data.enterpriseValue)}</b></div>
      <div class="wf-row"><span class="lbl">חוב נטו</span><div class="wf-track"><div class="wf-fill" style="inset-inline-end:0;width:${wf.debtPct.toFixed(1)}%;background:linear-gradient(90deg,#F0ADAD,#C24A4A)"></div></div><b style="color:#C24A4A">−${f.money(data.netDebt)}</b></div>
      <div class="wf-row"><span class="lbl"><b style="color:var(--pine);font-family:'Assistant'">שווי לבעלים</b></span><div class="wf-track"><div class="wf-fill" style="inset-inline-start:0;width:${wf.equityPct.toFixed(1)}%;background:linear-gradient(90deg,#00A89F,#163530)"></div></div><b style="color:var(--turq)">${f.money(data.equity)}</b></div>
    </div>
    <table>
      <tr><th>מודל</th><th>שווי פעילות</th><th>משקל</th><th>תרומה</th></tr>
      ${blendRows}
      <tr class="sum"><td>שווי פעילות משולב</td><td class="n"></td><td class="n">${f.pct(100, 0)}</td><td class="n">${f.money(data.enterpriseValue)}</td></tr>
    </table>
    <p class="note">הערכה זו בוצעה ב-${escHtml(noteDate)} על בסיס נתונים שהוזנו על ידי המשתמש ותחזיות הנהלה.</p>
  </div>`;
  return wrapSheet(2, '', body, data.locale);
}

function buildPage3Financials(data: ValuationData): string {
  const f = pdfFmt(data.locale);
  const cols = data.trajectory.map((t) => `<th>${escHtml(t.label)}</th>`).join('');
  const revRow = data.trajectory.map((t) => `<td class="n">${f.fixed(t.revenueM, 1)}</td>`).join('');
  const ebtRow = data.trajectory.map((t) => `<td class="n">${f.fixed(t.ebitdaM, 2)}</td>`).join('');
  const marginRow = data.trajectory
    .map((t) => {
      const m = t.revenueM > 0 ? (t.ebitdaM / t.revenueM) * 100 : 0;
      return `<td class="n">${f.pct(m)}</td>`;
    })
    .join('');
  const unitLabel = data.locale === 'en' ? 'M ₪' : '₪M';

  const body = `
  ${head(`#${escHtml(data.reportId)} · ${escHtml(data.companyName)}`)}
  <div class="rule"></div>
  <div class="body">
    <span class="eyebrow">03 · נתונים פיננסיים</span>
    <h2>נתונים פיננסיים</h2>
    <p class="sub">${escHtml(FINANCIAL_DATA_COPY)}</p>
    <div class="box"><h3>הכנסות מול EBITDA · ${unitLabel}</h3>${buildEquifyFinancialBarChartSvg(data.trajectory)}</div>
    <table><tr><th>${unitLabel}</th>${cols}</tr><tr><td>הכנסות</td>${revRow}</tr><tr><td>EBITDA</td>${ebtRow}</tr><tr class="sum"><td>שיעור EBITDA</td>${marginRow}</tr></table>
    <p class="note">CAGR ${f.pct(data.growthPct, 0)} · שיעור EBITDA ${f.pct(data.marginPct)}. ${data.netDebtNote ? escHtml(data.netDebtNote) : `חוב נטו: ${f.money(data.netDebt)}.`}</p>
  </div>`;
  return wrapSheet(3, '', body, data.locale);
}

function buildPage4Dcf(data: ValuationData): string {
  const f = pdfFmt(data.locale);
  const waccRows = data.waccSegments
    .map(
      (s) =>
        `<tr><td><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${s.color};margin-inline-end:6px"></span>${escHtml(s.label)}</td><td class="n">${f.pct(s.pct)}</td></tr>`,
    )
    .join('');
  const dcfCols = data.dcfRows.map((r) => `<th>${escHtml(r.label)}</th>`).join('');
  const fcffRow = data.dcfRows.map((r) => `<td class="n">${f.fixed(r.fcffM, 2)}</td>`).join('');
  const dfRow = data.dcfRows.map((r) => `<td class="n">${f.fixed(r.discountFactor, 3)}</td>`).join('');
  const pvRow = data.dcfRows.map((r) => `<td class="n">${f.fixed(r.pvM, 2)}</td>`).join('');
  const unitLabel = data.locale === 'en' ? 'M ₪' : '₪M';

  const body = `
  ${head(`#${escHtml(data.reportId)} · ${escHtml(data.companyName)}`)}
  <div class="rule"></div>
  <div class="body">
    <span class="eyebrow">04 · היוון תזרימי מזומנים</span>
    <h2>DCF + WACC</h2>
    <p class="sub">${escHtml(WACC_DCF_METHODOLOGY_COPY)}</p>
    <div style="display:grid;grid-template-columns:64mm 1fr;gap:8mm;margin-top:6mm;align-items:start">
      <div class="box" style="margin-top:0;text-align:center"><h3 style="text-align:right">הרכב WACC</h3>${buildEquifyWaccDonutSvg(data.waccSegments, data.waccPct)}</div>
      <div><table style="margin-top:0"><tr><th>רכיב</th><th>שיעור</th></tr>${waccRows}<tr class="sum"><td>WACC אפקטיבי</td><td class="n">${f.pct(data.waccPct)}</td></tr></table></div>
    </div>
    <table>
      <tr><th>${unitLabel}</th>${dcfCols}<th>טרמינלי</th></tr>
      <tr><td>FCFF חזוי</td>${fcffRow}<td class="n">${data.dcfRows.at(-1) ? f.fixed(data.dcfRows.at(-1)!.fcffM, 2) : numHtml('—')}</td></tr>
      <tr><td>פקטור היוון</td>${dfRow}<td class="n">${numHtml('—')}</td></tr>
      <tr><td>שווי נוכחי</td>${pvRow}<td class="n">${f.fixed(data.terminalPvM, 1)}*</td></tr>
      <tr class="sum"><td>שווי פעילות לפי DCF</td><td class="n" colspan="${data.dcfRows.length + 1}"></td><td class="n">${f.money(data.dcfEv)}</td></tr>
    </table>
    <p class="note">* ערך טרמינלי מהווה ${f.pct(data.terminalSharePct, 0)} מסך השווי.</p>
  </div>`;
  return wrapSheet(4, '', body, data.locale);
}

function multiplesInterpretation(data: ValuationData): string {
  const f = pdfFmt(data.locale);
  const ebitdaMed = data.industryEbitdaMedian ?? data.effectiveMult;
  const revMed = data.industryRevenueMedian ?? data.revenueMultiple;
  const marginMed = data.industryEbitdaMarginPct ?? data.marginPct;
  return `<tr><td>מכפיל EBITDA</td><td class="n">${f.multiple(data.effectiveMult)}</td><td class="n">${f.multiple(ebitdaMed)}</td><td>מכויל מול ענף</td></tr>
    <tr><td>מכפיל הכנסות</td><td class="n">${f.multiple(data.revenueMultiple)}</td><td class="n">${f.multiple(revMed)}</td><td>בטווח השוק</td></tr>
    <tr><td>שיעור EBITDA</td><td class="n">${f.pctLabel(data.marginPct)}</td><td class="n">${f.pctLabel(marginMed)}</td><td>רווחיות יחסית לענף</td></tr>`;
}

function buildCompsTable(data: ValuationData): string {
  const f = pdfFmt(data.locale);
  const comps = data.compsTransactions ?? [];
  if (!comps.length) return '';
  const rows = comps
    .map(
      (c) =>
        `<tr><td class="n">${f.int(c.index)}</td><td>${escHtml(c.sector)}</td><td class="n">${f.int(c.year)}</td><td class="n">${f.fixed(c.evM, 1)}</td><td class="n">${f.mult(c.ebitdaMultiple)}</td><td class="n">${f.mult(c.revenueMultiple)}</td><td class="n">${f.pct(c.ebitdaMarginPct, 0)}</td><td style="font-size:8px;color:var(--dim)">${escHtml(c.note ?? '')}</td></tr>`,
    )
    .join('');
  const evHeader = data.locale === 'en' ? 'EV (M ₪)' : 'EV (₪M)';
  return `<table style="margin-top:3mm"><tr><th>#</th><th>עסקה</th><th>שנה</th><th>${evHeader}</th><th>EV/EBITDA</th><th>EV/Rev</th><th>EBITDA%</th><th>הערה</th></tr>${rows}</table>`;
}

function buildPage5Multiples(data: ValuationData): string {
  const body = `
  ${head(`#${escHtml(data.reportId)} · ${escHtml(data.companyName)}`)}
  <div class="rule"></div>
  <div class="body">
    <span class="eyebrow">05 · מכפילי שוק</span>
    <h2>מיקום מול עסקאות השוואה</h2>
    <p class="sub">${escHtml(data.multiplesIntro ?? multiplesMethodologyCopy(`בענף ${data.sectorLabel || data.sector || 'הרלוונטי'}`))}</p>
    <div class="box"><h3>מיקום מול טווח השוק</h3>${buildEquifyMultiplesTracksSvg(data.multiplesPositions)}</div>
    ${buildCompsTable(data)}
    <table><tr><th>פרמטר</th><th>החברה</th><th>חציון השוק</th><th>פרשנות</th></tr>${multiplesInterpretation(data)}</table>
  </div>`;
  return wrapSheet(5, '', body, data.locale);
}

function scenarioEquityStyle(key: string): string {
  if (key === 'bear') return ' style="color:#C24A4A;font-weight:600"';
  if (key === 'base') return ' style="color:#00A89F;font-weight:700"';
  if (key === 'bull') return ' style="color:#A8842E;font-weight:600"';
  return '';
}

function buildScenarioNarrativesBlock(data: ValuationData): string {
  const narrativesTitle =
    data.locale === 'en' ? 'Scenario interpretation' : 'פרשנות תרחישים';
  const blocks = data.scenarios
    .map((s) => {
      const label =
        s.key === 'bear' ? '🐻 Bear' : s.key === 'bull' ? '🚀 Bull' : '◆ Base';
      const tag = s.description ?? s.narrative;
      const full = s.fullDescription;
      if (!tag && !full) return '';
      return `<div style="margin-top:3mm;padding-top:2mm;border-top:1px dashed #D6E8E4">
        <div style="font-size:9px;font-weight:600;color:var(--ink);margin-bottom:1mm">${escHtml(label)}${tag ? ` · ${escHtml(tag)}` : ''}</div>
        ${full ? `<div style="font-size:8px;color:var(--dim);line-height:1.55">${escHtml(full)}</div>` : ''}
      </div>`;
    })
    .filter(Boolean)
    .join('');
  if (!blocks) return '';
  return `<div class="box" style="margin-top:4mm"><h3>${escHtml(narrativesTitle)}</h3>${blocks}</div>`;
}

function buildPage6Scenarios(data: ValuationData): string {
  const f = pdfFmt(data.locale);
  const en = data.locale === 'en';
  const scenarioRows = data.scenarios
    .map((s) => {
      const label =
        s.key === 'bear' ? '🐻 Bear' : s.key === 'bull' ? '🚀 Bull' : '◆ Base';
      const nameCell = s.key === 'base' ? `<td><b>${label}</b></td>` : `<td>${label}</td>`;
      const rowStyle = s.key === 'base' ? ' style="background:var(--tint)"' : '';
      return `<tr${rowStyle}>${nameCell}<td class="n">${f.pct(s.growthPct, 0)}</td><td class="n">${f.pct(s.ebitdaMarginPct)}</td><td class="n">${f.pct(s.waccPct)}</td><td class="n">${f.mult(s.multiple)}</td><td class="n">${f.money(s.ev)}</td><td class="n"${scenarioEquityStyle(s.key)}>${f.money(s.equity)}</td></tr>`;
    })
    .join('');

  const body = `
  ${head(`#${escHtml(data.reportId)} · ${escHtml(data.companyName)}`)}
  <div class="rule"></div>
  <div class="body">
    <span class="eyebrow">${en ? '06 · Scenarios' : '06 · תרחישים'}</span>
    <h2>${en ? 'Equity range by scenario' : 'טווח שווי לפי תרחיש'}</h2>
    <p class="sub">${escHtml(scenariosIntroFromRows(data.scenarios, data.locale))}</p>
    <table><tr><th>${en ? 'Scenario' : 'תרחיש'}</th><th>${en ? 'Growth' : 'צמיחה'}</th><th>${en ? 'EBITDA %' : 'שיעור EBITDA'}</th><th>WACC</th><th>${en ? 'Multiple' : 'מכפיל'}</th><th>EV</th><th>${en ? 'Equity value' : 'שווי לבעלים'}</th></tr>${scenarioRows}</table>
    <div class="box"><h3>${en ? 'Equity value range' : 'טווח השווי לבעלים'}</h3>${buildEquifyScenarioRangeSvg(equityM(data.bearEquity), equityM(data.equity), equityM(data.bullEquity))}</div>
    ${buildScenarioNarrativesBlock(data)}
  </div>`;
  return wrapSheet(6, '', body, data.locale);
}

function buildPage7QualitySensitivity(data: ValuationData): string {
  const f = pdfFmt(data.locale);
  const en = data.locale === 'en';
  const factorRows = data.qualityFactors
    .map(
      (fRow) =>
        `<tr><td>${escHtml(fRow.label)}</td><td>${escHtml(fRow.finding)}</td><td class="n">${f.int(fRow.score)}${fRow.maxScore ? `/${fRow.maxScore}` : ''}</td></tr>`,
    )
    .join('');
  const sensGrowthMatrix = data.sensitivityGrowthWacc;
  const sensGrowth = sensGrowthMatrix
    ? buildSensitivityMatrixTable(sensGrowthMatrix, data.locale)
    : '';
  const sensEbitda = data.sensitivityEbitdaMult
    ? buildEbitdaSensitivityTable(data.sensitivityEbitdaMult, data.locale)
    : '';
  const sensitivityIntro = sensGrowthMatrix
    ? en
      ? sensitivityIntroCopyEn(sensGrowthMatrix, data.growthPct, data.waccPct)
      : sensitivityIntroCopy(sensGrowthMatrix, data.growthPct, data.waccPct)
    : '';
  const qualityIntro = en
    ? qualityScoreIntroCopyEn(data.qualityScore, data.qualityGrade)
    : qualityScoreIntroCopy(data.qualityScore, data.qualityGrade);
  const sensHeader =
    data.locale === 'en'
      ? 'Sensitivity — equity value (M ₪) · WACC × growth'
      : 'רגישות — שווי לבעלים (₪M) · WACC × צמיחה';
  const ebitdaSensHeader =
    data.locale === 'en'
      ? 'Sensitivity — EV (M ₪) · EBITDA × multiple'
      : 'רגישות — EV (₪M) · EBITDA × מכפיל';

  const body = `
  ${head(`#${escHtml(data.reportId)} · ${escHtml(data.companyName)}`)}
  <div class="rule"></div>
  <div class="body">
    <span class="eyebrow">${en ? '07 · Quality & sensitivity' : '07 · איכות ורגישות'}</span>
    <h2>${en ? 'Quality Score & sensitivity analysis' : 'Quality Score וניתוח רגישות'}</h2>
    <p class="sub">${escHtml(qualityIntro)}</p>
    <div style="display:grid;grid-template-columns:54mm 1fr;gap:8mm;align-items:start;margin-top:2mm">
      <div class="box" style="text-align:center;margin-top:0">${buildEquifyQualityGaugeSvg(data.qualityScore, data.qualityGrade)}</div>
      <table style="margin-top:0"><tr><th>${en ? 'Quality factor' : 'גורם איכות'}</th><th>${en ? 'Finding' : 'ממצא'}</th><th>${en ? 'Score' : 'ציון'}</th></tr>${factorRows}</table>
    </div>
    ${sensGrowth ? `<p class="sub" style="margin-top:4mm;white-space:pre-line">${escHtml(sensitivityIntro)}</p><div class="box" style="margin-top:2mm"><h3>${sensHeader}</h3>${sensGrowth}</div>` : ''}
    ${sensEbitda ? `<div class="box" style="margin-top:4mm"><h3>${ebitdaSensHeader}</h3>${sensEbitda}</div>` : ''}
  </div>`;
  return wrapSheet(7, '', body, data.locale);
}

function blendWeightBar(data: ValuationData): string {
  const f = pdfFmt(data.locale);
  const colors = ['#00A89F', '#4DD6CE', '#C5EDE9'];
  return data.modelBlend
    .map((r, i) => {
      const bg = colors[i % colors.length]!;
      const fg = i === 0 ? '#fff' : '#0F2E29';
      const short = /dcf/i.test(r.name) ? 'DCF' : /ebitda/i.test(r.name) ? 'EBITDA' : 'REV';
      return `<div style="width:${r.weightPct.toFixed(0)}%;background:${bg};display:grid;place-items:center;color:${fg};font-family:'IBM Plex Mono';font-size:9px;font-weight:600">${short} · ${f.pct(r.weightPct, 0)}</div>`;
    })
    .join('');
}

function buildPage8Combined(data: ValuationData): string {
  const f = pdfFmt(data.locale);
  const dateLabel = data.valuationDateShort ?? reportDateHe(data.valuationDate);
  const body = `
  ${head(`#${escHtml(data.reportId)} · ${escHtml(data.companyName)}`)}
  <div class="rule"></div>
  <div class="body" style="text-align:center;display:flex;flex-direction:column;justify-content:center">
    <span class="eyebrow" style="justify-content:center">08 · שווי משולב</span>
    <h2>שווי משולב</h2>
    <div style="display:flex;height:13mm;border-radius:8px;overflow:hidden;border:1px solid var(--line);margin:8mm auto 0;max-width:150mm;width:100%">${blendWeightBar(data)}</div>
    <div class="c-val" style="margin:10mm 0 2mm">${f.equityCover(data.equity)}</div>
    <div class="c-cap">שווי לבעלים · תרחיש בסיס · טווח ${f.money(data.bearEquity)} – ${f.money(data.bullEquity)} · נכון ל-${escHtml(dateLabel)}</div>
    <div class="seal" style="margin:9mm auto 0"><i></i>CERTIFIED ALGORITHMIC VALUATION · SBC METHODOLOGY</div>
    <p class="note" style="text-align:right;margin-top:12mm"><b>גילוי נאות:</b> ${escHtml(data.disclaimer ?? defaultDisclaimer())}</p>
  </div>`;
  return wrapSheet(8, '', body, data.locale);
}

export function buildEquifyPdfPages(data: ValuationData): string {
  return [
    buildPage1Cover(data),
    buildPage2ExecSummary(data),
    buildPage3Financials(data),
    buildPage4Dcf(data),
    buildPage5Multiples(data),
    buildPage6Scenarios(data),
    buildPage7QualitySensitivity(data),
    buildPage8Combined(data),
  ].join('\n');
}

export const EQUIFY_PDF_PAGE_COUNT = TOTAL_PAGES;
