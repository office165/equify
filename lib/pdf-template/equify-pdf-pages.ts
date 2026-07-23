import {
  escHtml,
  equityCoverValHtml,
  equityTriCurrencyCoverHtml,
  fmtMoneyCompactHtml,
  fmtMoneyCompactSignedHtml,
  fmtMoneyNarrativeHe,
  fmtMultipleHtml,
  fmtPercentHtml,
  multHtml,
  numHtml,
  pctHtml,
  reportDateHe,
  reportDateShortHe,
  resolvePdfActiveCurrency,
  resolvePdfLocale,
} from '../pdf/print/print_formatters';
import { formatReportEvHeader, formatReportMillionsUnitFromProfile, normalizeCurrencyCode } from '../utils/formatCurrency';
import { formatNetDebtLine } from '../format/currency';
import {
  buildEbitdaSensitivityTable,
  buildSensitivityMatrixTable,
} from './charts';
import {
  buildEquifyFinancialBarChartSvg,
  buildEquifyMultiplesTracksSvg,
  buildEquifyQualityGaugeSvg,
  buildEquifyScenarioRangeSvg,
  buildEquifyWaccDonutSvg,
  computeWaterfallFills,
} from './equify-pdf-charts';
import { equifyLogoHtml } from '../brand/equify-logo-html';
import { buildCoverCircleStageHtml } from './cover-circle-graphic';
import { FINANCIAL_DATA_COPY, multiplesMethodologyCopy, qualityScoreIntroCopy, qualityScoreIntroCopyEn, scenariosIntroFromRows, sensitivityIntroCopy, sensitivityIntroCopyEn, WACC_DCF_METHODOLOGY_COPY, ebitdaMultipleInterpretationCopy } from '../i18n/equify_report_copy';
import { isValidLogoDataUrl } from '../utils/logo_data_url';
import type { ValuationData } from './types';
import {
  buildMoatNotesCalloutHtml,
  resolveExecutiveSummaryHtml,
} from './exec-summary-html';
import {
  BLEND_TABLE_WIDTHS,
  WACC_TABLE_WIDTHS,
  MULTIPLES_TABLE_WIDTHS,
  SCENARIO_TABLE_WIDTHS,
  QUALITY_FACTOR_WIDTHS,
  compsTableWidths,
  dcfHorizonTableWidths,
  emptyCells,
  reportColgroup,
  trajectoryTableWidths,
} from './report-table-layout';

const TOTAL_PAGES = 8;

function pdfFmt(data: Pick<ValuationData, 'locale' | 'currency' | 'activeCurrency'>) {
  const currency = data.currency ?? 'ILS';
  const locale = data.locale;
  const pdfLocale = resolvePdfLocale(locale);
  const activeCurrency = resolvePdfActiveCurrency(currency, locale, data.activeCurrency);
  return {
    money: (v: number | null | undefined) =>
      fmtMoneyCompactHtml(v, locale, currency, activeCurrency),
    moneyNarrative: (v: number | null | undefined) =>
      pdfLocale === 'en'
        ? fmtMoneyCompactHtml(v, locale, currency, activeCurrency)
        : escHtml(fmtMoneyNarrativeHe(v, currency)),
    moneySigned: (v: number) =>
      fmtMoneyCompactSignedHtml(v, locale, currency, activeCurrency),
    equityCover: (v: number) => equityCoverValHtml(v, locale, currency, activeCurrency),
    unitLabel: formatReportMillionsUnitFromProfile(activeCurrency, pdfLocale),
    evHeader: formatReportEvHeader(currency, pdfLocale),
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

function head(rid: string): string {
  return `<div class="head">${equifyLogoHtml('light-bg', { heightPt: 28 })}<span class="rid">${rid}</span></div>`;
}

function foot(page: number, locale?: ValuationData['locale']): string {
  const en = locale === 'en';
  const pageInner = en
    ? `Page <b>${page}</b> / ${TOTAL_PAGES}`
    : `עמוד <b>${page}</b> / ${TOTAL_PAGES}`;
  return `<div class="foot"><span class="foot-l">EQUIFY VALUATION ENGINE © 2026 equify BY SBC · CONFIDENTIAL</span><span class="foot-r foot-pg">${pageInner}</span></div>`;
}

function wrapSheet(
  page: number,
  className: string,
  body: string,
  locale?: ValuationData['locale'],
): string {
  return `<div class="page${className ? ` ${className}` : ''}">${body}${foot(page, locale)}</div>`;
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
  const f = pdfFmt(data);
  const parts = data.modelBlend.map(
    (r) => `${escHtml(r.name)} (${f.pct(r.weightPct, 0)})`,
  );
  return `שקלול של ${parts.join(', ')} מניב שווי פעילות של ${f.moneyNarrative(data.enterpriseValue)}. בניכוי חוב נטו של ${f.moneyNarrative(data.netDebt)}, השווי לבעלים בתרחיש הבסיס עומד על ${f.moneyNarrative(data.equity)}.`;
}

function defaultDisclaimer(): string {
  return 'דוח זה הינו אינדיקציית שווי אלגוריתמית שהופקה על ידי מנוע equify, על בסיס נתונים שהוזנו על ידי המשתמש ונתוני שוק פומביים. הדוח אינו מהווה ייעוץ השקעות, חוות דעת חשבונאית, הערכת שווי לצרכים סטטוטוריים או תחליף לבדיקת נאותות. SBC ו-equify אינן נושאות באחריות להחלטות שיתקבלו על בסיס דוח זה. © 2026 equify BY SBC. כל הזכויות שמורות.';
}

function companyLogoCoverHtml(dataUrl?: string): string {
  if (!isValidLogoDataUrl(dataUrl)) return '';
  return `<img class="c-logo" src="${escHtml(dataUrl)}" alt="" />`;
}

function buildPage1Cover(data: ValuationData): string {
  const f = pdfFmt(data);
  const dateLabel = reportDateHe(data.valuationDate);
  const logoHtml = companyLogoCoverHtml(data.customLogoDataUrl);
  const body = `
  ${head(`VALUATION REPORT · #${escHtml(data.reportId)}`)}
  <div class="rule-grad"></div>
  <div class="body cover-layout">
    <div class="cover-hero-zone">
      <div class="cover-header">
        <span class="eyebrow cover-eyebrow">דוח הערכת שווי · ${escHtml(dateLabel)}</span>
        ${logoHtml}
        <div class="c-comp">${escHtml(data.companyName)}</div>
        <div class="c-meta">${metaLine(data)}</div>
        <div class="c-id">${identityLine(data)}</div>
      </div>
      ${buildCoverCircleStageHtml(equityTriCurrencyCoverHtml(data), data.equityIls ?? data.equity)}
    </div>
    <div class="cover-lower-stack">
      <div class="c-cap">שווי לבעלים (Equity Value) · תרחיש בסיס · טווח ${f.money(data.bearEquity)} – ${f.money(data.bullEquity)}</div>
      <div class="seal"><i></i>ALGORITHMIC EQUITY INDICATION · SBC METHOD</div>
      <div class="cover-metrics c-grid c-grid--cover">
        <div><b class="hl">${f.money(data.equity)}</b><span>שווי לבעלים · בסיס</span></div>
        <div><b>${f.pct(data.waccPct)}</b><span>WACC אפקטיבי</span></div>
        <div><b class="gd">${f.int(data.qualityScore)} / ${escHtml(data.qualityGrade)}</b><span>Quality Score</span></div>
      </div>
    </div>
  </div>`;
  return wrapSheet(1, 'cover', body, data.locale);
}

function formatWaterfallNetDebtRow(
  netDebtAbs: number,
  data: ValuationData,
): { label: string; valueHtml: string } {
  const netDebtK = netDebtAbs / 1000;
  const locale = resolvePdfLocale(data.locale);
  const currency = normalizeCurrencyCode(data.currency ?? 'ILS');
  const line = formatNetDebtLine(netDebtK, locale, currency);
  const color =
    line.tone === 'positive'
      ? 'var(--turq)'
      : line.tone === 'negative'
        ? '#C24A4A'
        : 'var(--text)';
  return {
    label: locale === 'en' ? line.labelEn : line.labelHe,
    valueHtml: `<b style="color:${color}">${escHtml(line.displayValue)}</b>`,
  };
}

function buildPage2ExecSummary(data: ValuationData): string {
  const f = pdfFmt(data);
  const wf = computeWaterfallFills(data);
  const netDebtRow = formatWaterfallNetDebtRow(data.netDebt, data);
  const summary = resolveExecutiveSummaryHtml(data, defaultExecutiveSummary);
  const moatCallout = buildMoatNotesCalloutHtml(data);
  const methodologyNoteHtml = data.profitabilityMethodologyNote
    ? `<div class="box tint methodology-note" style="margin-top:3mm;white-space:pre-line">${escHtml(data.profitabilityMethodologyNote)}</div>`
    : '';
  const normalizedEbitdaHtml = data.normalizedEbitdaNote
    ? `<div class="box tint methodology-note" style="margin-top:3mm;white-space:pre-line">${escHtml(data.normalizedEbitdaNote)}</div>`
    : '';
  const blendRows = data.modelBlend
    .map(
      (r) =>
        `<tr><td>${escHtml(r.name)}</td><td class="n">${f.money(r.ev)}</td><td class="n">${f.pct(r.weightPct, 0)}</td><td class="n">${f.money(r.contribution)}</td></tr>`,
    )
    .join('');
  const noteDate = data.valuationDateShort ?? reportDateShortHe(data.valuationDate);

  const body = `
  ${head(`#${escHtml(data.reportId)} · ${escHtml(data.companyName)}`)}
  <div class="rule-grad"></div>
  <div class="body page-body--exec page-body--distributed">
    <div class="page-intro">
      <span class="eyebrow">02 · תקציר מנהלים</span>
      <h2>תקציר מנהלים</h2>
      <p class="sub">${summary}</p>
      ${moatCallout}
    </div>
    <div class="page-stack">
      <section class="page-section page-section--kpi">
        <div class="kgrid">
          <div class="kcard"><div class="kv hl">${f.money(data.equity)}</div><div class="kl">שווי לבעלים · בסיס</div></div>
          <div class="kcard"><div class="kv">${f.money(data.enterpriseValue)}</div><div class="kl">שווי פעילות (EV)</div></div>
          <div class="kcard"><div class="kv">${f.pct(data.waccPct)}</div><div class="kl">WACC אפקטיבי</div></div>
          <div class="kcard"><div class="kv gd">${escHtml(data.qualityGrade)} · ${f.int(data.qualityScore)}</div><div class="kl">Quality Score</div></div>
        </div>
      </section>
      <section class="page-section page-section--waterfall">
        <div class="box">
          <h3>מ-EV לשווי לבעלים</h3>
          <div class="wf-row"><span class="lbl">שווי פעילות</span><div class="wf-track"><div class="wf-fill" style="inset-inline-start:0;width:100%;background:linear-gradient(90deg,#4DD6CE,#00A89F)"></div></div><b>${f.money(data.enterpriseValue)}</b></div>
          <div class="wf-row"><span class="lbl">${netDebtRow.label}</span><div class="wf-track"><div class="wf-fill" style="inset-inline-end:0;width:${wf.debtPct.toFixed(1)}%;background:linear-gradient(90deg,#F0ADAD,#C24A4A)"></div></div>${netDebtRow.valueHtml}</div>
          <div class="wf-row"><span class="lbl"><b style="color:var(--pine);font-family:'Assistant'">שווי לבעלים</b></span><div class="wf-track"><div class="wf-fill" style="inset-inline-start:0;width:${wf.equityPct.toFixed(1)}%;background:linear-gradient(90deg,#00A89F,#163530)"></div></div><b style="color:var(--turq)">${f.money(data.equity)}</b></div>
        </div>
      </section>
      <section class="page-section page-section--blend">
        <table class="report-table report-table--blend">
          ${reportColgroup([...BLEND_TABLE_WIDTHS])}
          <tr><th>מודל</th><th>שווי פעילות</th><th>משקל</th><th>תרומה</th></tr>
          ${blendRows}
          <tr class="sum"><td>שווי פעילות משולב</td><td class="n"></td><td class="n">${f.pct(100, 0)}</td><td class="n">${f.money(data.enterpriseValue)}</td></tr>
        </table>
        ${methodologyNoteHtml}
        ${normalizedEbitdaHtml}
        <p class="note">הערכה זו בוצעה ב-${escHtml(noteDate)} על בסיס נתונים שהוזנו על ידי המשתמש ותחזיות הנהלה.</p>
      </section>
    </div>
  </div>`;
  return wrapSheet(2, '', body, data.locale);
}

function buildPage3Financials(data: ValuationData): string {
  const f = pdfFmt(data);
  const cols = data.trajectory.map((t) => `<th>${escHtml(t.label)}</th>`).join('');
  const revRow = data.trajectory.map((t) => `<td class="n">${f.fixed(t.revenueM, 1)}</td>`).join('');
  const ebtRow = data.trajectory.map((t) => `<td class="n">${f.fixed(t.ebitdaM, 2)}</td>`).join('');
  const marginRow = data.trajectory
    .map((t) => {
      const m = t.revenueM > 0 ? (t.ebitdaM / t.revenueM) * 100 : 0;
      return `<td class="n">${f.pct(m)}</td>`;
    })
    .join('');
  const unitLabel = f.unitLabel;
  const currentYearPoint =
    [...data.trajectory].reverse().find((t) => !t.forecast) ??
    data.trajectory.at(-1);
  const currentMarginPct =
    currentYearPoint && currentYearPoint.revenueM > 0
      ? (currentYearPoint.ebitdaM / currentYearPoint.revenueM) * 100
      : data.marginPct;

  const body = `
  ${head(`#${escHtml(data.reportId)} · ${escHtml(data.companyName)}`)}
  <div class="rule-grad"></div>
  <div class="body">
    <span class="eyebrow">03 · נתונים פיננסיים</span>
    <h2>נתונים פיננסיים</h2>
    <p class="sub">${escHtml(FINANCIAL_DATA_COPY)}</p>
    <div class="box"><h3>הכנסות מול EBITDA · ${unitLabel}</h3>${buildEquifyFinancialBarChartSvg(data.trajectory)}</div>
    <table class="report-table report-table--trajectory">
      ${reportColgroup(trajectoryTableWidths(data.trajectory.length))}
      <tr><th>${unitLabel}</th>${cols}</tr><tr><td>הכנסות</td>${revRow}</tr><tr><td>EBITDA</td>${ebtRow}</tr><tr class="sum"><td>שיעור EBITDA</td>${marginRow}</tr>
    </table>
    <p class="note">CAGR ${f.pct(data.growthPct, 0)} · שיעור EBITDA ${f.pct(currentMarginPct)}. ${data.netDebtNote ? escHtml(data.netDebtNote) : `חוב נטו: ${f.money(data.netDebt)}.`}</p>
  </div>`;
  return wrapSheet(3, '', body, data.locale);
}

function buildPage4Dcf(data: ValuationData): string {
  const f = pdfFmt(data);
  const waccRows = data.waccSegments
    .flatMap((s) => {
      const main = `<tr><td><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${s.color};margin-inline-end:6px"></span>${escHtml(s.label)}</td><td class="n">${f.pct(s.pct)}</td></tr>`;
      const subs = (s.subRows ?? []).map(
        (sub) =>
          `<tr><td style="padding-inline-start:14px;font-size:8.5px;color:var(--dim)">└ ${escHtml(sub.label)}</td><td class="n" style="font-size:8.5px">${f.pct(sub.pct)}</td></tr>`,
      );
      return [main, ...subs];
    })
    .join('');
  const dcfCols = data.dcfRows.map((r) => `<th>${escHtml(r.label)}</th>`).join('');
  const fcffRow = data.dcfRows.map((r) => `<td class="n">${f.fixed(r.fcffM, 2)}</td>`).join('');
  const dfRow = data.dcfRows.map((r) => `<td class="n">${f.fixed(r.discountFactor, 3)}</td>`).join('');
  const pvRow = data.dcfRows.map((r) => `<td class="n">${f.fixed(r.pvM, 2)}</td>`).join('');
  const unitLabel = f.unitLabel;

  const body = `
  ${head(`#${escHtml(data.reportId)} · ${escHtml(data.companyName)}`)}
  <div class="rule-grad"></div>
  <div class="body page-body--dcf page-body--distributed">
    <div class="page-intro">
      <span class="eyebrow">04 · היוון תזרימי מזומנים</span>
      <h2>DCF + WACC</h2>
      <p class="sub">${escHtml(WACC_DCF_METHODOLOGY_COPY)}</p>
    </div>
    <div class="page-stack">
      <section class="page-section page-section--wacc">
        <div class="dcf-wacc-layout">
          <div class="box box-chart-visible"><h3>הרכב WACC</h3>${buildEquifyWaccDonutSvg(data.waccSegments, data.waccPct)}</div>
          <div class="dcf-wacc-table-wrap">
            <table class="report-table report-table--wacc">
              ${reportColgroup([...WACC_TABLE_WIDTHS])}
              <tr><th>רכיב</th><th>שיעור</th></tr>${waccRows}<tr class="sum"><td>WACC אפקטיבי</td><td class="n">${f.pct(data.waccPct)}</td></tr>
            </table>
          </div>
        </div>
      </section>
      <section class="page-section page-section--horizon">
        <table class="report-table report-table--dcf">
          ${reportColgroup(dcfHorizonTableWidths(data.dcfRows.length))}
          <tr><th>${unitLabel}</th>${dcfCols}<th>טרמינלי</th></tr>
          <tr><td>FCFF חזוי</td>${fcffRow}<td class="n">${data.dcfRows.at(-1) ? f.fixed(data.dcfRows.at(-1)!.fcffM, 2) : numHtml('—')}</td></tr>
          <tr><td>פקטור היוון</td>${dfRow}<td class="n">${numHtml('—')}</td></tr>
          <tr><td>שווי נוכחי</td>${pvRow}<td class="n">${f.fixed(data.terminalPvM, 1)}*</td></tr>
          <tr class="sum"><td>שווי פעילות לפי DCF</td>${emptyCells(data.dcfRows.length)}<td class="n">${f.money(data.dcfEv)}</td></tr>
        </table>
        <p class="note">* ערך טרמינלי מהווה ${f.pct(data.terminalSharePct, 0)} מסך השווי.</p>
      </section>
    </div>
  </div>`;
  return wrapSheet(4, '', body, data.locale);
}

function multiplesInterpretation(data: ValuationData): string {
  const f = pdfFmt(data);
  const ebitdaMed = data.industryEbitdaMedian ?? data.multipleBase ?? data.effectiveMult;
  const revMed = data.industryRevenueMedian ?? data.revenueMultiple;
  const marginMed = data.industryEbitdaMarginPct ?? data.marginPct;
  const ebitdaInterp = escHtml(
    ebitdaMultipleInterpretationCopy({
      locale: data.locale,
      effectiveMult: data.effectiveMult,
      qualityScore: data.qualityScore,
      qualityGrade: data.qualityGrade,
      multipleConcentrationPenalty: data.multipleConcentrationPenalty,
    }),
  );
  return `<tr><td>מכפיל EBITDA</td><td class="n">${f.multiple(data.effectiveMult)}</td><td class="n">${f.multiple(ebitdaMed)}</td><td class="interp-cell">${ebitdaInterp}</td></tr>
    <tr><td>מכפיל הכנסות</td><td class="n">${f.multiple(data.revenueMultiple)}</td><td class="n">${f.multiple(revMed)}</td><td class="interp-cell">בטווח השוק</td></tr>
    <tr><td>שיעור EBITDA</td><td class="n">${f.pctLabel(data.marginPct)}</td><td class="n">${f.pctLabel(marginMed)}</td><td class="interp-cell">רווחיות יחסית לענף</td></tr>`;
}

function buildCompsTable(data: ValuationData): string {
  const f = pdfFmt(data);
  const comps = data.compsTransactions ?? [];
  if (!comps.length) return '';
  const rows = comps
    .map(
      (c) =>
        `<tr><td class="n">${f.int(c.index)}</td><td>${escHtml(c.sector)}</td><td class="n">${f.int(c.year)}</td><td class="n">${f.fixed(c.evM, 1)}</td><td class="n">${f.mult(c.ebitdaMultiple)}</td><td class="n">${f.mult(c.revenueMultiple)}</td><td class="n">${f.pct(c.ebitdaMarginPct, 0)}</td><td class="comps-note-cell">${escHtml(c.note ?? '')}</td></tr>`,
    )
    .join('');
  const evHeader = f.evHeader;
  return `<table class="report-table report-table--comps">
    ${reportColgroup(compsTableWidths())}
    <tr><th>#</th><th>עסקה</th><th>שנה</th><th>${evHeader}</th><th>EV/EBITDA</th><th>EV/Rev</th><th>EBITDA%</th><th>הערה</th></tr>${rows}</table>`;
}

function buildPage5Multiples(data: ValuationData): string {
  const compsTable = buildCompsTable(data);
  const body = `
  ${head(`#${escHtml(data.reportId)} · ${escHtml(data.companyName)}`)}
  <div class="rule-grad"></div>
  <div class="body page-body--multiples page-body--distributed">
    <div class="page-intro">
      <span class="eyebrow">05 · מכפילי שוק</span>
      <h2>מיקום מול עסקאות השוואה</h2>
      <p class="sub">${escHtml(data.multiplesIntro ?? multiplesMethodologyCopy(`בענף ${data.sectorLabel || data.sector || 'הרלוונטי'}`))}</p>
    </div>
    <div class="page-stack">
      <section class="page-section page-section--tracks">
        <div class="box box-chart-visible">
          <h3>מיקום מול טווח השוק</h3>
          <div class="multiples-tracks-chart">${buildEquifyMultiplesTracksSvg(data.multiplesPositions, data.currency)}</div>
        </div>
      </section>
      ${compsTable ? `<section class="page-section page-section--comps">${compsTable}</section>` : ''}
      <section class="page-section page-section--compare">
        <table class="report-table report-table--multiples multiples-compare-table">
          ${reportColgroup([...MULTIPLES_TABLE_WIDTHS])}
          <tr><th>פרמטר</th><th>החברה</th><th>חציון השוק</th><th>פרשנות</th></tr>${multiplesInterpretation(data)}
        </table>
      </section>
    </div>
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
      return `<div class="narrative-block">
        <div class="narrative-title">${escHtml(label)}${tag ? ` · ${escHtml(tag)}` : ''}</div>
        ${full ? `<div class="narrative-body">${escHtml(full)}</div>` : ''}
      </div>`;
    })
    .filter(Boolean)
    .join('');
  if (!blocks) return '';
  return `<div class="box" style="margin-top:2mm"><h3>${escHtml(narrativesTitle)}</h3>${blocks}</div>`;
}

function buildPage6Scenarios(data: ValuationData): string {
  const f = pdfFmt(data);
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
  <div class="rule-grad"></div>
  <div class="body">
    <span class="eyebrow">${en ? '06 · Scenarios' : '06 · תרחישים'}</span>
    <h2>${en ? 'Equity range by scenario' : 'טווח שווי לפי תרחיש'}</h2>
    <p class="sub">${escHtml(scenariosIntroFromRows(data.scenarios, data.locale))}</p>
    <table class="report-table report-table--scenarios">
      ${reportColgroup([...SCENARIO_TABLE_WIDTHS])}
      <tr><th>${en ? 'Scenario' : 'תרחיש'}</th><th>${en ? 'Growth' : 'צמיחה'}</th><th>${en ? 'EBITDA %' : 'שיעור EBITDA'}</th><th>WACC</th><th>${en ? 'Multiple' : 'מכפיל'}</th><th>EV</th><th>${en ? 'Equity value' : 'שווי לבעלים'}</th></tr>${scenarioRows}</table>
    <div class="box"><h3>${en ? 'Equity value range' : 'טווח השווי לבעלים'}</h3>${buildEquifyScenarioRangeSvg(data.bearEquity, data.equity, data.bullEquity, data.currency)}</div>
    ${buildScenarioNarrativesBlock(data)}
  </div>`;
  return wrapSheet(6, '', body, data.locale);
}

function buildPage7QualitySensitivity(data: ValuationData): string {
  const f = pdfFmt(data);
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
      ? `Sensitivity — equity value (${f.unitLabel}) · WACC × growth`
      : `רגישות — שווי לבעלים (${f.unitLabel}) · WACC × צמיחה`;
  const ebitdaSensHeader =
    data.locale === 'en'
      ? `Sensitivity — EV (${f.unitLabel}) · EBITDA × multiple`
      : `רגישות — EV (${f.unitLabel}) · EBITDA × מכפיל`;

  const body = `
  ${head(`#${escHtml(data.reportId)} · ${escHtml(data.companyName)}`)}
  <div class="rule-grad"></div>
  <div class="body">
    <span class="eyebrow">${en ? '07 · Quality & sensitivity' : '07 · איכות ורגישות'}</span>
    <h2>${en ? 'Quality Score & sensitivity analysis' : 'Quality Score וניתוח רגישות'}</h2>
    <p class="sub">${escHtml(qualityIntro)}</p>
    <div style="display:grid;grid-template-columns:54mm 1fr;gap:5mm;align-items:start;margin-top:1mm">
      <div class="box" style="text-align:center;margin-top:0">${buildEquifyQualityGaugeSvg(data.qualityScore, data.qualityGrade)}</div>
      <table class="report-table report-table--quality" style="margin-top:0">
        ${reportColgroup([...QUALITY_FACTOR_WIDTHS])}
        <tr><th>${en ? 'Quality factor' : 'גורם איכות'}</th><th>${en ? 'Finding' : 'ממצא'}</th><th>${en ? 'Score' : 'ציון'}</th></tr>${factorRows}</table>
    </div>
    ${sensGrowth ? `<p class="sub" style="margin-top:2mm;white-space:pre-line">${escHtml(sensitivityIntro)}</p><div class="box" style="margin-top:1mm"><h3>${sensHeader}</h3>${sensGrowth}</div>` : ''}
    ${sensEbitda ? `<div class="box" style="margin-top:2mm"><h3>${ebitdaSensHeader}</h3>${sensEbitda}</div>` : ''}
  </div>`;
  return wrapSheet(7, '', body, data.locale);
}

function blendWeightBar(data: ValuationData): string {
  const f = pdfFmt(data);
  const colors = ['#00A89F', '#4DD6CE', '#C5EDE9'];
  return data.modelBlend
    .map((r, i) => {
      const bg = colors[i % colors.length]!;
      const fg = i === 0 ? '#fff' : '#0F2E29';
      const short = /dcf/i.test(r.name) ? 'DCF' : /ebitda/i.test(r.name) ? 'EBITDA' : 'REV';
      return `<div class="blend-weight-bar" style="width:${r.weightPct.toFixed(0)}%;background:${bg};display:grid;place-items:center;color:${fg}">${short} · ${f.pct(r.weightPct, 0)}</div>`;
    })
    .join('');
}

function buildPage8Combined(data: ValuationData): string {
  const f = pdfFmt(data);
  const dateLabel = data.valuationDateShort ?? reportDateShortHe(data.valuationDate);
  const body = `
  ${head(`#${escHtml(data.reportId)} · ${escHtml(data.companyName)}`)}
  <div class="rule-grad"></div>
  <div class="body" style="text-align:center;display:flex;flex-direction:column;justify-content:center">
    <span class="eyebrow" style="justify-content:center">08 · שווי משולב</span>
    <h2>שווי משולב</h2>
    <div style="display:flex;height:13mm;border-radius:8px;overflow:hidden;border:1px solid var(--line);margin:5mm auto 0;max-width:150mm;width:100%">${blendWeightBar(data)}</div>
    <div class="c-val" style="margin:10mm 0 2mm">${equityTriCurrencyCoverHtml(data)}</div>
    <div class="c-cap">שווי לבעלים · תרחיש בסיס · טווח ${f.money(data.bearEquity)} – ${f.money(data.bullEquity)} · נכון ל-${escHtml(dateLabel)}</div>
    <div class="seal" style="margin:9mm auto 0"><i></i>ALGORITHMIC EQUITY INDICATION · SBC METHOD</div>
    <p class="note" style="text-align:right;margin-top:8mm"><b>גילוי נאות:</b> ${escHtml(data.disclaimer ?? defaultDisclaimer())}</p>
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
