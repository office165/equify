/**
 * Round 3, part C: methodology 1 vs methodology 2 with the private company layer.
 *   npx tsx scripts/round-3/method-v2-compare.ts   -> writes reports/round-3-method-v2.md
 *
 * Same structure as scripts/round-2/method-v2-compare.ts. Differences:
 *   1. Component columns for the size premium (analysis only, not in V2) and for the
 *      marketability discount on the DCF leg.
 *   2. Calibration: every case in sbc_sync/calibration. Real cases stay out of git, so the report
 *      shows the case code and percentages from the target only.
 *   3. Plausibility against a "private company" range (Damodaran after marketability and size),
 *      next to the raw public company range.
 * Every number is a full engine run on the customer path inputs (static FX). Analysis only:
 * METHOD_V2 stays off in production.
 */
import fs from 'fs';
import path from 'path';
import { damodaranRange } from '../../lib/market-data/damodaran_2026';
import { computeValuation, type ValuationComputed, type ValuationInputs } from '../../lib/valuation';
import { continuousScaleFactor, V2_ALL, type V2Components } from '../../lib/valuation/method_v2';
import { resolveDlomFactor } from '../../lib/valuation/normalize_multiple';
import { DLOM_POLICY, SIZE_PREMIUM_STATUS } from '../../lib/valuation/private_company_layer';
import { buildValuationInputsFromEquifyState } from '../../lib/wizard/build_valuation_inputs';
import { syncFinancialsDerived } from '../../lib/wizard/financial_history';
import { ANCHOR_CASES, buildAllCases, buildSubsectorCases } from '../../tests/lib/cases';
import { buildWizardState, type CaseSpec } from '../../tests/lib/fixtures';
import { GOLDEN_CASES } from '../../tests/lib/golden';
import { withQuietConsole } from '../../tests/lib/quiet';
import { TEST_FX } from '../../tests/lib/run_case';
import { caseSpecFor, CLOSE_PCT, DEFAULT_DIR, runCalibration, summarize, validateCase, caseFiles } from '../calibration/run';

const ROOT = path.join(__dirname, '..', '..');

const STEPS: Array<{ key: string; label: string; add: Partial<V2Components> }> = [
  { key: 'w1', label: 'W1', add: { w1: true } },
  { key: 't1', label: 'T1', add: { t1: true } },
  { key: 'capex', label: 'בלי מנחית CAPEX', add: { noCapexGuard: true } },
  { key: 'r1', label: 'R1 (B, רצפה הדרגתית)', add: { r1: true, r1GradualFloor: true } },
  { key: 'size', label: 'גודל רציף', add: { continuousSize: true } },
  { key: 'rest', label: 'mature ומשקל רגל אפס', add: { matureRow: true, zeroLeg: true, manualReview: true } },
  { key: 'dlom', label: 'סחירות על ה DCF', add: { dcfMarketability: true } },
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
  /** V2 plus the verified bottom decile size premium (analysis only). */
  v2Size: ValuationComputed;
  steps: number[];
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
  const v2Size = run(inputs, { ...V2_ALL, sizePremiumDecile: true });
  return { spec, v1, v2: last, v2Size, steps, changePct: v1.equity > 0 ? ((last.equity - v1.equity) / v1.equity) * 100 : null };
}

const fmtM = (k: number) => `${(k / 1000).toFixed(2)}M`;
const fmtPct = (p: number | null) => (p == null || !Number.isFinite(p) ? 'n/a' : `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`);
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

/**
 * Section A4: the Damodaran EV/EBITDA range (public companies) after the private company
 * adjustments the engine applies to multiples: marketability (0.8, up to the company's factor by
 * size and stage) and the continuous size factor. Low end: 0.8; high end: the company's factor.
 */
function privateRange(spec: CaseSpec): { low: number; high: number } | undefined {
  const raw = damodaranRange(spec.sector, spec.subSector, 'evEbitda');
  if (!raw) return undefined;
  const revK = spec.y[2][0];
  const size = continuousScaleFactor(revK);
  return { low: raw.low * DLOM_POLICY.baseFactor * size, high: raw.high * resolveDlomFactor(spec.lifecycle, revK) * size };
}

function rangeText(r: { low: number; high: number } | undefined): string {
  return r ? `${r.low.toFixed(1)} עד ${r.high.toFixed(1)}` : 'אין מיפוי';
}

function caseTable(title: string, rows: Row[]): string[] {
  const out = [
    `### ${title}`,
    '',
    `| תיק | V1 | V2 | שינוי | ${STEPS.map((s) => s.label).join(' | ')} | פרמיית גודל (ניתוח, לא ב V2) | מכפיל EBITDA משתמע V1 / V2 | טווח אחרי התאמות לחברה פרטית | חברות ציבוריות (Damodaran, גולמי) |`,
    `|---|---|---|---|${STEPS.map(() => '---').join('|')}|---|---|---|---|`,
  ];
  for (const r of rows) {
    const base = r.v1.equity;
    const parts = r.steps.map((eq, i) => {
      const prev = i === 0 ? base : r.steps[i - 1];
      return base > 0 ? fmtPp(((eq - prev) / base) * 100) : `${fmtM(eq - prev)}`;
    });
    const sizePart = base > 0 ? fmtPp(((r.v2Size.equity - r.v2.equity) / base) * 100) : fmtM(r.v2Size.equity - r.v2.equity);
    const m1 = impliedMult(r.v1);
    const m2 = impliedMult(r.v2);
    out.push(
      `| ${r.spec.id} | ${fmtM(r.v1.equity)} | ${fmtM(r.v2.equity)} | ${fmtPct(r.changePct)} | ${parts.join(' | ')} | ${sizePart} | ${m1 == null ? 'n/a' : m1.toFixed(1)} / ${m2 == null ? 'n/a' : m2.toFixed(1)} | ${rangeText(privateRange(r.spec))} | ${rangeText(damodaranRange(r.spec.sector, r.spec.subSector, 'evEbitda'))} |`,
    );
  }
  out.push('');
  out.push('עמודות הרכיבים: נקודות אחוז מהשווי ב V1, מצטבר לפי הסדר משמאל לימין, וסכומן שווה לשינוי. עמודת פרמיית הגודל לא נכנסת לסכום: היא השינוי אם הפרמיה המאומתת של העשירון הקטן ב Damodaran (4.71%, שטוחה) הייתה מחליפה את שכבת הגודל של המערכת. בתיק ששוויו ב V1 הוא 0 הרכיבים בסכומים.');
  out.push('');
  return out;
}

function main(): void {
  const anchors = ANCHOR_CASES.map(evaluate);
  const golden = GOLDEN_CASES.map(evaluate);
  const subs = buildSubsectorCases().map(evaluate);
  const all = buildAllCases().map(evaluate);

  const out: string[] = [];
  out.push('# סבב 3: מתודולוגיה 1 מול מתודולוגיה 2 עם שכבת חברה פרטית');
  out.push('');
  out.push('נוצר על ידי `npx tsx scripts/round-3/method-v2-compare.ts`. כל מספר הוא הרצה מלאה של המנוע על אותם קלטים שנתיב הדוח מקבל (שערי מטבע קבועים). מתודולוגיה 2 כבויה בפרודקשן (`METHOD_V2` לא מוגדר). המבנה כמו `reports/round-2-method-v2.md`.');
  out.push('');
  out.push('## מה V2 עושה (אחרי סבב 3)');
  out.push('');
  out.push('1. T1, בלי מנחית CAPEX, W1, מקדם גודל רציף, שורת mature ובדיקה ידנית: כמו בסבב 2.');
  out.push('2. R1 לפי אפשרות B (החלטת צור): רק כשמכפיל ההכנסות הוא רגל משנית. בתוכנה, פינטק, סייבר ו marketplace נשאר המכפיל של V1, עם מקדם הגודל הרציף.');
  out.push('3. רצפת R1 הדרגתית (ממצא 26, אפשרות ב): העודף של רגל ההכנסות מעל רגל ה EBITDA יורד ליניארית עד אפס בגבול 5%, והמשקל מרגל EBITDA אפס עובר קודם לרגל ההכנסות. המונוטוניות במרווח עוברת בכל התיקים.');
  out.push(`4. הנחת סחירות על רגל ה DCF: אותו מקדם כמו ברגלי המכפילים (${DLOM_POLICY.baseFactor}, ועד ${DLOM_POLICY.maxFactor} בחברה בשלה לפי גודל). ה DCF מהוון בשיעורים של חברות ציבוריות, ולכן נותן ערך סחיר. מקור: Damodaran, Marketability and Value (2005): restricted stock 20% עד 35%, רכישות של חברות פרטיות במכפילים נמוכים ב 20% עד 30%.`);
  out.push(`5. פרמיית גודל: לא אומתה כפונקציה של גודל, ולכן לא ב V2. V2 משאיר את שכבת הגודל של המערכת. הערך המאומת היחיד, ${SIZE_PREMIUM_STATUS.smallestDecilePp}% לעשירון הקטן (Damodaran, ERP ספטמבר 2008, טבלה 7, 1927 עד 2007, סטיית תקן ${SIZE_PREMIUM_STATUS.smallestDecileStdErrPp}%), מוצג כעמודת ניתוח.`);
  out.push('');

  out.push('## 1. טבלה לפי תיק');
  out.push('');
  out.push(...caseTable('תיקי העוגן (7)', anchors));
  out.push(...caseTable('תיקי הזהב (14)', golden));
  out.push(...caseTable('תיק אחד לכל תת ענף (50)', subs));

  out.push('## 2. סיכום לפי ענף (כל 385 התיקים)');
  out.push('');
  out.push(`| ענף | תיקים | חציון שינוי | p10 עד p90 | ${STEPS.map((s) => `${s.label} (חציון)`).join(' | ')} | פרמיית גודל, ניתוח (חציון) |`);
  out.push(`|---|---|---|---|${STEPS.map(() => '---').join('|')}|---|`);
  const sectors = [...new Set(all.map((r) => r.spec.sector))];
  const stepPp = (r: Row, i: number) => ((r.steps[i] - (i === 0 ? r.v1.equity : r.steps[i - 1])) / r.v1.equity) * 100;
  const sizePp = (r: Row) => ((r.v2Size.equity - r.v2.equity) / r.v1.equity) * 100;
  for (const sec of sectors) {
    const xs = all.filter((r) => r.spec.sector === sec && r.v1.equity > 0);
    const ch = xs.map((r) => r.changePct!);
    out.push(`| ${sec} | ${xs.length} | ${fmtPct(median(ch))} | ${fmtPct(quantile(ch, 0.1))} עד ${fmtPct(quantile(ch, 0.9))} | ${STEPS.map((_, i) => fmtPp(median(xs.map((r) => stepPp(r, i))))).join(' | ')} | ${fmtPp(median(xs.map(sizePp)))} |`);
  }
  const pos = all.filter((r) => r.v1.equity > 0);
  const allCh = pos.map((r) => r.changePct!);
  const level = median(allCh);
  const levelWithSize = median(pos.map((r) => ((r.v2Size.equity - r.v1.equity) / r.v1.equity) * 100));
  out.push(`| **הכל** | ${pos.length} | ${fmtPct(level)} | ${fmtPct(quantile(allCh, 0.1))} עד ${fmtPct(quantile(allCh, 0.9))} | ${STEPS.map((_, i) => fmtPp(median(pos.map((r) => stepPp(r, i))))).join(' | ')} | ${fmtPp(median(pos.map(sizePp)))} |`);
  out.push('');
  out.push(`תיקים ששוויים ב V1 הוא 0 לא נכנסים לאחוזים (${all.length - pos.length} תיקים). חציון השינוי בסבב 2 (אפשרות A): +19.5%, ועם אפשרות B: +20.1%. עכשיו: ${fmtPct(level)}. אם הפרמיה המאומתת של העשירון הקטן הייתה מחליפה את שכבת הגודל: ${fmtPct(levelWithSize)}.`);
  out.push('');

  // Section 3: plausibility against private transactions (A4).
  out.push('## 3. בדיקת סבירות: מכפיל EBITDA משתמע מול טווח לחברה פרטית');
  out.push('');
  out.push('הטווח "אחרי התאמות לחברה פרטית" הוא טווח EV/EBITDA של Damodaran (Global ו Emerging, חברות ציבוריות) כפול ההתאמות שהמנוע עושה למכפילים: סחירות (0.8 בקצה התחתון, והמקדם של החברה לפי שלב וגודל בקצה העליון) ומקדם הגודל הרציף. הטווח הגולמי מוצג בנפרד, תחת "חברות ציבוריות", ואין לקרוא אותו כטווח שוק לעסק פרטי קטן. מקדם הגודל הרציף (0.88 עד 1.0) הוא של המערכת, בלי מקור חיצוני.');
  out.push('');
  const classify = (r: Row, c: ValuationComputed) => {
    const rg = privateRange(r.spec);
    const m = impliedMult(c);
    if (!rg || m == null) return 'n/a';
    return m < rg.low ? 'below' : m > rg.high ? 'above' : 'in';
  };
  const count = (c: 'v1' | 'v2', k: string) => pos.filter((r) => classify(r, r[c]) === k).length;
  const rawIn = (c: ValuationComputed, r: Row) => {
    const rg = damodaranRange(r.spec.sector, r.spec.subSector, 'evEbitda');
    const m = impliedMult(c);
    return rg && m != null && m >= rg.low && m <= rg.high;
  };
  out.push(`| | V1 | V2 |`);
  out.push('|---|---|---|');
  out.push(`| מתחת לטווח אחרי התאמות | ${count('v1', 'below')} | ${count('v2', 'below')} |`);
  out.push(`| בתוך הטווח אחרי התאמות | ${count('v1', 'in')} | ${count('v2', 'in')} |`);
  out.push(`| מעל הטווח אחרי התאמות | ${count('v1', 'above')} | ${count('v2', 'above')} |`);
  out.push(`| בלי מכפיל משתמע (EBITDA אפס או שלילי) או בלי מיפוי | ${count('v1', 'n/a')} | ${count('v2', 'n/a')} |`);
  out.push(`| בתוך הטווח הגולמי של חברות ציבוריות | ${pos.filter((r) => rawIn(r.v1, r)).length} | ${pos.filter((r) => rawIn(r.v2, r)).length} |`);
  out.push('');
  const ratio = (c: 'v1' | 'v2') =>
    median(
      pos
        .map((r) => {
          const rg = privateRange(r.spec);
          const m = impliedMult(r[c]);
          return rg && m != null ? m / rg.low : null;
        })
        .filter((x): x is number => x != null),
    );
  out.push(`חציון המכפיל המשתמע חלקי הקצה התחתון של הטווח אחרי התאמות: V1 ${ratio('v1').toFixed(2)}, V2 ${ratio('v2').toFixed(2)}. כלומר רוב התיקים נמצאים מתחת לטווח גם אחרי התאמות לחברה פרטית. הסיבה: מכפילי EBITDA של חברות ציבוריות (גם אחרי 20% סחירות ו 12% גודל) עדיין שייכים לחברות גדולות בהרבה. Damodaran מביא את Koeplin, Sarin ו Shapiro (2000): חברות פרטיות נרכשו במכפילי EBITDA נמוכים ב 20% עד 30% ממכפילי חברות ציבוריות דומות, אבל המדגם שם הוא של חברות גדולות יחסית. לעסקאות בעסקים קטנים אין לנו מקור מאומת (מאגרי עסקאות פרטיות נמכרים במנוי).`);
  out.push('');

  out.push('## 4. תיקים שנשלחים לבדיקה ידנית ב V2');
  out.push('');
  const review = all.filter((r) => r.v2.v2?.manualReview);
  const reasonHe: Record<string, string> = {
    'debt-exceeds-ev': 'חוב נטו גבוה מ EV',
    'equity-zero': 'שווי לבעלים 0',
    'equity-below-5pct-revenue': 'שווי לבעלים נמוך מ 5% מההכנסות',
  };
  out.push(`${review.length} מתוך ${all.length} תיקים (בסבב 2: 4).`);
  out.push('');
  out.push('| תיק | סיבות | שווי V1 | שווי V2 | EV ב V2 | חוב נטו | הכנסות |');
  out.push('|---|---|---|---|---|---|---|');
  for (const r of review) {
    out.push(`| ${r.spec.id} | ${r.v2.v2!.manualReview!.reasons.map((x) => reasonHe[x]).join(', ')} | ${fmtM(r.v1.equity)} | ${fmtM(r.v2.equity)} | ${fmtM(r.v2.ev)} | ${fmtM(r.spec.grossDebt - r.spec.cash)} | ${fmtM(r.spec.y[2][0])} |`);
  }
  out.push('');

  // Section 5: calibration (case codes and percentages only).
  out.push('## 5. כיול מול הערכות אמיתיות (`sbc_sync/calibration`)');
  out.push('');
  const cal = runCalibration(DEFAULT_DIR);
  out.push('התיקים אמיתיים ונמצאים מחוץ לגיט. כאן מופיעים רק קוד התיק והסטייה באחוזים ממרכז היעד; הטבלה המלאה ב `sbc_sync/calibration/results.md` (`npx tsx scripts/calibration/run.ts`).');
  out.push('');
  if (!cal.results.length) {
    out.push('אין תיקים בתיקיית הכיול.');
  } else {
    // Analysis column: the verified bottom decile size premium on top of V2.
    const sizeDev = new Map<string, number>();
    for (const f of caseFiles(DEFAULT_DIR)) {
      try {
        const c = validateCase(JSON.parse(fs.readFileSync(path.join(DEFAULT_DIR, f), 'utf8')));
        const eq = run(inputsFor(caseSpecFor(c)), { ...V2_ALL, sizePremiumDecile: true }).equity * 1000;
        sizeDev.set(c.caseCode, ((eq - c.target.value) / c.target.value) * 100);
      } catch {
        // reported by runCalibration
      }
    }
    out.push(`| תיק | שיטת היעד | סטייה V1 | סטייה V2 | V1 בטווח | V2 בטווח | V2 בתוך ${CLOSE_PCT}% | V2 עם פרמיית העשירון (ניתוח) |`);
    out.push('|---|---|---|---|---|---|---|---|');
    for (const r of cal.results) {
      const yn = (b: boolean | null) => (b == null ? 'אין טווח' : b ? 'כן' : 'לא');
      out.push(`| ${r.caseCode} | ${r.method}, ${r.by} | ${fmtPct(r.v1DevPct)} | ${fmtPct(r.v2DevPct)} | ${yn(r.v1InRange)} | ${yn(r.v2InRange)} | ${r.v2Close ? 'כן' : 'לא'} | ${fmtPct(sizeDev.get(r.caseCode) ?? null)} |`);
    }
    const s = summarize(cal.results);
    out.push('');
    out.push(`סטייה ממוצעת בערך מוחלט: V1 ${s.v1MeanAbsDevPct.toFixed(1)}%, V2 ${s.v2MeanAbsDevPct.toFixed(1)}%. חציונית: V1 ${s.v1MedianAbsDevPct.toFixed(1)}%, V2 ${s.v2MedianAbsDevPct.toFixed(1)}%. בתוך טווח היעד: V1 ${s.v1InRange} מתוך ${s.withRange}, V2 ${s.v2InRange} מתוך ${s.withRange}. V2 בתוך ${CLOSE_PCT}% מהמרכז: ${s.v2Close} מתוך ${s.cases}.`);
    if (cal.errors.length) out.push('', `קבצים שלא נקראו: ${cal.errors.map((e) => e.file).join(', ')}.`);
  }
  out.push('');

  out.push('## 6. המלצה');
  out.push('');
  out.push(fs.readFileSync(path.join(__dirname, 'method-v2-recommendation.md'), 'utf8').trim());
  out.push('');
  out.push('## 7. החלטות');
  out.push('');
  out.push('(צור ולירון ממלאים)');
  out.push('');
  out.push('| נושא | החלטה | מי | תאריך |');
  out.push('|---|---|---|---|');
  out.push('| פרמיית גודל: מקור לפי גודל (מנוי Kroll, או להשאיר את שכבת המערכת) | | | |');
  out.push('| הנחת סחירות על ה DCF (0.8 עד 0.9) | | | |');
  out.push('| העברת משקל מרגל EBITDA אפס לרגל ההכנסות קודם (חלק מהפתרון לממצא 26) | | | |');
  out.push('| תת הענף של CAL-001 ותיקי כיול נוספים | | | |');
  out.push('| מתי להדליק METHOD_V2 | | | |');
  out.push('');

  fs.writeFileSync(path.join(ROOT, 'reports', 'round-3-method-v2.md'), out.join('\n'), 'utf8');
  const summary = {
    level,
    levelWithSize,
    review: review.length,
    privateRange: { v1: { below: count('v1', 'below'), in: count('v1', 'in'), above: count('v1', 'above') }, v2: { below: count('v2', 'below'), in: count('v2', 'in'), above: count('v2', 'above') } },
    calibration: cal.results.map((r) => ({ code: r.caseCode, v1: r.v1DevPct, v2: r.v2DevPct, size: undefined })),
    dlomMedianPp: median(pos.map((r) => stepPp(r, STEPS.length - 1))),
  };
  console.log(JSON.stringify(summary, null, 1));
}

main();
