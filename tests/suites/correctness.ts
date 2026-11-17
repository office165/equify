/**
 * Correctness checks on golden cases. Each number is recomputed independently from the
 * method the report itself declares (no engine import for the math; the engine is only
 * used to read the declared WACC components Ke and Kd, which the report does not print).
 */
import { buildPdfHtml } from '../../lib/pdf-template';
import type { ValuationData } from '../../lib/pdf-template/types';
import { computeValuation } from '../../lib/valuation';
import { damodaranIndustryFor } from '../../lib/market-data/damodaran_2026';
import { buildValuationInputsFromEquifyState } from '../../lib/wizard/build_valuation_inputs';
import { syncFinancialsDerived } from '../../lib/wizard/financial_history';
import { buildWizardState, type CaseSpec } from '../lib/fixtures';
import { GOLDEN_CASES } from '../lib/golden';
import { Suite, approx, type SuiteResult } from '../lib/harness';
import { withQuietConsole } from '../lib/quiet';
import { runCase, TEST_FX } from '../lib/run_case';

const TAX = 0.23;
const KD_SPREAD_PP = 2.0;
const TERMINAL_G = 0.025;

function htmlText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/[⁦-⁩‎‏]/g, '')
    .replace(/\s+/g, ' ');
}

function readWaccComponents(spec: CaseSpec) {
  return withQuietConsole(() => {
    const state = buildWizardState(spec);
    const synced = { ...state, financials: syncFinancialsDerived(state.financials) };
    const inputs = buildValuationInputsFromEquifyState(synced, TEST_FX);
    return computeValuation(inputs).waccBreakdown;
  });
}

function engineCornerEquityM(spec: CaseSpec, waccPct: number, terminalG: number): number {
  return withQuietConsole(() => {
    const state = buildWizardState(spec);
    const synced = { ...state, financials: syncFinancialsDerived(state.financials) };
    const inputs = buildValuationInputsFromEquifyState(synced, TEST_FX);
    return computeValuation(inputs, { waccPct, terminalGrowthRate: terminalG, silent: true }).equity / 1000;
  });
}

function uniformSteps(values: number[], tolRel = 0.02): boolean {
  if (values.length < 3) return true;
  const steps = values.slice(1).map((v, i) => v - values[i]);
  const ref = steps[0];
  return steps.every((s) => Math.abs(s - ref) <= Math.max(1e-9, Math.abs(ref) * tolRel));
}

export function checkCase(suite: Suite, spec: CaseSpec, data: ValuationData): void {
  const id = spec.id;
  const g = spec.growth;

  // (א) EBITDA bases as declared. Page 3 declares 30/50/20 (prior/current/projected).
  if (data.ebitdaPast != null && data.blendedEbitdaBase != null) {
    const expected = 0.3 * data.ebitdaPast + 0.5 * (data.ebitdaCurrent ?? 0) + 0.2 * (data.ebitdaProjected ?? 0);
    suite.check('ebitda-blend-30-50-20', id, approx(data.blendedEbitdaBase, expected, 0.005), `${data.blendedEbitdaBase} vs ${expected.toFixed(0)}`);
  }
  if (data.ebitdaCurrent != null && data.ebitdaProjected != null) {
    suite.check('ebitda-projected-equals-growth', id, approx(data.ebitdaProjected, data.ebitdaCurrent * (1 + g / 100), 0.005), `${data.ebitdaProjected} vs ${(data.ebitdaCurrent * (1 + g / 100)).toFixed(0)}`);
  }
  // Page 2 declares a second base (normalized 30/30/40 on 2024/2025/2026) used by the multiple leg.
  const [y24, y25, y26] = spec.y.map((r) => r[1] * 1000);
  const norm = 0.3 * y24 + 0.3 * y25 + 0.4 * y26;
  if (data.multipleLegEbitdaBase != null && y24 > 0 && y25 > 0 && (data.financialCore?.blendWeights.ebitda ?? 0) > 0) {
    suite.check('ebitda-normalized-30-30-40-is-multiple-base', id, approx(data.multipleLegEbitdaBase, norm, 0.005), `${data.multipleLegEbitdaBase} vs ${norm.toFixed(0)}`);
  }
  // Round 2 (finding 15): two bases, each with its own name and the weights the engine used.
  const dw = data.dcfEbitdaWeights;
  if (dw && data.blendedEbitdaBase != null) {
    const rebuilt = dw.past * (data.ebitdaPast ?? 0) + dw.current * (data.ebitdaCurrent ?? 0) + dw.projected * (data.ebitdaProjected ?? 0);
    suite.check('ebitda-dcf-weights-rebuild-base', id, approx(rebuilt, data.blendedEbitdaBase, 0.005), `${rebuilt.toFixed(0)} vs ${data.blendedEbitdaBase.toFixed(0)}`);
  }
  const mw = data.multipleEbitdaWeights;
  if (mw && data.normalizedEbitdaNote) {
    const shown = [...data.normalizedEbitdaNote.matchAll(/\((\d+)%\)/g)].map((m) => Number(m[1]));
    const expected = [mw.prior2, mw.prior1, mw.current].filter((w) => w > 0).map((w) => Math.round(w * 100));
    suite.check('ebitda-multiple-note-weights-are-engine', id, shown.join('/') === expected.join('/'), `note ${shown.join('/')} vs engine ${expected.join('/')}`);
    suite.check('ebitda-multiple-note-named', id, data.normalizedEbitdaNote.startsWith('EBITDA מנורמל למכפיל'), data.normalizedEbitdaNote.slice(0, 30));
  }

  // (ב) WACC from components.
  const wb = readWaccComponents(spec);
  const keExpected = wb.rf + wb.leveredBeta * wb.erp + (wb.crp ?? 0) + wb.alpha + wb.specificRiskPremium + wb.profitabilityLossPremium;
  suite.check('wacc-ke-from-components', id, approx(wb.ke, keExpected, 0.0005, 0.001), `${wb.ke} vs ${keExpected}`);
  const kdExpected = (wb.rf + KD_SPREAD_PP) * (1 - TAX);
  suite.check('wacc-kd-after-tax-23', id, approx(wb.kd, kdExpected, 0.0005, 0.001), `${wb.kd} vs ${kdExpected}`);
  if (data.methodVersion === 'v2') {
    // Methodology 2 (finding 18): the weights are the declared Damodaran industry D/E (target
    // capital structure), not a pre-valuation proxy. The report states the D/E and its source.
    const ind = damodaranIndustryFor(spec.sector, spec.subSector);
    const de = ind ? ind.global.deRatio.value : 0;
    const we = 1 / (1 + de);
    const waccFromDeclared = Math.min(22, Math.max(6, wb.ke * we + wb.kd * (1 - we)));
    suite.check(
      'wacc-equals-weights-from-report-equity',
      id,
      Math.abs(waccFromDeclared - data.waccPct) <= 0.25 && /D\/E של [\d.]+ לענף/.test(data.waccNote ?? ''),
      `WACC ${data.waccPct.toFixed(2)} vs Ke*E/V+Kd*D/V with the declared industry D/E ${de.toFixed(2)}: ${waccFromDeclared.toFixed(2)} (E/V ${(we * 100).toFixed(1)}%)`,
    );
  } else {
    const grossDebt = spec.grossDebt * 1000 * (spec.currency === 'USD' ? 1 : 1);
    const equityForWeights = Math.max(0, data.equity);
    const weReport = equityForWeights + grossDebt > 0 ? equityForWeights / (equityForWeights + grossDebt) : 1;
    const waccFromReportWeights = wb.ke * weReport + wb.kd * (1 - weReport);
    suite.check(
      'wacc-equals-weights-from-report-equity',
      id,
      Math.abs(waccFromReportWeights - data.waccPct) <= 0.25,
      `WACC ${data.waccPct.toFixed(2)} vs Ke*E/V+Kd*D/V with report equity ${waccFromReportWeights.toFixed(2)} (E/V ${(weReport * 100).toFixed(1)}%)`,
    );
  }
  // Round 2: the page 4 table adds up (Ke from its rows, WACC from Ke, Kd and the weights).
  if (data.waccTable) {
    const t = data.waccTable;
    const keRow = t.find((r) => r.kind === 'subtotal');
    const keIdx = keRow ? t.indexOf(keRow) : -1;
    const keSum = t.slice(0, keIdx).filter((r) => r.kind === 'component').reduce((s, r) => s + r.pct, 0);
    suite.check('wacc-table-ke-sums', id, !!keRow && Math.abs(keSum - keRow.pct) <= 0.01, `rows ${keSum.toFixed(2)} vs Ke ${keRow?.pct.toFixed(2)}`);
    const weights = t.filter((r) => r.kind === 'weight');
    const kdAfter = t.slice(keIdx + 1).filter((r) => r.kind === 'component')[1];
    const bound = t.slice(keIdx + 1).filter((r) => r.kind === 'component')[2]?.pct ?? 0;
    const waccFromTable = keRow && weights.length === 2 && kdAfter
      ? (keRow.pct * weights[0].pct) / 100 + (kdAfter.pct * weights[1].pct) / 100 + bound
      : NaN;
    suite.check('wacc-table-equals-effective', id, Math.abs(waccFromTable - data.waccPct) <= 0.05, `table ${waccFromTable.toFixed(2)} vs WACC ${data.waccPct.toFixed(2)}`);
    suite.check('wacc-weights-sum-100', id, weights.length === 2 && Math.abs(weights[0].pct + weights[1].pct - 100) <= 0.01, weights.map((w) => w.pct.toFixed(2)).join('+'));
  }
  const chartSum = data.waccSegments.reduce((s, x) => s + x.pct, 0);
  suite.check('wacc-chart-equals-effective', id, Math.abs(chartSum - data.waccPct) <= 0.05, `chart ${chartSum.toFixed(2)} vs WACC ${data.waccPct.toFixed(2)}`);

  // (ג) FCFF never above EBITDA (upper bound: blended base grown at declared headline growth).
  const baseEbitdaM = (data.blendedEbitdaBase ?? data.ebitda) / 1e6;
  data.dcfRows.forEach((r, i) => {
    const bound = baseEbitdaM * (1 + Math.max(0, g) / 100) ** (i + 1);
    suite.check('fcff-not-above-ebitda', `${id}#${r.label}`, r.fcffM <= bound + 1e-9, `FCFF ${r.fcffM.toFixed(3)}M vs EBITDA bound ${bound.toFixed(3)}M`);
  });

  // (ד) Gordon terminal value, discounted with the last explicit year's factor.
  const last = data.dcfRows.at(-1);
  if (last) {
    const w = data.waccPct / 100;
    // Methodology 1: Gordon on the last explicit FCFF. Methodology 2 (T1): Gordon on the
    // normalized terminal year the report states, with the 3 point minimum spread.
    const tv =
      data.methodVersion === 'v2' && data.terminalFcffM != null
        ? data.terminalFcffM / (Math.max(w, TERMINAL_G + 0.03) - TERMINAL_G)
        : (last.fcffM * (1 + TERMINAL_G)) / (w - TERMINAL_G);
    const tvPv = tv * last.discountFactor;
    suite.check('terminal-gordon', id, approx(data.terminalPvM, tvPv, 0.01, 0.001), `report ${data.terminalPvM.toFixed(3)}M vs Gordon ${tvPv.toFixed(3)}M`);
    const explicitPv = data.dcfRows.reduce((s, r) => s + r.pvM, 0);
    const share = (data.terminalPvM / (explicitPv + data.terminalPvM)) * 100;
    suite.check('terminal-share-consistent', id, Math.abs(share - data.terminalSharePct) <= 0.2, `${data.terminalSharePct.toFixed(2)} vs ${share.toFixed(2)}`);
    suite.check('dcf-table-sums-to-dcf-ev', id, approx((explicitPv + data.terminalPvM) * 1e6, data.dcfEv, 0.005), `table ${((explicitPv + data.terminalPvM) * 1e6).toFixed(0)} vs DCF EV ${data.dcfEv.toFixed(0)}`);
    suite.check('discount-factors-match-wacc', id, data.dcfRows.every((r, i) => approx(r.discountFactor, 1 / (1 + w) ** (i === 0 ? 0.5 : i + 0.5), 0.0005, 1e-6)), 'mid-year factors');
  }

  // (ה) EBITDA multiple leg.
  if (data.ebitdaEv > 0 && data.multipleLegEbitdaBase != null) {
    suite.check('ebitda-leg-base-times-multiple', id, approx(data.ebitdaEv, data.multipleLegEbitdaBase * data.effectiveMult, 0.01), `${data.ebitdaEv} vs ${(data.multipleLegEbitdaBase * data.effectiveMult).toFixed(0)}`);
  }

  // (ו) Blend and equity bridge.
  const core = data.financialCore!;
  const weighted = data.dcfEv * core.blendWeights.dcf + data.ebitdaEv * core.blendWeights.ebitda + data.revenueEv * core.blendWeights.rev + (core.backlogEvAdjustmentAbs ?? 0);
  suite.check('ev-equals-weighted-legs', id, approx(data.enterpriseValue, weighted, 0.001), `${data.enterpriseValue} vs ${weighted.toFixed(0)}`);
  suite.check('equity-equals-ev-minus-net-debt', id, approx(data.equity, Math.max(0, data.enterpriseValue - data.netDebt), 0.0005, 1), `${data.equity} vs ${data.enterpriseValue - data.netDebt}`);
  const legRows = data.modelBlend.filter((r) => !/צבר|Backlog/i.test(r.name));
  suite.check('display-weights-sum-100', id, Math.abs(legRows.reduce((s, r) => s + r.weightPct, 0) - 100) < 1e-9, legRows.map((r) => r.weightPct).join('+'));
  suite.check('display-weights-one-decimal', id, legRows.every((r) => Math.abs(r.weightPct * 10 - Math.round(r.weightPct * 10)) < 1e-9), legRows.map((r) => r.weightPct).join('+'));
  const badRows = legRows.filter((r) => !approx(r.contribution, r.ev * (r.weightPct / 100), 0.005, 1));
  suite.check(
    'display-contribution-equals-ev-times-shown-weight',
    id,
    badRows.length === 0,
    badRows.map((r) => `${r.name}: ${r.contribution.toFixed(0)} vs ${((r.ev * r.weightPct) / 100).toFixed(0)}`).join('; '),
  );

  // (ז) Sensitivity (growth x WACC).
  const s = data.sensitivityGrowthWacc;
  if (s) {
    const center = s.cells[s.baseRow][s.baseCol] * 1e6;
    suite.check('sensitivity-center-equals-equity', id, approx(center, data.equity, 0.001), `${center.toFixed(0)} vs ${data.equity}`);
    suite.check('sensitivity-growth-rows-unique', id, new Set(s.growthLabels).size === s.growthLabels.length, s.growthLabels.join(','));
    const gNums = s.growthLabels.map((l) => parseFloat(l.replace(/[+%]/g, '')));
    suite.check('sensitivity-growth-rows-sorted', id, gNums.every((v, i) => i === 0 || v < gNums[i - 1]), s.growthLabels.join(','));
    suite.check('sensitivity-growth-steps-uniform', id, uniformSteps(gNums), s.growthLabels.join(','));
    const wNums = s.waccLabels.map((l) => parseFloat(l));
    suite.check('sensitivity-wacc-steps-uniform', id, uniformSteps(wNums, 0.05), s.waccLabels.join(','));
    suite.check('sensitivity-wacc-step-1pp', id, Math.abs((wNums[1] - wNums[0]) - 1) < 0.051, s.waccLabels.join(','));
    suite.check('sensitivity-growth-1.5-to-3.5', id, gNums[0] === 3.5 && gNums.at(-1) === 1.5 && gNums.length === 5, s.growthLabels.join(','));
    // A corner cell is an independent engine run, not a linear approximation.
    // The label is rounded to 0.1 point; the cell runs at the exact WACC minus 2 points.
    const corner = engineCornerEquityM(spec, data.waccPct - 2, gNums[0] / 100);
    suite.check('sensitivity-cell-is-engine-run', id, approx(s.cells[0][0], corner, 0.001, 0.0005), `${s.cells[0][0].toFixed(4)} vs engine ${corner.toFixed(4)}`);
  }
  const e = data.sensitivityEbitdaMult;
  if (e) {
    const center = e.cells[e.baseRow][e.baseCol] * 1e6;
    suite.check('sensitivity-ebitda-center-equals-equity', id, approx(center, data.equity, 0.001), `${center.toFixed(0)} vs ${data.equity}`);
    const mNums = e.multipleLabels.map((l) => parseFloat(l.replace(/[×x]/g, '')));
    suite.check('sensitivity-multiple-steps-0.5', id, mNums.every((v, i) => i === 0 || Math.abs(v - mNums[i - 1] - 0.5) < 0.051 || mNums[i - 1] <= 0.1), e.multipleLabels.join(','));
    suite.check('sensitivity-ebitda-rows-5', id, e.cells.length === 5 && e.baseRow === 2, `${e.cells.length} rows`);
  }

  // (ח) Scenarios.
  const baseScenario = data.scenarios.find((x) => x.key === 'base');
  suite.check('scenario-base-equals-equity', id, !!baseScenario && approx(baseScenario.equity, data.equity, 0.0005, 1), `${baseScenario?.equity} vs ${data.equity}`);
  suite.check('scenario-ordered', id, data.bearEquity <= data.equity && data.equity <= data.bullEquity, `${data.bearEquity} / ${data.equity} / ${data.bullEquity}`);

  // (ט) Same number in every place of the HTML.
  let html = '';
  try {
    html = withQuietConsole(() => buildPdfHtml(data));
    suite.check('html-builds', id, true);
  } catch (err) {
    suite.check('html-builds', id, false, err instanceof Error ? err.message.slice(0, 160) : String(err));
    return;
  }
  const text = htmlText(html);
  const waccShown = new Set<string>();
  for (const m of text.matchAll(/(\d+(?:\.\d+)?)%\s*WACC(?! אפקטיבי \d)|(?<!\\ )WACC[^%\d\\]{0,12}?(\d+(?:\.\d+)?)%/g)) {
    waccShown.add(m[1] ?? m[2]);
  }
  suite.check('html-wacc-single-value', id, waccShown.size === 1 && waccShown.has(data.waccPct.toFixed(1)), `WACC values in HTML: ${[...waccShown].join(', ')} (effective ${data.waccPct.toFixed(1)})`);
  const eqShown = new Set<string>();
  for (const m of text.matchAll(/([\d.,]+\s?[KMB]?) ?₪ שווי לבעלים · בסיס/g)) eqShown.add(m[1].replace(/\s/g, ''));
  for (const m of text.matchAll(/השווי לבעלים בתרחיש הבסיס עומד על ([\d.,]+[KMB]?)/g)) eqShown.add(m[1]);
  for (const m of text.matchAll(/חוב נטו -?[\d.,]+[KMB]? ₪ שווי לבעלים ([\d.,]+[KMB]?) ₪/g)) eqShown.add(m[1]);
  suite.check('html-equity-single-value', id, eqShown.size === 1, `equity strings: ${[...eqShown].join(', ')}`);
  const evShown = new Set<string>();
  for (const m of text.matchAll(/שווי פעילות של ([\d.,]+[KMB])/g)) evShown.add(m[1]);
  for (const m of text.matchAll(/([\d.,]+[KMB]) ₪ שווי פעילות \(EV\)/g)) evShown.add(m[1]);
  for (const m of text.matchAll(/שווי פעילות משולב 100% ([\d.,]+[KMB])/g)) evShown.add(m[1]);
  suite.check('html-ev-single-value', id, evShown.size === 1, `EV strings: ${[...evShown].join(', ')}`);
}

export function run(): SuiteResult {
  const suite = new Suite('correctness');
  for (const spec of GOLDEN_CASES) {
    const data = runCase(spec);
    suite.note(`${spec.id}: equity ${Math.round(data.equity).toLocaleString('en-US')} EV ${Math.round(data.enterpriseValue).toLocaleString('en-US')} WACC ${data.waccPct.toFixed(2)}`);
    checkCase(suite, spec, data);
  }
  return suite.result;
}
