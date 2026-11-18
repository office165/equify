/**
 * Round 4: CREDIT_CHAPTER (wizard questions, non-operating assets, credit chapter).
 *
 * The suite turns the flag on and off itself (process.env.CREDIT_CHAPTER) and restores it.
 *   wizard-flag-off / wizard-flag-on: step 2 of the wizard (server render) has the four credit
 *     questions only with the flag on.
 *   flag-off-no-effect: a state with every credit answer filled gives exactly the same report data
 *     as the same state without them when the flag is off.
 *   flag-on-no-answers: with the flag on and no answers, nothing moves either.
 *   non-operating: with the flag on, a holding adds exactly its value to the equity (base, bear,
 *     bull), EV does not move, the bridge row says "הערכה", and the profit basis uses the industry
 *     multiple after marketability.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WizardValuationProvider } from '../../components/wizard/equify/WizardValuationContext';
import { Step2Financials } from '../../components/wizard/equify/steps/Step2Financials';
import { ValuationI18nProvider } from '../../valuation_i18n';
import { mapWizardToValuationData } from '../../lib/pdf-template/map-from-wizard';
import { buildEquifyPdfPages } from '../../lib/pdf-template/equify-pdf-pages';
import type { ValuationData } from '../../lib/pdf-template/types';
import type { EquifyWizardCredit, EquifyWizardState } from '../../lib/wizard/map_equify_wizard';
import { buildAllCases } from '../lib/cases';
import { buildWizardState, type CaseSpec } from '../lib/fixtures';
import { Suite, type SuiteResult } from '../lib/harness';
import { withQuietConsole } from '../lib/quiet';
import { TEST_FX } from '../lib/run_case';
import { checkCreditChapterConsistency, formatCreditAmount } from '../../lib/credit/credit_chapter';
import { computeValuation } from '../../lib/valuation';
import { resolveMethodVersion } from '../../lib/valuation/method_v2';
import { buildValuationInputsFromEquifyState } from '../../lib/wizard/build_valuation_inputs';
import { syncFinancialsDerived } from '../../lib/wizard/financial_history';
import { reportPageCount } from '../../lib/pdf-template';
import { CREDIT_FULL_CASE_ID, caseCredit } from '../pdf/pdf_harness';
import { caseStateFor, evaluateCase, validateCase } from '../../scripts/calibration/run';

export const FULL_CREDIT: EquifyWizardCredit = {
  monthlyDebtServiceK: 45,
  ownerLoans: { has: true, amountK: 800 },
  liens: { has: true, holder: 'bank', type: 'floating' },
  nonOperating: { has: true, holdingPct: 75, preTaxProfitK: 900, estimatedValueK: 0 },
};

export function withCreditFlag<T>(on: boolean, fn: () => T): T {
  const prev = process.env.CREDIT_CHAPTER;
  const prevPublic = process.env.NEXT_PUBLIC_CREDIT_CHAPTER;
  process.env.CREDIT_CHAPTER = on ? 'on' : 'off';
  delete process.env.NEXT_PUBLIC_CREDIT_CHAPTER;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env.CREDIT_CHAPTER;
    else process.env.CREDIT_CHAPTER = prev;
    if (prevPublic !== undefined) process.env.NEXT_PUBLIC_CREDIT_CHAPTER = prevPublic;
  }
}

export function reportData(state: EquifyWizardState, id: string): ValuationData {
  return withQuietConsole(() => mapWizardToValuationData(state, `TEST-${id}`, 'he', TEST_FX));
}

function step2Markup(): string {
  // React warns that useLayoutEffect does nothing on the server; expected in a server render.
  const err = console.error;
  console.error = () => {};
  try {
    return step2MarkupInner();
  } finally {
    console.error = err;
  }
}

function step2MarkupInner(): string {
  return withQuietConsole(() =>
    renderToStaticMarkup(
      React.createElement(
        ValuationI18nProvider,
        null,
        React.createElement(WizardValuationProvider, null, React.createElement(Step2Financials, { onBack: () => {}, onNext: () => {} })),
      ),
    ),
  );
}

/** Report data without the fields that legitimately differ between two renders (dates). */
function comparable(d: ValuationData): string {
  const { valuationDate: _a, valuationDateShort: _b, ...rest } = d;
  return JSON.stringify(rest);
}

function sample(cases: CaseSpec[], every: number): CaseSpec[] {
  return cases.filter((_, i) => i % every === 0);
}

export function run(): SuiteResult {
  const s = new Suite('round4');
  const cases = buildAllCases();

  // Wizard, step 2 (server render).
  const off = withCreditFlag(false, step2Markup);
  const on = withCreditFlag(true, step2Markup);
  s.check('wizard-flag-off', 'step2', !off.includes('credit-questions') && off.includes('net-debt-banner'), '');
  const questions = ['כמה העסק משלם היום בחודש על הלוואות', 'הלוואות בעלים או חברות קשורות', 'שעבודים קיימים', 'החזקות בחברות אחרות או נכסים שלא בפעילות'];
  s.check('wizard-flag-on', 'step2', on.includes('credit-questions') && questions.every((q) => on.includes(q)), '');

  // Flag off: answers have no effect anywhere in the report data.
  for (const spec of sample(cases, 7)) {
    const base = buildWizardState(spec);
    const a = withCreditFlag(false, () => reportData(base, spec.id));
    const b = withCreditFlag(false, () => reportData({ ...base, credit: FULL_CREDIT }, spec.id));
    s.check('flag-off-no-effect', spec.id, comparable(a) === comparable(b), `equity ${a.equity} vs ${b.equity}`);
    const c = withCreditFlag(true, () => reportData(base, spec.id));
    s.check('flag-on-no-answers', spec.id, a.equity === c.equity && a.enterpriseValue === c.enterpriseValue && a.bearEquity === c.bearEquity && a.bullEquity === c.bullEquity && c.nonOperatingAssets == null, '');
  }

  // Non-operating assets with the flag on.
  for (const spec of sample(cases, 11)) {
    const base = buildWizardState(spec);
    const plain = withCreditFlag(true, () => reportData(base, spec.id));
    for (const [basis, nonOperating] of [
      ['profit', { has: true, holdingPct: 75, preTaxProfitK: 900, estimatedValueK: 0 }],
      ['value', { has: true, holdingPct: 40, preTaxProfitK: 900, estimatedValueK: 5000 }],
    ] as const) {
      const credit: EquifyWizardCredit = { ...FULL_CREDIT, nonOperating: { ...nonOperating } };
      const d = withCreditFlag(true, () => reportData({ ...base, credit }, spec.id));
      const n = d.nonOperatingAssets;
      const v = n?.value ?? NaN;
      const tol = Math.max(1e-6, Math.abs(v) * 1e-9);
      const okEquity = n != null && Math.abs(d.equity - plain.equity - v) <= tol;
      const okEv = d.enterpriseValue === plain.enterpriseValue && d.netDebt === plain.netDebt;
      const okRange = Math.abs(d.bearEquity - plain.bearEquity - v) <= tol && Math.abs(d.bullEquity - plain.bullEquity - v) <= tol;
      const fxTo = spec.currency && spec.currency !== 'ILS' ? TEST_FX.fromIls[spec.currency] ?? 1 : 1;
      const okBasis =
        n != null &&
        n.basis === basis &&
        (basis === 'value'
          ? Math.abs(v - 5000 * 1000 * 0.4) <= 1e-6 * v + 1e-6
          : n.multiple != null && n.multiple > 0 && Math.abs(v - 900 * 1000 * n.multiple * 0.75) <= 1e-6 * v + 1e-6);
      s.check('non-operating', `${spec.id}/${basis}`, okEquity && okEv && okRange && okBasis, `equity +${d.equity - plain.equity} vs ${v}, ev ${d.enterpriseValue} vs ${plain.enterpriseValue}, fx ${fxTo}`);
    }
  }

  // The bridge row in the report (page 2) is marked as an estimate.
  const subsidiarySpec = cases[0];
  const sub = withCreditFlag(true, () => reportData({ ...buildWizardState(subsidiarySpec), credit: FULL_CREDIT }, 'subsidiary'));
  const html = withQuietConsole(() => buildEquifyPdfPages(sub));
  s.check('non-operating', 'bridge-row', html.includes('נכסים שלא בפעילות (הערכה)') && html.includes('ובתוספת נכסים שלא בפעילות'), '');

  creditChapterChecks(s, cases);
  calibrationHoldingCheck(s);
  page5Checks(s, cases);
  if (resolveMethodVersion() === 'v2') findings29And30Checks(s, cases);
  return s.result;
}

function equityOf(spec: CaseSpec, risk: { topCustomer?: number; founderDep?: boolean }, backlogShare?: number): number {
  const state = buildWizardState(spec);
  state.risk = { ...state.risk, ...(risk.topCustomer != null ? { topCustomer: risk.topCustomer } : {}), ...(risk.founderDep != null ? { founderDep: risk.founderDep } : {}) };
  if (backlogShare != null) state.financials = { ...state.financials, backlogSignedK: Math.round(state.financials.y2026.revenueK * backlogShare) };
  state.financials = syncFinancialsDerived(state.financials);
  return withQuietConsole(() => computeValuation(buildValuationInputsFromEquifyState(state, TEST_FX), { silent: true }).equity);
}

/**
 * Part E (methodology 2 only): findings 29 and 30.
 *   v2-top-customer-monotonic: a larger top customer never gives a higher equity (0% to 100% in
 *     steps of 10, with and without a full backlog).
 *   v2-founder-monotonic: founder dependency never gives a higher equity.
 *   v2-80-founder-below-20: 80% customer with founder dependency is below 20% without it, also
 *     with a full backlog (strictly below when the equity is positive).
 */
function findings29And30Checks(s: Suite, cases: CaseSpec[]): void {
  const tops = [0, 10, 20, 30, 40, 50, 55, 60, 70, 80, 90, 100];
  let equalCases = 0;
  for (const spec of cases) {
    for (const backlog of [undefined, 1.0]) {
      const tag = `${spec.id}${backlog ? '/backlog' : ''}`;
      let prev = Infinity;
      let worst = '';
      for (const top of tops) {
        const e = equityOf(spec, { topCustomer: top }, backlog);
        if (e > prev + Math.max(1e-6, Math.abs(prev) * 1e-9)) worst = `top ${top}: ${e.toFixed(1)} > ${prev.toFixed(1)}`;
        prev = e;
      }
      s.check('v2-top-customer-monotonic', tag, worst === '', worst);
      const withF = equityOf(spec, { founderDep: true }, backlog);
      const withoutF = equityOf(spec, { founderDep: false }, backlog);
      s.check('v2-founder-monotonic', tag, withF <= withoutF + Math.max(1e-6, Math.abs(withoutF) * 1e-9), `${withF} > ${withoutF}`);
      const risky = equityOf(spec, { topCustomer: 80, founderDep: true }, backlog);
      const safe = equityOf(spec, { topCustomer: 20, founderDep: false }, backlog);
      const ok = safe > 0 ? risky < safe : risky <= safe;
      if (ok && !(risky < safe)) equalCases += 1;
      s.check('v2-80-founder-below-20', tag, ok, `${risky.toFixed(1)} vs ${safe.toFixed(1)}`);
    }
  }
  s.note(`v2-80-founder-below-20: ${equalCases} case(s) equal at zero equity`);
}

/** Text of the credit chapter page body (without the shared header and footer). */
function chapterBody(html: string): string {
  const start = html.indexOf('<div class="body credit-chapter">');
  if (start < 0) return '';
  const end = html.indexOf('<div class="foot">', start);
  return html.slice(start, end < 0 ? undefined : end);
}

const visibleText = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ');

/**
 * Part C: the chapter.
 *   chapter-flag: no chapter with the flag off (8 pages), a chapter with the flag on and answers (9).
 *   chapter-consistency: every case (with the basic answers of the PDF harness) passes the code
 *     check, and the summary line on page 2 carries the same numbers as the chapter.
 *   chapter-terms: the standard's terms, no synonyms, no "תיווך", no promise, Hebrew writing rules.
 *   chapter-guard: a page whose amounts do not add up is blocked.
 */
function creditChapterChecks(s: Suite, cases: CaseSpec[]): void {
  const spec0 = cases.find((c) => c.id.startsWith('golden-manufacturing')) ?? cases[0];
  const offData = withCreditFlag(false, () => reportData({ ...buildWizardState(spec0), credit: caseCredit(spec0) }, spec0.id));
  const offHtml = withQuietConsole(() => buildEquifyPdfPages(offData));
  s.check('chapter-flag', 'off', offData.creditChapter == null && reportPageCount(offData) === 8 && !offHtml.includes('credit-chapter') && (offHtml.match(/<div class="page[ "]/g) ?? []).length === 8, '');

  let statuses = { ok: 0, no_room: 0, no_capacity: 0 } as Record<string, number>;
  for (const spec of cases) {
    const d = withCreditFlag(true, () => reportData({ ...buildWizardState(spec), credit: caseCredit(spec) }, spec.id));
    const c = d.creditChapter;
    if (!s.check('chapter-flag', spec.id, c != null && reportPageCount(d) === 9, 'chapter missing')) continue;
    statuses[c!.status] = (statuses[c!.status] ?? 0) + 1;
    const violations = checkCreditChapterConsistency(c!);
    s.check('chapter-consistency', spec.id, violations.length === 0, violations.join('; '));
    if (spec.id.endsWith('0') || spec.id.includes('anchor') || spec.id.includes('golden')) {
      const html = withQuietConsole(() => buildEquifyPdfPages(d));
      const pages = (html.match(/<div class="page[ "]/g) ?? []).length;
      const body = chapterBody(html);
      // The eyebrow keeps the report's shared "0N | title" pattern; the rules apply to the page text.
      const text = visibleText(body.replace(/<span class="eyebrow"[^>]*>[^<]*<\/span>/, ''));
      const summaryOk = html.includes(c!.summaryLineHe) && (c!.status !== 'ok' || (text.includes(formatCreditAmount(c!.firstStage, c!.currency)) && text.includes(formatCreditAmount(c!.firstStageAnnual, c!.currency)) && text.includes(c!.dscr!.toFixed(2))));
      s.check('chapter-summary-line', spec.id, summaryOk, c!.summaryLineHe);
      const footOk = (html.match(/עמוד <b>\d+<\/b> \/ 9/g) ?? []).length === 9 && html.includes('05 | היוון תזרימי מזומנים') && html.includes('09 | שווי משולב');
      s.check('chapter-numbering', spec.id, pages === 9 && footOk, `pages ${pages}`);
      const terms = c!.status === 'no_capacity' ? ['כושר החזר'] : c!.status === 'no_room' ? ['כושר החזר', 'יחס כיסוי', 'שלב ראשון'] : ['כושר החזר', 'יחס כיסוי', 'שלב ראשון'];
      const synonyms = ['יכולת החזר', 'כושר פירעון', 'יחס שירות חוב', 'DSCR', 'מסגרת ראשונה', 'שלב א ', 'תיווך', 'מתווך', 'מובטח', 'מבטיחים', 'מבטיח לך', 'מאושר מראש', '—', '–', '·'];
      const bad = synonyms.filter((w) => text.includes(w));
      const attached = text.match(/(?:^|\s)[בלהומש]-[A-Za-z0-9]/g) ?? [];
      s.check('chapter-terms', spec.id, terms.every((t) => text.includes(t)) && bad.length === 0 && attached.length === 0 && text.includes('רוצים שנבדוק את זה מול כ 40 גופים מממנים?') && text.includes('הבדיקה לא מבטיחה'), `bad ${bad.join(',')} ${attached.join(',')}`);
    }
  }
  s.note(`credit chapter statuses (basic answers): ${JSON.stringify(statuses)}`);

  // The full case: owner loans, a bank floating lien, a subsidiary.
  const factory = cases.find((c) => c.id === 'golden-manufacturing') ?? spec0;
  const full = { ...factory, id: CREDIT_FULL_CASE_ID };
  const fd = withCreditFlag(true, () => reportData({ ...buildWizardState(full), credit: caseCredit(full) }, full.id));
  const fhtml = chapterBody(withQuietConsole(() => buildEquifyPdfPages(fd)));
  s.check('chapter-full', 'blocker', !!fd.creditChapter?.blocker.active && fhtml.includes('נדרש אישור הבנק הקיים לפני כל מימון חדש'), '');
  s.check('chapter-full', 'owner-loans', fhtml.includes('כתב נחיתות') && fhtml.includes('חוב נטו עם הלוואות הבעלים') && fhtml.includes('חוב נטו בלעדיהן'), '');
  s.check('chapter-full', 'subsidiary', fd.nonOperatingAssets != null && fd.nonOperatingAssets.value > 0, '');
  // Basic answers: no blocker, no owner loans box.
  const bd = withCreditFlag(true, () => reportData({ ...buildWizardState(factory), credit: caseCredit(factory) }, factory.id));
  const bhtml = chapterBody(withQuietConsole(() => buildEquifyPdfPages(bd)));
  s.check('chapter-basic', 'no-extras', !bhtml.includes('נדרש אישור הבנק הקיים') && !bhtml.includes('כתב נחיתות'), '');

  // Loss-making case: the explanation instead of numbers.
  const loss = cases.find((c) => c.y[2][1] < 0);
  if (loss) {
    const ld = withCreditFlag(true, () => reportData({ ...buildWizardState(loss), credit: caseCredit(loss) }, loss.id));
    const lhtml = chapterBody(withQuietConsole(() => buildEquifyPdfPages(ld)));
    s.check('chapter-loss', loss.id, ld.creditChapter?.status === 'no_capacity' && lhtml.includes('אינו חיובי') && !lhtml.includes('תזרים לשירות חוב (CFADS)') && !lhtml.includes('יחס כיסוי (רף'), ld.creditChapter?.status ?? 'none');
  }

  // Guard: tampered amounts are caught.
  const c = fd.creditChapter!;
  const tampered = [
    { ...c, firstStageAnnual: c.firstStageAnnual + 1 },
    { ...c, today: { ...c.today, cfads: c.today.cfads + 1 } },
    { ...c, netDebtWithoutOwnerLoans: c.netDebtWithoutOwnerLoans - 1 },
    { ...c, ceiling: c.ceiling + 5 },
  ];
  s.check('chapter-guard', 'tampered', tampered.every((t) => checkCreditChapterConsistency(t).length > 0), '');
}

/**
 * Part F: a calibration case that gives its holding the wizard way is valued by the engine, exactly
 * as in the product (the same nonOperatingAssets value, added once).
 */
function calibrationHoldingCheck(s: Suite): void {
  const raw = {
    caseCode: 'CAL-TEST',
    wizard: {
      sector: 'industry', subSector: 'manufacturing', lifecycle: 'mature',
      years: { '2024': { revenue: 40e6, ebitda: 5e6 }, '2025': { revenue: 44e6, ebitda: 5.5e6 }, '2026': { revenue: 48e6, ebitda: 6e6 } },
      growthPct: 6, grossDebt: 4e6, cash: 1e6, ownerSalaryNormalization: 0, capexLevelPct: 3, backlogSigned: 0,
      recurringPct: 60, topCustomerPct: 30, founderDependency: false, strongCompetition: false, ipProtection: true, longTermContracts: true,
    },
    nonOperatingAssets: { value: 3e6, engine: { holdingPct: 75, preTaxProfit: 1e6 } },
    target: { value: 40e6, low: 35e6, high: 45e6, by: 'TEST', method: 'test', source: 'test', date: null },
  };
  const c = validateCase(raw);
  const r = evaluateCase(c, 'test.json');
  const d = withCreditFlag(true, () => reportData(caseStateFor(c), 'CAL-TEST'));
  const engine = d.nonOperatingAssets?.value ?? NaN;
  s.check('calibration-holding', 'engine-way', r.nonOperatingSource === 'engine' && Math.abs(r.nonOperating - engine) < 1e-6 && Math.abs((resolveMethodVersion() === 'v2' ? r.v2 : r.v1) - d.equity) < 1e-3 * Math.max(1, Math.abs(d.equity)) && engine !== 3e6, `${r.nonOperating} vs ${engine}, v1 ${r.v1} vs ${d.equity}`);
  const fixed = evaluateCase(validateCase({ ...raw, nonOperatingAssets: { value: 3e6 } }), 'test.json');
  s.check('calibration-holding', 'fixed-way', fixed.nonOperatingSource === 'fixed' && fixed.nonOperating === 3e6, `${fixed.nonOperating}`);
}

/**
 * Part D (display only): page 5 labels the raw Damodaran range as public companies, shows the range
 * after the company's private company factors next to it, and no longer says "טווח הענף".
 */
function page5Checks(s: Suite, cases: CaseSpec[]): void {
  for (const spec of sample(cases, 9)) {
    const d = withCreditFlag(false, () => reportData(buildWizardState(spec), spec.id));
    const html = withQuietConsole(() => buildEquifyPdfPages(d));
    const im = d.industryMultiples;
    if (!im) continue;
    const old = /(בתוך|מתחת ל|מעל )טווח הענף/.test(html);
    const pf = im.privateFactor;
    const okPrivate = pf == null || (pf > 0 && pf < 1 && html.includes('חברה פרטית:') && html.includes('אחרי התאמות לחברה פרטית'));
    s.check('page5-public-label', spec.id, !old && html.includes('חברות ציבוריות (Damodaran)') && okPrivate, `pf ${pf}`);
  }
}
