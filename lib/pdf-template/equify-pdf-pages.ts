import {
  escHtml,
  equityCoverValHtml,
  equityTriCurrencyCoverHtml,
  fmtMoneyCompactHtml,
  fmtMoneyCompactSignedHtml,
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
import { formatCreditAmount, SBC_SITE_URL } from '../credit/credit_chapter';
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
import { FINANCIAL_DATA_COPY, financialDataCopy, multiplesMethodologyCopy, multiplesMethodologyCopyEn, WACC_DCF_METHODOLOGY_COPY_EN, qualityScoreIntroCopy, qualityScoreIntroCopyEn, scenariosIntroFromRows, sensitivityIntroCopy, sensitivityIntroCopyEn, WACC_DCF_METHODOLOGY_COPY, ebitdaMultipleInterpretationCopy } from '../i18n/equify_report_copy';
import { isValidLogoDataUrl } from '../utils/logo_data_url';
import type { ValuationData } from './types';
import { getGoalStandardCopy } from '../wizard/equify_goal_copy';
import {
  buildMoatNotesCalloutHtml,
  resolveExecutiveSummaryHtml,
} from './exec-summary-html';
import {
  BLEND_TABLE_WIDTHS,
  WACC_TABLE_WIDTHS,
  MULTIPLES_COMPARE_WIDTHS,
  SCENARIO_TABLE_WIDTHS,
  QUALITY_FACTOR_WIDTHS,
  compsTableWidths,
  dcfHorizonTableWidths,
  emptyCells,
  reportColgroup,
  trajectoryTableWidths,
} from './report-table-layout';

const TOTAL_PAGES = 8;

/**
 * Round 13 (EN_SITE): the English report. `tr(data)(he, en)` is the Hebrew text as it was, or its English version when the report's
 * locale is 'en'. Pages 1 (cover), 2 (summary), 4 (WACC and DCF), 5 (multiples) and 6 (scenarios) are in English; the rest are listed
 * in reports/round-13.md.
 */
const tr = (data: Pick<ValuationData, 'locale'>) => (he: string, en: string): string => (data.locale === 'en' ? en : he);

function reportDateEn(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return (Number.isNaN(d.getTime()) ? new Date() : d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jerusalem' });
}

function pdfFmt(data: Pick<ValuationData, 'locale' | 'currency' | 'activeCurrency'>) {
  const currency = data.currency ?? 'ILS';
  const locale = data.locale;
  const pdfLocale = resolvePdfLocale(locale);
  const activeCurrency = resolvePdfActiveCurrency(currency, locale, data.activeCurrency);
  return {
    money: (v: number | null | undefined) =>
      fmtMoneyCompactHtml(v, locale, currency, activeCurrency),
    // Round 5: prose uses the same currency format as the tables and cards ("10.9M ₪").
    moneyNarrative: (v: number | null | undefined) =>
      fmtMoneyCompactHtml(v, locale, currency, activeCurrency),
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

/** Blend weight as shown: whole percent when whole, otherwise one decimal (finding 19). */
function weightPctHtml(f: ReturnType<typeof pdfFmt>, w: number): string {
  return f.pct(w, Number.isInteger(Math.round(w * 10) / 10) && Math.abs(w - Math.round(w)) < 1e-9 ? 0 : 1);
}

/** The backlog uplift row of the blend table is an addition to EV, not a weight. */
function isBacklogRow(name: string): boolean {
  return /צבר|backlog/i.test(name);
}

/** Scenario name in the table and the narratives (round 5: words instead of emoji). */
function scenarioLabel(key: string, locale?: ValuationData['locale']): string {
  if (locale === 'en') return key === 'bear' ? 'Bear' : key === 'bull' ? 'Bull' : 'Base';
  return key === 'bear' ? 'דב (Bear)' : key === 'bull' ? 'שור (Bull)' : 'בסיס (Base)';
}

function head(rid: string): string {
  return `<div class="head">${equifyLogoHtml('light-bg', { heightPt: 28 })}<span class="rid">${rid}</span></div>`;
}

function foot(page: number, locale?: ValuationData['locale']): string {
  const en = locale === 'en';
  const pageInner = en
    ? `Page <b>${page}</b> / ${TOTAL_PAGES}`
    : `עמוד <b>${page}</b> / ${TOTAL_PAGES}`;
  return `<div class="foot"><span class="foot-l">EQUIFY VALUATION ENGINE © 2026 equify BY SBC | CONFIDENTIAL</span><span class="foot-r foot-pg">${pageInner}</span></div>`;
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
  const T = tr(data);
  const parts = [
    data.corporateId ? `${T('ח.פ.', 'Company no.')} ${escHtml(data.corporateId)}` : '',
    `${T('ענף:', 'Sector:')} ${escHtml(data.sectorLabel)}`,
    `${T('מטרת ההערכה:', 'Purpose:')} ${escHtml(data.goalLabel)}`,
  ].filter(Boolean);
  return parts.join(' | ');
}

function identityLine(data: ValuationData): string {
  const parts = [
    escHtml(data.fullName),
    escHtml(data.phone),
    escHtml(data.email),
  ].filter((p) => p && p !== '');
  return parts.join(' | ');
}

function defaultExecutiveSummary(data: ValuationData): string {
  const f = pdfFmt(data);
  // Round 5: "<model> במשקל <w>" (it read "DCF + WACC (13.4%) (36.1%)"); the backlog row is an addition, not a weight.
  const en = data.locale === 'en';
  const parts = data.modelBlend
    .filter((r) => !isBacklogRow(r.name) && r.weightPct > 0)
    .map((r) => (en ? `${escHtml(r.name)} at a weight of ${weightPctHtml(f, r.weightPct)}` : `${escHtml(r.name)} במשקל ${weightPctHtml(f, r.weightPct)}`));
  if (en) {
    const debtEn = data.netDebt < 0 ? `adding net cash of ${f.moneyNarrative(-data.netDebt)}` : `after net debt of ${f.moneyNarrative(data.netDebt)}`;
    const nonOp = data.nonOperatingAssets ? ` and non-operating assets of ${f.moneyNarrative(data.nonOperatingAssets.value)} (estimated)` : '';
    return `Weighting ${parts.join(', ')} gives an enterprise value of ${f.moneyNarrative(data.enterpriseValue)}. ${debtEn[0].toUpperCase()}${debtEn.slice(1)}${nonOp}, the equity value in the base case is ${f.moneyNarrative(data.equity)}.`;
  }
  // Round 5: net cash is added, not "deducted as a negative net debt".
  const debtPart =
    data.netDebt < 0
      ? `בתוספת מזומן נטו של ${f.moneyNarrative(-data.netDebt)}`
      : `בניכוי חוב נטו של ${f.moneyNarrative(data.netDebt)}`;
  if (data.nonOperatingAssets) {
    return `שקלול של ${parts.join(', ')} מניב שווי פעילות של ${f.moneyNarrative(data.enterpriseValue)}. ${debtPart} ובתוספת נכסים שלא בפעילות של ${f.moneyNarrative(data.nonOperatingAssets.value)} (הערכה), השווי לבעלים בתרחיש הבסיס עומד על ${f.moneyNarrative(data.equity)}.`;
  }
  return `שקלול של ${parts.join(', ')} מניב שווי פעילות של ${f.moneyNarrative(data.enterpriseValue)}. ${debtPart}, השווי לבעלים בתרחיש הבסיס עומד על ${f.moneyNarrative(data.equity)}.`;
}

function defaultDisclaimer(): string {
  return 'דוח זה הינו אינדיקציית שווי אלגוריתמית שהופקה על ידי מנוע equify, על בסיס נתונים שהוזנו על ידי המשתמש ונתוני שוק פומביים. הדוח אינו מהווה ייעוץ השקעות, חוות דעת חשבונאית, הערכת שווי לצרכים סטטוטוריים או תחליף לבדיקת נאותות. SBC ו equify אינן נושאות באחריות להחלטות שיתקבלו על בסיס דוח זה. © 2026 equify BY SBC. כל הזכויות שמורות.';
}

function companyLogoCoverHtml(dataUrl?: string): string {
  if (!isValidLogoDataUrl(dataUrl)) return '';
  return `<img class="c-logo" src="${escHtml(dataUrl)}" alt="" />`;
}

function buildPage1Cover(data: ValuationData): string {
  const f = pdfFmt(data);
  const T = tr(data);
  const dateLabel = data.locale === 'en' ? reportDateEn(data.valuationDate) : reportDateHe(data.valuationDate);
  const logoHtml = companyLogoCoverHtml(data.customLogoDataUrl);
  const body = `
  ${head(`VALUATION REPORT | <bdi>#${escHtml(data.reportId)}</bdi>`)}
  <div class="rule-grad"></div>
  <div class="body cover-layout">
    <div class="cover-hero-zone">
      <div class="cover-header">
        <span class="eyebrow cover-eyebrow">${T('דוח הערכת שווי', 'Valuation report')} | ${escHtml(dateLabel)}</span>
        ${logoHtml}
        <div class="c-comp">${escHtml(data.companyName)}</div>
        <div class="c-meta">${metaLine(data)}</div>
        <div class="c-id">${identityLine(data)}</div>
      </div>
      ${buildCoverCircleStageHtml(equityTriCurrencyCoverHtml(data), data.equityIls ?? data.equity)}
    </div>
    <div class="cover-lower-stack">
      <div class="c-cap">${T('שווי לבעלים (Equity Value), תרחיש בסיס, טווח', 'Equity value, base case, range')} ${f.money(data.bearEquity)} ${T('עד', 'to')} ${f.money(data.bullEquity)}</div>
      <div class="seal"><i></i>ALGORITHMIC EQUITY INDICATION | SBC METHOD</div>
      <div class="cover-metrics c-grid c-grid--cover">
        <div><b class="hl">${f.money(data.equity)}</b><span>${T('שווי לבעלים (בסיס)', 'Equity value (base)')}</span></div>
        <div><b>${f.pct(data.waccPct)}</b><span>${T('WACC אפקטיבי', 'Effective WACC')}</span></div>
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
  const T = tr(data);
  const wf = computeWaterfallFills(data);
  const netDebtRow = formatWaterfallNetDebtRow(data.netDebt, data);
  // Round 7 (OPUS_NARRATIVE): a narrative that passed the guard replaces the template summary.
  const summary = data.opusNarrative
    ? escHtml(data.opusNarrative.executiveSummary)
    : resolveExecutiveSummaryHtml(data, defaultExecutiveSummary);
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
        `<tr><td>${escHtml(r.name)}${r.detail ? `<br><span class="blend-leg-note">${escHtml(r.detail)}</span>` : ''}</td><td class="n">${f.money(r.ev)}</td><td class="n">${isBacklogRow(r.name) ? T('תוספת', 'Addition') : weightPctHtml(f, r.weightPct)}</td><td class="n">${f.money(r.contribution)}</td></tr>`,
    )
    .join('');
  const noteDate = data.valuationDateShort ?? reportDateShortHe(data.valuationDate);
  const sov = getGoalStandardCopy(data.goal, resolvePdfLocale(data.locale));
  const sovHtml = sov
    ? `<p class="sov">${escHtml(sov.standardOfValue)}</p>`
    : '';

  const body = `
  ${head(`<bdi>#${escHtml(data.reportId)}</bdi> | ${escHtml(data.companyName)}`)}
  <div class="rule-grad"></div>
  <div class="body page-body--exec page-body--distributed">
    <div class="page-intro">
      <span class="eyebrow">02 | ${T('תקציר מנהלים', 'Executive summary')}</span>
      <h2>${T('תקציר מנהלים', 'Executive summary')}</h2>
      ${sovHtml}
      <p class="sub">${summary}</p>
      ${moatCallout}
    </div>
    <div class="page-stack">
      <section class="page-section page-section--kpi">
        <div class="kgrid">
          <div class="kcard"><div class="kv hl">${f.money(data.equity)}</div><div class="kl">${T('שווי לבעלים (בסיס)', 'Equity value (base)')}</div></div>
          <div class="kcard"><div class="kv">${f.money(data.enterpriseValue)}</div><div class="kl">${T('שווי פעילות (EV)', 'Enterprise value (EV)')}</div></div>
          <div class="kcard"><div class="kv">${f.pct(data.waccPct)}</div><div class="kl">${T('WACC אפקטיבי', 'Effective WACC')}</div></div>
          <div class="kcard"><div class="kv gd">${f.int(data.qualityScore)} / ${escHtml(data.qualityGrade)}</div><div class="kl">Quality Score</div></div>
        </div>
      </section>
      <section class="page-section page-section--waterfall">
        <div class="box">
          <h3>${T('משווי פעילות (EV) לשווי לבעלים', 'From enterprise value (EV) to equity value')}</h3>
          <div class="wf-row"><span class="lbl">${T('שווי פעילות', 'Enterprise value')}</span><div class="wf-track"><div class="wf-fill" style="inset-inline-start:0;width:100%;background:linear-gradient(90deg,#4DD6CE,#00A89F)"></div></div><b>${f.money(data.enterpriseValue)}</b></div>
          <div class="wf-row"><span class="lbl">${netDebtRow.label}</span><div class="wf-track"><div class="wf-fill" style="inset-inline-end:0;width:${wf.debtPct.toFixed(1)}%;background:linear-gradient(90deg,#F0ADAD,#C24A4A)"></div></div>${netDebtRow.valueHtml}</div>
          ${data.nonOperatingAssets ? `<div class="wf-row"><span class="lbl">${T('נכסים שלא בפעילות (הערכה)', 'Non-operating assets (estimated)')}</span><div class="wf-track"><div class="wf-fill" style="inset-inline-start:0;width:${wf.nonOperatingPct.toFixed(1)}%;background:linear-gradient(90deg,#E8D9A8,#C9A84C)"></div></div><b>${f.money(data.nonOperatingAssets.value)}</b></div>` : ''}
          <div class="wf-row"><span class="lbl"><b style="color:var(--pine);font-family:'Assistant'">${T('שווי לבעלים', 'Equity value')}</b></span><div class="wf-track"><div class="wf-fill" style="inset-inline-start:0;width:${wf.equityPct.toFixed(1)}%;background:linear-gradient(90deg,#00A89F,#163530)"></div></div><b style="color:var(--turq)">${f.money(data.equity)}</b></div>
          ${data.creditChapter ? `<p class="note credit-summary-line" style="margin:2mm 0 0">${escHtml(data.creditChapter.summaryLineHe)}</p>` : ''}
        </div>
      </section>
      <section class="page-section page-section--blend">
        <table class="report-table report-table--blend">
          ${reportColgroup([...BLEND_TABLE_WIDTHS])}
          <tr><th>${T('מודל', 'Method')}</th><th>${T('שווי פעילות', 'Enterprise value')}</th><th>${T('משקל', 'Weight')}</th><th>${T('תרומה', 'Contribution')}</th></tr>
          ${blendRows}
          <tr class="sum"><td>${T('שווי פעילות משולב', 'Blended enterprise value')}</td><td class="n"></td><td class="n">${f.pct(100, 0)}</td><td class="n">${f.money(data.enterpriseValue)}</td></tr>
        </table>
        ${methodologyNoteHtml}
        ${normalizedEbitdaHtml}
        <p class="note">${T(`הערכה זו בוצעה בתאריך ${escHtml(noteDate)} על בסיס נתונים שהוזנו על ידי המשתמש ותחזיות הנהלה. הסכומים בדוח מעוגלים, ולכן סכום של שורות עשוי להיות שונה מהסך בעיגול.`, `This indication was produced on ${escHtml(data.locale === 'en' ? reportDateEn(data.valuationDate) : noteDate)} from data entered by the user and management forecasts. It is an algorithmic indication, not a valuation opinion. Amounts are rounded, so rows may not add up exactly to the total.`)}</p>
      </section>
    </div>
  </div>`;
  return wrapSheet(2, '', body, data.locale);
}

function buildPage3Financials(data: ValuationData): string {
  const f = pdfFmt(data);
  const cols = data.trajectory.map((t) => `<th>${escHtml(t.label)}</th>`).join('');
  // Round 5: one number format for both rows (it was 1 decimal for revenue and 2 for EBITDA).
  const maxAbs = Math.max(0, ...data.trajectory.map((t) => Math.max(Math.abs(t.revenueM), Math.abs(t.ebitdaM))));
  const dec = maxAbs >= 100 ? 1 : 2;
  const revRow = data.trajectory.map((t) => `<td class="n">${f.fixed(t.revenueM, dec)}</td>`).join('');
  const ebtRow = data.trajectory.map((t) => `<td class="n">${f.fixed(t.ebitdaM, dec)}</td>`).join('');
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
  ${head(`<bdi>#${escHtml(data.reportId)}</bdi> | ${escHtml(data.companyName)}`)}
  <div class="rule-grad"></div>
  <div class="body">
    <span class="eyebrow">03 | נתונים פיננסיים</span>
    <h2>נתונים פיננסיים</h2>
    <p class="sub">${escHtml(data.dcfEbitdaWeights ? financialDataCopy(data.dcfEbitdaWeights) : FINANCIAL_DATA_COPY)}</p>
    <div class="box"><h3>הכנסות מול EBITDA (${unitLabel})</h3>${buildEquifyFinancialBarChartSvg(data.trajectory)}</div>
    <table class="report-table report-table--trajectory">
      ${reportColgroup(trajectoryTableWidths(data.trajectory.length))}
      <tr><th>${unitLabel}</th>${cols}</tr><tr><td>הכנסות</td>${revRow}</tr><tr><td>EBITDA</td>${ebtRow}</tr><tr class="sum"><td>שיעור EBITDA</td>${marginRow}</tr>
    </table>
    <p class="note">CAGR ${f.pct(data.growthPct, 0)}, שיעור EBITDA ${f.pct(currentMarginPct)}. ${data.netDebtNote ? escHtml(data.netDebtNote) : `חוב נטו: ${f.money(data.netDebt)}.`}</p>
  </div>`;
  return wrapSheet(3, '', body, data.locale);
}

function buildPage4Dcf(data: ValuationData): string {
  const f = pdfFmt(data);
  const T = tr(data);
  const swatch = (color?: string) =>
    color
      ? `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${color};margin-inline-end:6px"></span>`
      : '';
  const waccRows = data.waccTable
    ? data.waccTable
        .map((r) => {
          if (r.kind === 'sub') {
            return `<tr><td style="padding-inline-start:14px;font-size:8.5px;color:var(--dim)">└ ${escHtml(r.label)}</td><td class="n" style="font-size:8.5px">${f.pct(r.pct)}</td></tr>`;
          }
          if (r.kind === 'subtotal') {
            return `<tr><td><b>${escHtml(r.label)}</b></td><td class="n"><b>${f.pct(r.pct)}</b></td></tr>`;
          }
          return `<tr><td>${swatch(r.color)}${escHtml(r.label)}</td><td class="n">${f.pct(r.pct)}</td></tr>`;
        })
        .join('')
    : data.waccSegments
        .flatMap((s) => {
          const main = `<tr><td>${swatch(s.color)}${escHtml(s.label)}</td><td class="n">${f.pct(s.pct)}</td></tr>`;
          const subs = (s.subRows ?? []).map(
            (sub) =>
              `<tr><td style="padding-inline-start:14px;font-size:8.5px;color:var(--dim)">└ ${escHtml(sub.label)}</td><td class="n" style="font-size:8.5px">${f.pct(sub.pct)}</td></tr>`,
          );
          return [main, ...subs];
        })
        .join('');
  const waccNoteHtml = data.waccNote ? `<p class="note wacc-note">${escHtml(data.waccNote)}</p>` : '';
  const dcfCols = data.dcfRows.map((r) => `<th>${escHtml(r.label)}</th>`).join('');
  const fcffRow = data.dcfRows.map((r) => `<td class="n">${f.fixed(r.fcffM, 2)}</td>`).join('');
  const dfRow = data.dcfRows.map((r) => `<td class="n">${f.fixed(r.discountFactor, 3)}</td>`).join('');
  const pvRow = data.dcfRows.map((r) => `<td class="n">${f.fixed(r.pvM, 2)}</td>`).join('');
  const unitLabel = f.unitLabel;

  const body = `
  ${head(`<bdi>#${escHtml(data.reportId)}</bdi> | ${escHtml(data.companyName)}`)}
  <div class="rule-grad"></div>
  <div class="body page-body--dcf page-body--distributed">
    <div class="page-intro">
      <span class="eyebrow">04 | ${T('היוון תזרימי מזומנים', 'Discounted cash flow')}</span>
      <h2>DCF + WACC</h2>
      <p class="sub">${escHtml(T(WACC_DCF_METHODOLOGY_COPY, WACC_DCF_METHODOLOGY_COPY_EN))}</p>
    </div>
    <div class="page-stack">
      <section class="page-section page-section--wacc">
        <div class="dcf-wacc-layout">
          <div class="dcf-wacc-side"><div class="box box-chart-visible"><h3>${T('הרכב WACC', 'WACC build-up')}</h3>${buildEquifyWaccDonutSvg(data.waccSegments, data.waccPct)}</div>${(data.privateLayerLines ?? []).map((l) => `<p class="note wacc-note private-layer-line">${escHtml(l)}</p>`).join('')}</div>
          <div class="dcf-wacc-table-wrap">
            <table class="report-table report-table--wacc">
              ${reportColgroup([...WACC_TABLE_WIDTHS])}
              <tr><th>${T('רכיב', 'Component')}</th><th>${T('שיעור', 'Rate')}</th></tr>${waccRows}<tr class="sum"><td>${T('WACC אפקטיבי', 'Effective WACC')}</td><td class="n">${f.pct(data.waccPct)}</td></tr>
            </table>
            ${waccNoteHtml}
          </div>
        </div>
      </section>
      <section class="page-section page-section--horizon">
        <table class="report-table report-table--dcf">
          ${reportColgroup(dcfHorizonTableWidths(data.dcfRows.length))}
          <tr><th>${unitLabel}</th>${dcfCols}<th>${T('טרמינלי', 'Terminal')}</th></tr>
          <tr><td>${T('FCFF חזוי', 'Forecast FCFF')}</td>${fcffRow}<td class="n">${data.dcfRows.at(-1) ? f.fixed(data.dcfRows.at(-1)!.fcffM, 2) : ''}</td></tr>
          <tr><td>${T('פקטור היוון (אמצע שנה)', 'Discount factor (mid-year)')}</td>${dfRow}<td class="n"></td></tr>
          <tr><td>${T('שווי נוכחי', 'Present value')}</td>${pvRow}<td class="n">${f.fixed(data.terminalPvM, 2)}*</td></tr>
          <tr class="sum"><td>${data.dcfMarketableEv != null ? T('שווי DCF לפני הנחת סחירות', 'DCF value before the marketability discount') : T('שווי פעילות לפי DCF', 'Enterprise value by DCF')}</td>${emptyCells(data.dcfRows.length)}<td class="n">${f.money(data.dcfMarketableEv ?? data.dcfEv)}</td></tr>
        </table>
        <p class="note">${T(`* ערך טרמינלי מהווה ${f.pct(data.terminalSharePct, 0)} מסך שווי ה DCF.`, `* The terminal value is ${f.pct(data.terminalSharePct, 0)} of the total DCF value.`)}${data.dcfNote ? ` ${escHtml(data.dcfNote)}` : ''}</p>
      </section>
    </div>
  </div>`;
  return wrapSheet(4, '', body, data.locale);
}

function multiplesInterpretation(data: ValuationData): string {
  const f = pdfFmt(data);
  const T = tr(data);
  const ebitdaInterp = escHtml(
    ebitdaMultipleInterpretationCopy({
      locale: data.locale,
      effectiveMult: data.effectiveMult,
      qualityScore: data.qualityScore,
      qualityGrade: data.qualityGrade,
      multipleConcentrationPenalty: data.multipleConcentrationPenalty,
    }),
  );
  const im = data.industryMultiples;
  if (!im) {
    // No sourced industry data: show the company multiples only (finding 7).
    return `<tr><td>${T('מכפיל EBITDA', 'EBITDA multiple')}</td><td class="n">${f.multiple(data.effectiveMult)}</td><td class="n">${T('אין נתון', 'n/a')}</td><td class="interp-cell">${ebitdaInterp}</td></tr>
    <tr><td>${T('מכפיל הכנסות', 'Revenue multiple')}</td><td class="n">${f.multiple(data.revenueMultiple)}</td><td class="n">${T('אין נתון', 'n/a')}</td><td class="interp-cell">${T('אין נתון ענפי עם מקור', 'No sourced sector data')}</td></tr>`;
  }
  // Round 4 (part D, display only): the raw Damodaran range is public companies; when the engine
  // applies private company factors, the adjusted range is shown next to it, and the position is
  // stated against both.
  const pf = im.privateFactor;
  const range = (lo: number, hi: number) =>
    data.locale === 'en'
      ? `<span dir="ltr">${f.multiple(lo)} to ${f.multiple(hi)}</span>${pf ? `<br><span dir="ltr" class="private-range" style="font-size:8.5px;color:var(--dim);white-space:nowrap">Private company: ${f.multiple(lo * pf)} to ${f.multiple(hi * pf)}</span>` : ''}`
      : `<span dir="rtl">${f.multiple(lo)} עד ${f.multiple(hi)}</span>${pf ? `<br><span dir="rtl" class="private-range" style="font-size:8.5px;color:var(--dim);white-space:nowrap">חברה פרטית: ${f.multiple(lo * pf)} עד ${f.multiple(hi * pf)}</span>` : ''}`;
  const en = data.locale === 'en';
  const where = (v: number, lo: number, hi: number, of: string) =>
    en
      ? v < lo ? `below the range ${of}` : v > hi ? `above the range ${of}` : `within the range ${of}`
      : v < lo ? `מתחת לטווח ${of}` : v > hi ? `מעל הטווח ${of}` : `בתוך הטווח ${of}`;
  const position = (v: number, lo: number, hi: number) =>
    pf
      ? en
        ? `${where(v, lo, hi, 'of public companies')}, and ${where(v, lo * pf, hi * pf, 'after the private company adjustments')}`
        : `${where(v, lo, hi, 'של חברות ציבוריות')}, ו${where(v, lo * pf, hi * pf, 'אחרי התאמות לחברה פרטית')}`
      : where(v, lo, hi, en ? 'of public companies' : 'של חברות ציבוריות');
  const revLabel = im.revenueMultipleKind === 'leg' ? T('מכפיל הכנסות', 'Revenue multiple') : T('EV/Sales משתמע', 'Implied EV/Sales');
  const revInterp =
    im.revenueMultipleKind === 'leg'
      ? T(`מכפיל ההכנסות שבשימוש בשווי, ${position(im.companyRevenueMultiple, im.evSalesLow, im.evSalesHigh)}.`, `The revenue multiple used in the value, ${position(im.companyRevenueMultiple, im.evSalesLow, im.evSalesHigh)}.`)
      : T(`שווי הפעילות חלקי ההכנסות. לא נכנס לשווי, ${position(im.companyRevenueMultiple, im.evSalesLow, im.evSalesHigh)}.`, `Enterprise value divided by revenue. Not part of the value, ${position(im.companyRevenueMultiple, im.evSalesLow, im.evSalesHigh)}.`);
  return `<tr><td>${T('מכפיל EBITDA', 'EBITDA multiple')}</td><td class="n">${f.multiple(data.effectiveMult)}</td><td class="n">${range(im.evEbitdaLow, im.evEbitdaHigh)}</td><td class="interp-cell">${ebitdaInterp}</td></tr>
    <tr><td>${revLabel}</td><td class="n">${f.multiple(im.companyRevenueMultiple)}</td><td class="n">${range(im.evSalesLow, im.evSalesHigh)}</td><td class="interp-cell">${escHtml(revInterp)}</td></tr>`;
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
    <tr><th>#</th><th>${tr(data)('עסקה', 'Transaction')}</th><th>${tr(data)('שנה', 'Year')}</th><th>${evHeader}</th><th>EV/EBITDA</th><th>EV/Rev</th><th>EBITDA%</th><th>${tr(data)('הערה', 'Note')}</th></tr>${rows}</table>`;
}

function buildPage5Multiples(data: ValuationData): string {
  const compsTable = buildCompsTable(data);
  const T = tr(data);
  const sectorName = data.sectorLabel || data.sector || T('הרלוונטי', 'concerned');
  const body = `
  ${head(`<bdi>#${escHtml(data.reportId)}</bdi> | ${escHtml(data.companyName)}`)}
  <div class="rule-grad"></div>
  <div class="body page-body--multiples page-body--distributed">
    <div class="page-intro">
      <span class="eyebrow">05 | ${T('מכפילי שוק', 'Market multiples')}</span>
      <h2>${T('מיקום מול מכפילי הענף', 'Position against sector multiples')}</h2>
      <p class="sub">${escHtml(data.multiplesIntro ?? (data.locale === 'en' ? multiplesMethodologyCopyEn(sectorName) : multiplesMethodologyCopy(`בענף ${sectorName}`)))}</p>
    </div>
    <div class="page-stack">
      <section class="page-section page-section--tracks">
        <div class="box box-chart-visible">
          <h3>${T('מיקום מול מכפילי חברות ציבוריות (Damodaran)', 'Position against public company multiples (Damodaran)')}</h3>
          <div class="multiples-tracks-chart">${buildEquifyMultiplesTracksSvg(data.multiplesPositions, data.currency, data.locale === 'en' ? 'en' : 'he')}</div>
        </div>
      </section>
      ${compsTable ? `<section class="page-section page-section--comps">${compsTable}</section>` : ''}
      <section class="page-section page-section--compare">
        <table class="report-table report-table--multiples multiples-compare-table">
          ${reportColgroup([...MULTIPLES_COMPARE_WIDTHS])}
          <tr><th>${T('פרמטר', 'Measure')}</th><th>${T('החברה', 'Company')}</th><th>${data.industryMultiples ? T('חברות ציבוריות (Damodaran)', 'Public companies (Damodaran)') : T('הענף (Damodaran)', 'Sector (Damodaran)')}</th><th>${T('פרשנות', 'Reading')}</th></tr>${multiplesInterpretation(data)}
        </table>
        ${data.industryMultiples ? `<p class="note sens-note">${escHtml(data.industryMultiples.footnote)}</p>` : ''}
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
        scenarioLabel(s.key, data.locale);
      const tag = s.description ?? s.narrative;
      const full = s.fullDescription;
      if (!tag && !full) return '';
      return `<div class="narrative-block">
        <div class="narrative-title">${escHtml(label)}${tag ? `: ${escHtml(tag)}` : ''}</div>
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
        scenarioLabel(s.key, data.locale);
      const nameCell = s.key === 'base' ? `<td><b>${label}</b></td>` : `<td>${label}</td>`;
      const rowStyle = s.key === 'base' ? ' style="background:var(--tint)"' : '';
      return `<tr${rowStyle}>${nameCell}<td class="n">${f.pct(s.growthPct, 0)}</td><td class="n">${f.pct(s.ebitdaMarginPct)}</td><td class="n">${f.pct(s.waccPct)}</td><td class="n">${f.mult(s.multiple)}</td><td class="n">${f.money(s.ev)}</td><td class="n"${scenarioEquityStyle(s.key)}>${f.money(s.equity)}</td></tr>`;
    })
    .join('');

  const body = `
  ${head(`<bdi>#${escHtml(data.reportId)}</bdi> | ${escHtml(data.companyName)}`)}
  <div class="rule-grad"></div>
  <div class="body">
    <span class="eyebrow">${en ? '06 | Scenarios' : '06 | תרחישים'}</span>
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
      ? `Sensitivity: equity value (${f.unitLabel}), WACC × terminal growth`
      : `רגישות: שווי לבעלים (${f.unitLabel}), WACC × צמיחה טרמינלית`;
  const revenueKind = data.sensitivityEbitdaMult?.multipleKind === 'revenue';
  const ebitdaSensHeader =
    data.locale === 'en'
      ? `Sensitivity: equity value (${f.unitLabel}), EBITDA × ${revenueKind ? 'revenue multiple' : 'EBITDA multiple'}`
      : `רגישות: שווי לבעלים (${f.unitLabel}), EBITDA × ${revenueKind ? 'מכפיל הכנסות' : 'מכפיל EBITDA'}`;
  const sensNote = (note?: string) => (note ? `<p class="note sens-note">${escHtml(note)}</p>` : '');

  const body = `
  ${head(`<bdi>#${escHtml(data.reportId)}</bdi> | ${escHtml(data.companyName)}`)}
  <div class="rule-grad"></div>
    <div class="body page-body--quality">
    <span class="eyebrow">${en ? '07 | Quality & sensitivity' : '07 | איכות ורגישות'}</span>
    <h2>${en ? 'Quality Score & sensitivity analysis' : 'Quality Score וניתוח רגישות'}</h2>
    <p class="sub">${escHtml(qualityIntro)}</p>
    <div class="quality-split">
      <div class="box" style="text-align:center;margin-top:0">${buildEquifyQualityGaugeSvg(data.qualityScore, data.qualityGrade)}</div>
      <table class="report-table report-table--quality" style="margin-top:0">
        ${reportColgroup([...QUALITY_FACTOR_WIDTHS])}
        <tr><th>${en ? 'Quality factor' : 'גורם איכות'}</th><th>${en ? 'Finding' : 'ממצא'}</th><th>${en ? 'Score' : 'ציון'}</th></tr>${factorRows}</table>
    </div>
    ${sensGrowth ? `<p class="sub quality-sens-intro">${escHtml(sensitivityIntro)}</p><div class="box"><h3>${sensHeader}</h3>${sensGrowth}${sensNote(sensGrowthMatrix?.note)}</div>` : ''}
    ${sensEbitda ? `<div class="box"><h3>${ebitdaSensHeader}</h3>${sensEbitda}${sensNote(data.sensitivityEbitdaMult?.note)}</div>` : ''}
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
      // Weight segments only: the backlog uplift row is an addition, not a weight.
      if (r.weightPct <= 0 || isBacklogRow(r.name)) return '';
      // Labels of narrow segments do not fit; they are hidden instead of being clipped.
      const label = r.weightPct >= 8 ? `${short} ${weightPctHtml(f, r.weightPct)}` : '';
      return `<div class="blend-weight-bar" style="width:${r.weightPct.toFixed(1)}%;background:${bg};display:grid;place-items:center;color:${fg}">${label}</div>`;
    })
    .join('');
}

/** Round 7 (OPUS_NARRATIVE): conclusions and "על מה השווי נשען" on page 8. Empty without a narrative. */
function narrativeBlocksHtml(data: ValuationData): string {
  const n = data.opusNarrative;
  if (!n) return '';
  const lines = n.conclusions.map((c) => `<li>${escHtml(c)}</li>`).join('');
  const drivers = n.drivers.map((d) => `<li><b>${escHtml(d.title)}:</b> ${escHtml(d.text)}</li>`).join('');
  return `<div class="box narrative-box" style="text-align:right;margin-top:6mm"><h3>מסקנות</h3><ul class="narrative-list" style="margin:0 0 2mm;padding-inline-start:5mm">${lines}</ul><h3>על מה השווי נשען</h3><ul class="narrative-list" style="margin:0;padding-inline-start:5mm">${drivers}</ul></div>`;
}

function buildPage8Combined(data: ValuationData): string {
  const f = pdfFmt(data);
  const dateLabel = data.valuationDateShort ?? reportDateShortHe(data.valuationDate);
  const body = `
  ${head(`<bdi>#${escHtml(data.reportId)}</bdi> | ${escHtml(data.companyName)}`)}
  <div class="rule-grad"></div>
  <div class="body" style="text-align:center;display:flex;flex-direction:column;justify-content:center">
    <span class="eyebrow" style="justify-content:center">08 | שווי משולב</span>
    <h2>שווי משולב</h2>
    <div style="display:flex;height:13mm;border-radius:8px;overflow:hidden;border:1px solid var(--line);margin:5mm auto 0;max-width:150mm;width:100%">${blendWeightBar(data)}</div>
    <div class="c-val" style="margin:10mm 0 2mm">${equityTriCurrencyCoverHtml(data)}</div>
    <div class="c-cap">שווי לבעלים, תרחיש בסיס, טווח ${f.money(data.bearEquity)} עד ${f.money(data.bullEquity)}, נכון ליום ${escHtml(dateLabel)}</div>
    <div class="seal" style="margin:9mm auto 0"><i></i>ALGORITHMIC EQUITY INDICATION | SBC METHOD</div>
    ${narrativeBlocksHtml(data)}
    <p class="note" style="text-align:right;margin-top:8mm"><b>גילוי נאות:</b> ${escHtml(data.disclaimer ?? defaultDisclaimer())}</p>
  </div>`;
  return wrapSheet(8, '', body, data.locale);
}

const LIEN_TYPE_HE: Record<string, string> = {
  floating: 'שעבוד שוטף',
  all_assets: 'שעבוד על כל הרכוש',
  specific: 'שעבוד ספציפי',
};

/**
 * Round 4 (CREDIT_CHAPTER): "כושר האשראי של העסק", after the financial data (page 4 of 9).
 * Same style as the other pages. Every amount is a whole amount and the tables add up exactly
 * (checkCreditChapterConsistency blocks the page otherwise).
 */
function buildCreditChapterPage(data: ValuationData): string {
  const c = data.creditChapter!;
  const amt = (v: number) => numHtml(formatCreditAmount(v, c.currency));
  const minus = (v: number) => (v > 0 ? numHtml(formatCreditAmount(-v, c.currency)) : amt(0));
  const pct = (v: number, d = 2) => numHtml(`${v.toFixed(d)}%`);
  const ratio = (v: number) => numHtml(v.toFixed(2));
  // Round 14: a sector value still waiting for Orly's approval gets "*" and the line "* הערכת SBC" (pendingApproval: new text).
  const est = (f: string) => (c.pendingOrly?.includes(f as never) ? '*' : '');
  const anyEst = (c.pendingOrly?.length ?? 0) > 0;
  const capexOnly = c.cfadsDefinition === 'capex_only';
  const termLabel = `${c.termYears} שנה${est('termYears')}, ריבית ${c.ratePct.toFixed(2)}%${c.discounting === 'monthly' ? ', היוון חודשי' : ''}`;

  const blocker = c.blocker.active
    ? `<div class="callout red credit-blocker"><b>נדרש אישור הבנק הקיים לפני כל מימון חדש.</b> לעסק יש ${escHtml(LIEN_TYPE_HE[c.liens.type ?? ''] ?? 'שעבוד')} לטובת בנק, ולכן כל מימון חדש מחייב את הסכמתו.</div>`
    : '';

  const numbers =
    c.status === 'no_capacity'
      ? `<div class="callout credit-explanation">${escHtml(c.explanationHe ?? '')}</div>`
      : `
    <table class="report-table report-table--credit">
      <tr><th>תזרים לשירות חוב</th><th>היום (${escHtml(c.today.label)})</th><th>בשיא (${escHtml(c.peak.label)})</th></tr>
      <tr><td>EBITDA מנורמל</td><td class="n">${amt(c.today.ebitda)}</td><td class="n">${amt(c.peak.ebitda)}</td></tr>
      ${capexOnly ? '' : `<tr><td>מס</td><td class="n">${minus(c.today.tax)}</td><td class="n">${minus(c.peak.tax)}</td></tr>`}
      <tr><td>השקעות שוטפות</td><td class="n">${minus(c.today.maintenanceCapex)}</td><td class="n">${minus(c.peak.maintenanceCapex)}</td></tr>
      <tr class="sum"><td>תזרים לשירות חוב (CFADS)</td><td class="n">${amt(c.today.cfads)}</td><td class="n">${amt(c.peak.cfads)}</td></tr>
      <tr><td>כושר החזר (${escHtml(termLabel)})</td><td class="n">${amt(c.today.capacity)}</td><td class="n">${amt(c.peak.capacity)}</td></tr>
    </table>
    ${
      c.status === 'no_room'
        ? `<div class="callout credit-explanation">${escHtml(c.explanationHe ?? '')}</div>`
        : `<table class="report-table report-table--credit">
      <tr><th>שלב ראשון (לפי התזרים של היום)</th><th>סכום</th></tr>
      <tr><td>תקרה לפי ענף (${pct(c.ceilingPct * 100, 0)}${est('ceilingPctOfCapacity')} מכושר ההחזר)</td><td class="n">${amt(c.ceiling)}</td></tr>
      <tr class="sum"><td>שלב ראשון מוצע</td><td class="n">${amt(c.firstStage)}</td></tr>
      <tr><td>החזר חודשי על השלב הראשון</td><td class="n">${amt(c.firstStageMonthly)}</td></tr>
      <tr><td>החזר שנתי על השלב הראשון</td><td class="n">${amt(c.firstStageAnnual)}</td></tr>
      <tr><td>החזר שנתי על ההלוואות הקיימות</td><td class="n">${amt(c.existingAnnual)}</td></tr>
      <tr class="sum"><td>סך ההחזר השנתי</td><td class="n">${amt(c.totalAnnual)}</td></tr>
      <tr><td>יחס כיסוי (רף הענף ${ratio(c.minDscr)}${est('minDscr')})</td><td class="n">${c.dscr != null ? ratio(c.dscr) : ''}</td></tr>
    </table>`
    }`;

  const ownerBox =
    c.ownerLoans > 0
      ? `<div class="box tint credit-owner-loans"><h3>הלוואות בעלים</h3><p style="margin:0 0 2mm">הלוואות בעלים של ${amt(c.ownerLoans)} נחשבות היום חלק מהחוב. אם הבעלים חותמים על כתב נחיתות, כלומר מתחייבים לא לקבל אותן בחזרה לפני שהמימון החדש נפרע, גוף מממן יכול לראות בהן הון.</p>
      <table class="report-table report-table--credit"><tr><td>חוב נטו עם הלוואות הבעלים</td><td class="n">${amt(c.netDebtWithOwnerLoans)}</td></tr><tr><td>חוב נטו בלעדיהן (בהנחת כתב נחיתות)</td><td class="n">${amt(c.netDebtWithoutOwnerLoans)}</td></tr></table></div>`
      : '';

  const debtLine = `<p class="note">החוב היום: חוב ברוטו של ${amt(c.grossDebt)} ומזומן של ${amt(c.cash)}. טווח ריבית סביר לענף: ${pct(c.rateRangePct[0])} עד ${pct(c.rateRangePct[1])}${est('spreadOverPrimePp')} (פריים ${pct(c.primeRatePct)} ועוד מרווח הענף). זה טווח להערכה בלבד, והריבית בפועל נקבעת על ידי הגוף המממן.</p>`;

  const cta = `<div class="callout gold credit-cta"><b>רוצים שנבדוק את זה מול כ 40 גופים מממנים?</b> ב SBC אנחנו מלווים עסקים בייעוץ מימון: בונים את בקשת האשראי, מתאימים את מבנה המימון לעסק ומציגים אותו לגופים המממנים המתאימים. הבדיקה לא מבטיחה אישור, סכום או ריבית. <a href="${escHtml(SBC_SITE_URL)}" style="color:var(--pine);font-weight:700">${escHtml(SBC_SITE_URL.replace(/^https?:\/\//, ''))}</a></div>`;

  const body = `
  ${head(`<bdi>#${escHtml(data.reportId)}</bdi> | ${escHtml(data.companyName)}`)}
  <div class="rule-grad"></div>
  <div class="body credit-chapter">
    <span class="eyebrow">04 | כושר האשראי של העסק</span>
    <h2>כושר האשראי של העסק</h2>
    <p class="sub">כמה אשראי העסק יכול לשאת לפי התזרים שלו, בשיטת תקן SBC לבקשות אשראי. כושר החזר הוא הסכום שהתזרים לשירות חוב של היום מחזיר על פני תקופת ההלוואה המקובלת בענף. שלב ראשון הוא סכום שמרני: בתוך התקרה של הענף, ובלי שיחס הכיסוי ירד מהרף שלו.</p>
    ${blocker}
    ${numbers}
    ${debtLine}
    ${ownerBox}
    ${cta}
    <p class="note sens-note">${escHtml(c.sourcesHe)} החישוב הוא אינדיקציה ולא התחייבות למימון.${anyEst ? ' * הערכת SBC, ממתינה לאישור.' : ''}</p>
  </div>`;
  return wrapSheet(4, '', body, data.locale);
}

/** Pages after the credit chapter move by one; the total becomes 9. */
function renumberPage(html: string, newPage: number | null, total: number): string {
  let out = html.replace(/(<span class="foot-r foot-pg">(?:עמוד|Page) <b>)(\d+)(<\/b> \/ )(\d+)/, (_m, a, p, b) => `${a}${newPage ?? p}${b}${total}`);
  if (newPage != null) {
    out = out.replace(/(<span class="eyebrow"[^>]*>(?:[^<]*?))(\d{2})( \| )/, (_m, a, _n, b) => `${a}${String(newPage).padStart(2, '0')}${b}`);
  }
  return out;
}

export function equifyPdfPageCount(data: Pick<ValuationData, 'creditChapter'>): number {
  return TOTAL_PAGES + (data.creditChapter ? 1 : 0);
}

export function buildEquifyPdfPages(data: ValuationData): string {
  const pages = [
    buildPage1Cover(data),
    buildPage2ExecSummary(data),
    buildPage3Financials(data),
    buildPage4Dcf(data),
    buildPage5Multiples(data),
    buildPage6Scenarios(data),
    buildPage7QualitySensitivity(data),
    buildPage8Combined(data),
  ];
  if (!data.creditChapter) return pages.join('\n');
  // Round 4: the credit chapter goes after the financial data; the pages after it move by one.
  const total = equifyPdfPageCount(data);
  return [
    ...pages.slice(0, 3).map((p) => renumberPage(p, null, total)),
    renumberPage(buildCreditChapterPage(data), 4, total),
    ...pages.slice(3).map((p, i) => renumberPage(p, i + 5, total)),
  ].join('\n');
}

export const EQUIFY_PDF_PAGE_COUNT = TOTAL_PAGES;
