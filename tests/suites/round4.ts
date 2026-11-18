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

  return s.result;
}
