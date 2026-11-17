/**
 * Round 2, part D: methodology 1 vs methodology 2 comparison.
 *   npx tsx scripts/round-2/method-v2-compare.ts   -> writes reports/round-2-method-v2.md
 *
 * Every number is a full engine run (computeValuation, the customer path inputs, static FX).
 * The change is split by part with a cumulative waterfall: W1, then T1, then removing
 * enforceCapexMonotonicity, then R1, then the continuous size factor, then the rest (mature row,
 * zero-leg weight). The parts add up to the total change of each case.
 * Analysis only: no default changes, METHOD_V2 stays off in production.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { DAMODARAN_ISRAEL, damodaranRange, damodaranMappingFor } from '../../lib/market-data/damodaran_2026';
import { computeValuation, type ValuationComputed, type ValuationInputs } from '../../lib/valuation';
import type { V2Components } from '../../lib/valuation/method_v2';
import { resolveSectorMethodologyConfig } from '../../lib/valuation/sector_methodology_resolver';
import { buildValuationInputsFromEquifyState } from '../../lib/wizard/build_valuation_inputs';
import { syncFinancialsDerived } from '../../lib/wizard/financial_history';
import { ANCHOR_CASES, buildAllCases, buildSubsectorCases } from '../../tests/lib/cases';
import { buildWizardState, type CaseSpec } from '../../tests/lib/fixtures';
import { GOLDEN_CASES } from '../../tests/lib/golden';
import { withQuietConsole } from '../../tests/lib/quiet';
import { TEST_FX } from '../../tests/lib/run_case';

const ROOT = path.join(__dirname, '..', '..');

const STEPS: Array<{ key: string; label: string; add: Partial<V2Components> }> = [
  { key: 'w1', label: 'W1', add: { w1: true } },
  { key: 't1', label: 'T1', add: { t1: true } },
  { key: 'capex', label: 'בלי מנחית CAPEX', add: { noCapexGuard: true } },
  { key: 'r1', label: 'R1', add: { r1: true } },
  { key: 'size', label: 'גודל רציף', add: { continuousSize: true } },
  { key: 'rest', label: 'mature ומשקל רגל אפס', add: { matureRow: true, zeroLeg: true, manualReview: true } },
];

function inputsFor(spec: CaseSpec): ValuationInputs {
  return withQuietConsole(() => {
    const st = buildWizardState(spec);
    return buildValuationInputsFromEquifyState({ ...st, financials: syncFinancialsDerived(st.financials) }, TEST_FX);
  });
}

function run(inputs: ValuationInputs, components?: Partial<V2Components>): ValuationComputed {
  return withQuietConsole(() =>
    components ? computeValuation(inputs, { v2Components: components, silent: true }) : computeValuation(inputs, { method: 'v1', silent: true }),
  );
}

interface Row {
  spec: CaseSpec;
  v1: ValuationComputed;
  v2: ValuationComputed;
  steps: number[]; // equity after each cumulative step (K)
  changePct: number | null;
}

function evaluate(spec: CaseSpec): Row {
  const inputs = inputsFor(spec);
  const v1 = run(inputs);
  const acc: Partial<V2Components> = {};
  const steps: number[] = [];
  let last: ValuationComputed = v1;
  for (const s of STEPS) {
    Object.assign(acc, s.add);
    last = run(inputs, { ...acc });
    steps.push(last.equity);
  }
  const v2 = last;
  return { spec, v1, v2, steps, changePct: v1.equity > 0 ? ((v2.equity - v1.equity) / v1.equity) * 100 : null };
}

const fmtM = (k: number) => `${(k / 1000).toFixed(2)}M`;
const fmtPct = (p: number | null) => (p == null ? 'n/a' : `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`);
const fmtPp = (p: number) => `${p >= 0 ? '+' : ''}${p.toFixed(1)}`;

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function quantile(xs: number[], q: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))];
}

function impliedMult(c: ValuationComputed): number | null {
  const n = c.normalizedEbitda?.normalizedEbitdaK ?? c.ebitda;
  return n > 0 ? c.ev / n : null;
}

function rangeText(spec: CaseSpec): string {
  const r = damodaranRange(spec.sector, spec.subSector, 'evEbitda');
  return r ? `${r.low.toFixed(1)} עד ${r.high.toFixed(1)}` : 'אין מיפוי';
}

function caseTable(title: string, rows: Row[]): string[] {
  const out = [
    `### ${title}`,
    '',
    `| תיק | V1 | V2 | שינוי | ${STEPS.map((s) => s.label).join(' | ')} | מכפיל EBITDA משתמע V1 / V2 | טווח Damodaran EV/EBITDA |`,
    `|---|---|---|---|${STEPS.map(() => '---').join('|')}|---|---|`,
  ];
  for (const r of rows) {
    const base = r.v1.equity;
    const parts = r.steps.map((eq, i) => {
      const prev = i === 0 ? base : r.steps[i - 1];
      return base > 0 ? fmtPp(((eq - prev) / base) * 100) : `${fmtM(eq - prev)}`;
    });
    const m1 = impliedMult(r.v1);
    const m2 = impliedMult(r.v2);
    out.push(
      `| ${r.spec.id} | ${fmtM(r.v1.equity)} | ${fmtM(r.v2.equity)} | ${fmtPct(r.changePct)} | ${parts.join(' | ')} | ${m1 == null ? 'n/a' : m1.toFixed(1)} / ${m2 == null ? 'n/a' : m2.toFixed(1)} | ${rangeText(r.spec)} |`,
    );
  }
  out.push('');
  out.push('עמודות הרכיבים: נקודות אחוז מהשווי ב V1, מצטבר לפי הסדר משמאל לימין, וסכומן שווה לשינוי. בתיק ששוויו ב V1 הוא 0 הרכיבים בסכומים.');
  out.push('');
  return out;
}

function omwise(method: 'v1' | 'v2'): Record<string, string> {
  const tsxCli = path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const res = spawnSync(process.execPath, [tsxCli, path.join('scripts', 'test-omwise-calibration.ts')], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, METHOD_V2: method === 'v2' ? 'on' : 'off', FORCE_COLOR: '0', OFFICE_ALERTS_DISABLED: 'true' },
  });
  const text = `${res.stdout}\n${res.stderr}`;
  const grab = (re: RegExp) => text.match(re)?.[1] ?? 'n/a';
  return {
    wacc: grab(/WACC \(adjusted\): ([\d.]+%)/),
    dcf: grab(/DCF EV leg: ₪([\d.]+M)/),
    ebitda: grab(/EBITDA multiple leg: ₪([\d.]+M)/),
    ev: grab(/Blended Enterprise Value \(EV\): ₪([\d.]+M)/),
    equity: grab(/Equity Value \(שווי לבעלים\): ₪([\d.]+M)/),
    bear: grab(/BEAR:.*Equity ₪([\d.]+M)/),
    bull: grab(/BULL:.*Equity ₪([\d.]+M)/),
  };
}

const ALL_ON: V2Components = { w1: true, t1: true, noCapexGuard: true, r1: true, continuousSize: true, matureRow: true, zeroLeg: true, manualReview: true };

function isRevenueStrategy(inputs: ValuationInputs): boolean {
  return resolveSectorMethodologyConfig(inputs.sector, inputs.subSector).strategy === 'current_run_rate_revenue';
}

/** Option B: R1 only where the revenue multiple is a secondary leg (EBITDA-strategy sub-sectors). */
function componentsFor(inputs: ValuationInputs, option: 'A' | 'B'): V2Components {
  return option === 'B' && isRevenueStrategy(inputs) ? { ...ALL_ON, r1: false } : ALL_ON;
}

/** Median V2 change over all cases with positive V1 equity, under a temporary patch. */
function levelWith(allInputs: Array<{ inputs: ValuationInputs; v1: number }>, option: 'A' | 'B', patch: () => () => void): number {
  const undo = patch();
  try {
    const ch = allInputs.filter((x) => x.v1 > 0).map((x) => ((run(x.inputs, componentsFor(x.inputs, option)).equity - x.v1) / x.v1) * 100);
    return median(ch);
  } finally {
    undo();
  }
}

function solve(f: (x: number) => number, lo: number, hi: number, target = 0): number {
  let a = lo;
  let b = hi;
  for (let i = 0; i < 40; i += 1) {
    const m = (a + b) / 2;
    if (f(m) > target) a = m;
    else b = m;
  }
  return (a + b) / 2;
}

function main(): void {
  const anchors = ANCHOR_CASES.map(evaluate);
  const golden = GOLDEN_CASES.map(evaluate);
  const subs = buildSubsectorCases().map(evaluate);
  const all = buildAllCases().map(evaluate);

  const out: string[] = [];
  out.push('# סבב 2ב: מתודולוגיה 1 מול מתודולוגיה 2');
  out.push('');
  out.push('נוצר על ידי `npx tsx scripts/round-2/method-v2-compare.ts`. כל מספר הוא הרצה מלאה של המנוע על אותם קלטים שנתיב הדוח מקבל (שערי מטבע קבועים). מתודולוגיה 2 כבויה בפרודקשן (`METHOD_V2` לא מוגדר).');
  out.push('');
  out.push('## מה V2 עושה');
  out.push('');
  out.push('1. T1: ערך טרמינלי לפי Gordon בלי תקרה, על שנה טרמינלית מנורמלת (CAPEX שווה לפחת, הון חוזר לפי g, מס 23% על EBIT, g של 2.5%, מרווח מינימלי של 3 נקודות בין WACC ל g, היוון ב 4.5 שנים). בדיקה צולבת לפי מכפיל יציאה של הענף מוצגת בדוח ולא נכנסת לשווי.');
  out.push('2. בלי `enforceCapexMonotonicity` (החלטה 2).');
  out.push(`3. W1: Ke עם Rf ${(4.2379).toFixed(2)}% (בנק ישראל), ERP ${(DAMODARAN_ISRAEL.impliedErp.value * 100).toFixed(2)}% ו CRP ${(DAMODARAN_ISRAEL.crp.value * 100).toFixed(2)}% (Damodaran), בטא לא ממונפת ו D/E של הענף מ Damodaran, ומשקלות ההון לפי ה D/E הזה.`);
  out.push('4. R1 (החלטה 1): מכפיל הכנסות = EV/Sales של הענף (אמצע Global ו Emerging) כפול יחס המרווח, כשיחס המרווח הוא מרווח ה EBITDA המנורמל של החברה חלקי מרווח ה EBITDA המשתמע של הענף (EV/Sales חלקי EV/EBITDA), חתוך ל 0.25 עד 1.0. אחרי זה הנחת סחירות וגודל.');
  out.push('5. מקדם גודל רציף (לוג ליניארי דרך 0.88, 0.92, 0.96 ו 1.0), שורת mature ב blendTargets, והעברת משקל מרגל EBITDA אפס (רציפה, ראו ממצא 26).');
  out.push('');

  out.push('## 1. טבלה לפי תיק');
  out.push('');
  out.push(...caseTable('תיקי העוגן (7)', anchors));
  out.push(...caseTable('תיקי הזהב (14)', golden));
  out.push(...caseTable('תיק אחד לכל תת ענף (50)', subs));

  // Capex guard share
  const capexIdx = STEPS.findIndex((s) => s.key === 'capex');
  const capexShare = all
    .filter((r) => r.v1.equity > 0 && r.v2.equity !== r.v1.equity)
    .map((r) => {
      const prev = r.steps[capexIdx - 1];
      return Math.abs(r.steps[capexIdx] - prev) / Math.max(1e-9, Math.abs(r.v2.equity - r.v1.equity));
    });
  const capexMoves = all.filter((r) => r.v1.equity > 0).map((r) => ((r.steps[capexIdx] - r.steps[capexIdx - 1]) / r.v1.equity) * 100);
  out.push('### הוצאת enforceCapexMonotonicity');
  out.push('');
  out.push(`על כל ${capexMoves.length} התיקים עם שווי חיובי ב V1: השפעה חציונית ${fmtPct(median(capexMoves))}, p10 עד p90 ${fmtPct(quantile(capexMoves, 0.1))} עד ${fmtPct(quantile(capexMoves, 0.9))}, מקסימום ${fmtPct(Math.max(...capexMoves))}, מינימום ${fmtPct(Math.min(...capexMoves))}. החלק החציוני שלה מתוך השינוי המוחלט של התיק: ${(median(capexShare) * 100).toFixed(0)}%. הרכיב נמדד אחרי T1, כלומר על השנה הטרמינלית המנורמלת.`);
  out.push('');

  out.push('## 2. סיכום לפי ענף (כל 385 התיקים)');
  out.push('');
  out.push(`| ענף | תיקים | חציון שינוי | p10 עד p90 | ${STEPS.map((s) => `${s.label} (חציון)`).join(' | ')} |`);
  out.push(`|---|---|---|---|${STEPS.map(() => '---').join('|')}|`);
  const sectors = [...new Set(all.map((r) => r.spec.sector))];
  for (const sec of sectors) {
    const xs = all.filter((r) => r.spec.sector === sec && r.v1.equity > 0);
    const ch = xs.map((r) => r.changePct!);
    const stepMed = STEPS.map((_, i) => median(xs.map((r) => (((r.steps[i] - (i === 0 ? r.v1.equity : r.steps[i - 1])) / r.v1.equity) * 100))));
    out.push(`| ${sec} | ${xs.length} | ${fmtPct(median(ch))} | ${fmtPct(quantile(ch, 0.1))} עד ${fmtPct(quantile(ch, 0.9))} | ${stepMed.map(fmtPp).join(' | ')} |`);
  }
  const pos = all.filter((r) => r.v1.equity > 0);
  const allCh = pos.map((r) => r.changePct!);
  const level = median(allCh);
  out.push(`| **הכל** | ${pos.length} | ${fmtPct(level)} | ${fmtPct(quantile(allCh, 0.1))} עד ${fmtPct(quantile(allCh, 0.9))} | ${STEPS.map((_, i) => fmtPp(median(pos.map((r) => ((r.steps[i] - (i === 0 ? r.v1.equity : r.steps[i - 1])) / r.v1.equity) * 100)))).join(' | ')} |`);
  out.push('');
  const zeroV1 = all.filter((r) => !(r.v1.equity > 0)).length;
  out.push(`תיקים ששוויים ב V1 הוא 0 לא נכנסים לאחוזים (${zeroV1} תיקים).`);
  out.push('');
  const inRange = (r: Row, c: ValuationComputed) => {
    const rg = damodaranRange(r.spec.sector, r.spec.subSector, 'evEbitda');
    const m = impliedMult(c);
    return rg && m != null && m >= rg.low * 0.8 * 0.88 && m <= rg.high;
  };
  out.push(`מכפיל EBITDA משתמע בטווח Damodaran של הענף (הקצה התחתון אחרי סחירות 0.8 וגודל 0.88): V1 ${pos.filter((r) => inRange(r, r.v1)).length} מתוך ${pos.length}, V2 ${pos.filter((r) => inRange(r, r.v2)).length} מתוך ${pos.length}.`);
  out.push('');

  out.push('## 3. תיקים שנשלחים לבדיקה ידנית ב V2');
  out.push('');
  const review = all.filter((r) => r.v2.v2?.manualReview);
  const reasonHe: Record<string, string> = {
    'debt-exceeds-ev': 'חוב נטו גבוה מ EV',
    'equity-zero': 'שווי לבעלים 0',
    'equity-below-5pct-revenue': 'שווי לבעלים נמוך מ 5% מההכנסות',
  };
  out.push(`${review.length} מתוך ${all.length} תיקים.`);
  out.push('');
  out.push('| תיק | סיבות | שווי V1 | שווי V2 | EV ב V2 | חוב נטו | הכנסות |');
  out.push('|---|---|---|---|---|---|---|');
  for (const r of review) {
    const rev = r.spec.y[2][0];
    out.push(`| ${r.spec.id} | ${r.v2.v2!.manualReview!.reasons.map((x) => reasonHe[x]).join(', ')} | ${fmtM(r.v1.equity)} | ${fmtM(r.v2.equity)} | ${fmtM(r.v2.ev)} | ${fmtM(r.spec.grossDebt - r.spec.cash)} | ${fmtM(rev)} |`);
  }
  out.push('');

  out.push('## 4. כיול מול אומוייז (`scripts/test-omwise-calibration.ts`)');
  out.push('');
  const o1 = omwise('v1');
  const o2 = omwise('v2');
  out.push('| | V1 | V2 |');
  out.push('|---|---|---|');
  out.push(`| WACC אחרי התאמת צבר | ${o1.wacc} | ${o2.wacc} |`);
  out.push(`| רגל DCF | ${o1.dcf} | ${o2.dcf} |`);
  out.push(`| רגל מכפיל EBITDA | ${o1.ebitda} | ${o2.ebitda} |`);
  out.push(`| EV | ${o1.ev} | ${o2.ev} |`);
  out.push(`| שווי לבעלים | ${o1.equity} | ${o2.equity} |`);
  out.push(`| דוב עד שור | ${o1.bear} עד ${o1.bull} | ${o2.bear} עד ${o2.bull} |`);
  out.push('| יעד אומוייז | כ 19.5M (18M עד 22.5M) | כ 19.5M (18M עד 22.5M) |');
  out.push('');

  // Level parameter (part D item 5)
  const allInputs = buildAllCases().map((spec) => ({ inputs: inputsFor(spec), v1: run(inputsFor(spec)).equity }));
  const erp = DAMODARAN_ISRAEL.impliedErp as { value: number };
  const crp = DAMODARAN_ISRAEL.crp as { value: number };
  const erp0 = erp.value;
  const crp0 = crp.value;
  const levelAt = (option: 'A' | 'B') => ({
    erp: (e: number) => levelWith(allInputs, option, () => { erp.value = e; return () => { erp.value = erp0; }; }),
    ke: (pp: number) => levelWith(allInputs, option, () => { crp.value = crp0 + pp / 100; return () => { crp.value = crp0; }; }),
  });
  const params: Record<string, Record<string, number>> = {};
  for (const option of ['A', 'B'] as const) {
    const f = levelAt(option);
    const base = levelWith(allInputs, option, () => () => undefined);
    params[option] = {
      level: base,
      erpTo0: solve(f.erp, 0.02, 0.2, 0),
      erpTo10: solve(f.erp, 0.02, 0.2, 10),
      keTo0: solve(f.ke, -5, 15, 0),
      keTo10: solve(f.ke, -5, 15, 10),
      atKroll: f.erp(0.05),
    };
  }
  // Sector medians under option B
  const optB = all.map((r) => {
    const inputs = inputsFor(r.spec);
    const eq = run(inputs, componentsFor(inputs, 'B')).equity;
    return { r, eq, ch: r.v1.equity > 0 ? ((eq - r.v1.equity) / r.v1.equity) * 100 : null };
  });

  out.push('## 5. המלצה');
  out.push('');
  out.push('אפשרות A היא V2 כמו שנבנה (R1 בכל מקום שיש רגל הכנסות). אפשרות B היא אותו V2, אבל R1 רק בתתי ענפים שבהם מכפיל ההכנסות הוא רגל משנית (אסטרטגיית EBITDA). בתתי ענפים שבהם מכפיל ההכנסות הוא השיטה הראשית (תוכנה, פינטק, סייבר) נשאר המכפיל של V1, עם מקדם הגודל הרציף.');
  out.push('');
  out.push('| | A | B |');
  out.push('|---|---|---|');
  out.push(`| חציון שינוי, ${pos.length} תיקים | ${fmtPct(params.A.level)} | ${fmtPct(params.B.level)} |`);
  out.push(`| ERP שמחזיר לחציון 0% | ${(params.A.erpTo0 * 100).toFixed(2)}% | ${(params.B.erpTo0 * 100).toFixed(2)}% |`);
  out.push(`| ERP שמחזיר לחציון 10%+ | ${(params.A.erpTo10 * 100).toFixed(2)}% | ${(params.B.erpTo10 * 100).toFixed(2)}% |`);
  out.push(`| חציון שינוי עם ERP של 5.0% (Kroll, ספטמבר 2026) | ${fmtPct(params.A.atKroll)} | ${fmtPct(params.B.atKroll)} |`);
  out.push(`| תוספת אחידה ל Ke (כמו פרמיית גודל) לחציון 0% | ${params.A.keTo0.toFixed(2)} נק' | ${params.B.keTo0.toFixed(2)} נק' |`);
  out.push(`| תוספת אחידה ל Ke לחציון 10%+ | ${params.A.keTo10.toFixed(2)} נק' | ${params.B.keTo10.toFixed(2)} נק' |`);
  out.push('');
  out.push('| ענף | A: חציון | B: חציון | B: p10 עד p90 |');
  out.push('|---|---|---|---|');
  for (const sec of sectors) {
    const a = all.filter((r) => r.spec.sector === sec && r.v1.equity > 0).map((r) => r.changePct!);
    const b = optB.filter((x) => x.r.spec.sector === sec && x.ch != null).map((x) => x.ch!);
    out.push(`| ${sec} | ${fmtPct(median(a))} | ${fmtPct(median(b))} | ${fmtPct(quantile(b, 0.1))} עד ${fmtPct(quantile(b, 0.9))} |`);
  }
  out.push('');
  // Hand-written reasoning, kept next to the script so the report can be regenerated.
  out.push(fs.readFileSync(path.join(__dirname, 'method-v2-recommendation.md'), 'utf8').trim());
  out.push('');
  out.push('## 6. החלטות');
  out.push('');
  out.push('(צור ולירון ממלאים)');
  out.push('');
  out.push('| נושא | החלטה | מי | תאריך |');
  out.push('|---|---|---|---|');
  out.push('| R1 בתתי ענפים שבהם מכפיל ההכנסות הוא השיטה הראשית (A או B) | | | |');
  out.push('| רמת השווי אחרי T1 (לקבל, או פרמטר אחד עם מקור) | | | |');
  out.push('| ממצא 26: מונוטוניות במרווח ברצועת הרווח הדק | | | |');
  out.push('| כיול מחדש מול אומוייז ותיקים אמיתיים נוספים | | | |');
  out.push('| מתי להדליק METHOD_V2 | | | |');
  out.push('');

  const p = path.join(ROOT, 'reports', 'round-2-method-v2.md');
  fs.writeFileSync(p, out.join('\n'), 'utf8');
  console.log(JSON.stringify({ level, params, review: review.length, capexMedian: median(capexMoves) }, null, 1));
}

main();
