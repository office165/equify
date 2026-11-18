/**
 * Calibration against real valuations (round 3, part B).
 *
 *   npx tsx scripts/calibration/run.ts            -> reads sbc_sync/calibration/*.json
 *   CALIBRATION_DIR=<dir> npx tsx scripts/calibration/run.ts
 *
 * Every case file holds the wizard input and the target value (who, when, method). The cases are
 * real, so the folder is outside git (sbc_sync/ is in .gitignore) and so is the output,
 * <dir>/results.md. Only this script is in git. Each case runs through the customer report path
 * (mapWizardToValuationData, static FX) in methodology 1 and in methodology 2.
 *
 * A case with a target range is checked twice: is the result inside the range, and how far is it
 * from the center. Holdings and assets outside the operating business, which the engine does not
 * value (nonOperatingAssets), are added to the engine value before it is compared with the target. The script never fails on an empty or missing folder, and a broken case file is
 * reported and skipped.
 */
import fs from 'fs';
import path from 'path';
import { mapWizardToValuationData } from '../../lib/pdf-template/map-from-wizard';
import type { ValuationData } from '../../lib/pdf-template/types';
import type { EquifyGoalKey, EquifyLifecycleKey, EquifySectorKey } from '../../lib/valuation';
import { buildWizardState, type CaseSpec } from '../../tests/lib/fixtures';
import type { EquifyWizardState } from '../../lib/wizard/map_equify_wizard';
import { withQuietConsole } from '../../tests/lib/quiet';
import { TEST_FX } from '../../tests/lib/run_case';

export const ROOT = path.join(__dirname, '..', '..');
export const DEFAULT_DIR = path.join(ROOT, 'sbc_sync', 'calibration');
/** Methodology 2 is "close" when it is within this share of the target center. */
export const CLOSE_PCT = 15;

export interface CalibrationCase {
  /** Case code only, never a customer name. */
  caseCode: string;
  note?: string;
  wizard: {
    sector: EquifySectorKey;
    /** Empty when the sub-sector is not known (the engine then uses the sector defaults). */
    subSector: string;
    lifecycle: EquifyLifecycleKey;
    currency?: 'ILS' | 'USD' | 'EUR';
    /** Full currency units (not thousands). */
    years: Record<'2024' | '2025' | '2026', { revenue: number; ebitda: number }>;
    growthPct: number;
    grossDebt: number;
    cash: number;
    ownerSalaryNormalization: number;
    capexLevelPct: number;
    backlogSigned: number;
    recurringPct: number;
    topCustomerPct: number;
    founderDependency: boolean;
    strongCompetition: boolean;
    ipProtection: boolean;
    longTermContracts: boolean;
    goal?: EquifyGoalKey;
  };
  /**
   * Holdings and assets outside the operating business that the target includes and the engine does
   * not value (for example a stake in a subsidiary). Added to the engine value. Optional.
   */
  nonOperatingAssets?: {
    value: number;
    low?: number;
    high?: number;
    note?: string;
    /**
     * Round 4: the holding as the wizard asks it. When given, the value comes from the engine
     * (CREDIT_CHAPTER path: estimated value x share, or pre-tax profit x the industry multiple after
     * marketability x share), the same way as in the product, and `value` is shown for reference.
     */
    engine?: { holdingPct: number; preTaxProfit?: number; estimatedValue?: number };
  };
  target: {
    /** Center of the target (full currency units). */
    value: number;
    low?: number;
    high?: number;
    /** What the target values: equity (default) or enterprise value. */
    basis?: 'equity' | 'ev';
    /** Who made the valuation (organization, not a person's name). */
    by: string;
    method: string;
    source: string;
    /** Date of the valuation, or null when it was not given. */
    date: string | null;
    approved?: boolean;
  };
}

export interface CaseResult {
  file: string;
  caseCode: string;
  /** Engine value (equity or EV) without the non-operating assets. */
  v1Engine: number;
  v2Engine: number;
  /** Non-operating assets added to the engine value (0 when the case has none). */
  nonOperating: number;
  /** Round 4: 'engine' when the engine valued the holding, 'fixed' when the case value was added. */
  nonOperatingSource?: 'engine' | 'fixed';
  /** Round 4: the case's own value, shown next to the engine's. */
  nonOperatingFixed?: number;
  nonOperatingLow?: number;
  nonOperatingHigh?: number;
  /** Engine value plus non-operating assets: what is compared with the target. */
  v1: number;
  v2: number;
  target: number;
  low?: number;
  high?: number;
  basis: 'equity' | 'ev';
  v1DevPct: number;
  v2DevPct: number;
  v1InRange: boolean | null;
  v2InRange: boolean | null;
  v2Close: boolean;
  by: string;
  method: string;
  date: string | null;
}

export interface CalibrationRun {
  dir: string;
  results: CaseResult[];
  errors: Array<{ file: string; error: string }>;
}

function fail(msg: string): never {
  throw new Error(msg);
}

function num(x: unknown, field: string): number {
  if (typeof x !== 'number' || !Number.isFinite(x)) fail(`${field}: number expected`);
  return x;
}

export function validateCase(raw: unknown): CalibrationCase {
  const c = raw as CalibrationCase;
  if (!c || typeof c !== 'object') fail('not an object');
  if (typeof c.caseCode !== 'string' || !c.caseCode.trim()) fail('caseCode missing');
  const w = c.wizard ?? fail('wizard missing');
  if (typeof w.sector !== 'string') fail('wizard.sector missing');
  if (typeof w.subSector !== 'string') fail('wizard.subSector missing (use "" when unknown)');
  if (typeof w.lifecycle !== 'string') fail('wizard.lifecycle missing');
  for (const y of ['2024', '2025', '2026'] as const) {
    const v = w.years?.[y] ?? fail(`wizard.years.${y} missing`);
    num(v.revenue, `wizard.years.${y}.revenue`);
    num(v.ebitda, `wizard.years.${y}.ebitda`);
  }
  for (const f of ['growthPct', 'grossDebt', 'cash', 'ownerSalaryNormalization', 'capexLevelPct', 'backlogSigned', 'recurringPct', 'topCustomerPct'] as const) {
    num(w[f], `wizard.${f}`);
  }
  for (const f of ['founderDependency', 'strongCompetition', 'ipProtection', 'longTermContracts'] as const) {
    if (typeof w[f] !== 'boolean') fail(`wizard.${f}: true or false expected`);
  }
  const t = c.target ?? fail('target missing');
  num(t.value, 'target.value');
  if (!(t.value > 0)) fail('target.value must be above 0');
  if (t.low != null) num(t.low, 'target.low');
  if (t.high != null) num(t.high, 'target.high');
  if (t.low != null && t.high != null && !(t.low <= t.value && t.value <= t.high)) fail('target: low <= value <= high expected');
  if (typeof t.by !== 'string' || typeof t.method !== 'string' || typeof t.source !== 'string') fail('target.by, target.method and target.source are required');
  const n = c.nonOperatingAssets;
  if (n != null) {
    num(n.value, 'nonOperatingAssets.value');
    if (n.value < 0) fail('nonOperatingAssets.value must be 0 or above');
    if (n.low != null) num(n.low, 'nonOperatingAssets.low');
    if (n.high != null) num(n.high, 'nonOperatingAssets.high');
    if (n.low != null && n.high != null && !(n.low <= n.value && n.value <= n.high)) fail('nonOperatingAssets: low <= value <= high expected');
    if (n.engine != null) {
      num(n.engine.holdingPct, 'nonOperatingAssets.engine.holdingPct');
      if (n.engine.holdingPct <= 0 || n.engine.holdingPct > 100) fail('nonOperatingAssets.engine.holdingPct: 0 to 100 expected');
      if (n.engine.preTaxProfit == null && n.engine.estimatedValue == null) fail('nonOperatingAssets.engine: preTaxProfit or estimatedValue expected');
    }
  }
  return c;
}

const k = (x: number) => x / 1000;

export function caseSpecFor(c: CalibrationCase): CaseSpec {
  const w = c.wizard;
  return {
    id: c.caseCode,
    group: 'calibration',
    sector: w.sector,
    subSector: w.subSector,
    lifecycle: w.lifecycle,
    y: [
      [k(w.years['2024'].revenue), k(w.years['2024'].ebitda)],
      [k(w.years['2025'].revenue), k(w.years['2025'].ebitda)],
      [k(w.years['2026'].revenue), k(w.years['2026'].ebitda)],
    ],
    growth: w.growthPct,
    grossDebt: k(w.grossDebt),
    cash: k(w.cash),
    owner: k(w.ownerSalaryNormalization),
    capex: w.capexLevelPct,
    backlog: k(w.backlogSigned),
    recurring: w.recurringPct,
    top: w.topCustomerPct,
    founderDep: w.founderDependency,
    competition: w.strongCompetition,
    ip: w.ipProtection,
    contracts: w.longTermContracts,
    goal: w.goal ?? 'negotiation',
    currency: w.currency ?? 'ILS',
  };
}

/** The wizard state of a case; with an engine holding, the round 4 credit answer for it. */
export function caseStateFor(c: CalibrationCase): EquifyWizardState {
  const state = buildWizardState(caseSpecFor(c));
  const e = c.nonOperatingAssets?.engine;
  if (e) {
    state.credit = {
      monthlyDebtServiceK: 0,
      ownerLoans: { has: false, amountK: 0 },
      liens: { has: false, holder: '', type: '' },
      nonOperating: { has: true, holdingPct: e.holdingPct, preTaxProfitK: k(e.preTaxProfit ?? 0), estimatedValueK: k(e.estimatedValue ?? 0) },
    };
  }
  return state;
}

function runPath(c: CalibrationCase, method: 'v1' | 'v2'): ValuationData {
  const before = process.env.METHOD_V2;
  const beforeCredit = process.env.CREDIT_CHAPTER;
  process.env.METHOD_V2 = method === 'v2' ? 'on' : 'off';
  // The holding goes through the engine only when the case gives it the wizard way.
  process.env.CREDIT_CHAPTER = c.nonOperatingAssets?.engine ? 'on' : 'off';
  try {
    return withQuietConsole(() => mapWizardToValuationData(caseStateFor(c), `CAL-${c.caseCode}`, 'he', TEST_FX));
  } finally {
    if (before == null) delete process.env.METHOD_V2;
    else process.env.METHOD_V2 = before;
    if (beforeCredit == null) delete process.env.CREDIT_CHAPTER;
    else process.env.CREDIT_CHAPTER = beforeCredit;
  }
}

export function evaluateCase(c: CalibrationCase, file: string): CaseResult {
  const basis = c.target.basis ?? 'equity';
  const d1 = runPath(c, 'v1');
  const d2 = runPath(c, 'v2');
  const engineHolding = Boolean(c.nonOperatingAssets?.engine) && basis === 'equity';
  // Engine value without the holding; the holding is added once, from the engine or from the case.
  const pick = (d: ValuationData) => (basis === 'ev' ? d.enterpriseValue : d.equity - (engineHolding ? d.nonOperatingAssets?.value ?? 0 : 0));
  const v1Engine = pick(d1);
  const v2Engine = pick(d2);
  const nonOperating = engineHolding ? d1.nonOperatingAssets?.value ?? 0 : c.nonOperatingAssets?.value ?? 0;
  const nonOperatingV2 = engineHolding ? d2.nonOperatingAssets?.value ?? 0 : nonOperating;
  const v1 = v1Engine + nonOperating;
  const v2 = v2Engine + nonOperatingV2;
  const t = c.target.value;
  const inRange = (v: number) => (c.target.low != null && c.target.high != null ? v >= c.target.low && v <= c.target.high : null);
  const v2DevPct = ((v2 - t) / t) * 100;
  return {
    file,
    caseCode: c.caseCode,
    v1Engine,
    v2Engine,
    nonOperating,
    ...(c.nonOperatingAssets ? { nonOperatingSource: engineHolding ? ('engine' as const) : ('fixed' as const), nonOperatingFixed: c.nonOperatingAssets.value } : {}),
    nonOperatingLow: c.nonOperatingAssets?.low,
    nonOperatingHigh: c.nonOperatingAssets?.high,
    v1,
    v2,
    target: t,
    low: c.target.low,
    high: c.target.high,
    basis,
    v1DevPct: ((v1 - t) / t) * 100,
    v2DevPct,
    v1InRange: inRange(v1),
    v2InRange: inRange(v2),
    v2Close: Math.abs(v2DevPct) <= CLOSE_PCT,
    by: c.target.by,
    method: c.target.method,
    date: c.target.date ?? null,
  };
}

/** Case files: *.json in the folder, except TEMPLATE.json. */
export function caseFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.json') && f !== 'TEMPLATE.json')
    .sort();
}

export function runCalibration(dir: string = DEFAULT_DIR): CalibrationRun {
  const results: CaseResult[] = [];
  const errors: CalibrationRun['errors'] = [];
  for (const file of caseFiles(dir)) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      results.push(evaluateCase(validateCase(raw), file));
    } catch (e) {
      errors.push({ file, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { dir, results, errors };
}

function median(xs: number[]): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const fmtM = (x: number) => `${(x / 1e6).toFixed(2)}M`;
const fmtPct = (p: number) => (Number.isFinite(p) ? `${p >= 0 ? '+' : ''}${p.toFixed(1)}%` : 'n/a');
const fmtNonOp = (r: CaseResult) =>
  r.nonOperating > 0 || r.nonOperatingLow != null
    ? `${fmtM(r.nonOperating)}${r.nonOperatingSource === 'engine' ? ` (מנוע; בתיק ${fmtM(r.nonOperatingFixed ?? 0)})` : ''}${r.nonOperatingLow != null && r.nonOperatingHigh != null ? ` (${fmtM(r.nonOperatingLow)} עד ${fmtM(r.nonOperatingHigh)})` : ''}`
    : 'אין';
const fmtAbs = (p: number) => (Number.isFinite(p) ? `${p.toFixed(1)}%` : 'n/a');
const yesNo = (b: boolean | null) => (b == null ? 'אין טווח' : b ? 'כן' : 'לא');

export interface CalibrationSummary {
  cases: number;
  v1MeanAbsDevPct: number;
  v1MedianAbsDevPct: number;
  v2MeanAbsDevPct: number;
  v2MedianAbsDevPct: number;
  v1MeanDevPct: number;
  v2MeanDevPct: number;
  v2InRange: number;
  v1InRange: number;
  withRange: number;
  v2Close: number;
}

export function summarize(results: CaseResult[]): CalibrationSummary {
  const abs1 = results.map((r) => Math.abs(r.v1DevPct));
  const abs2 = results.map((r) => Math.abs(r.v2DevPct));
  const ranged = results.filter((r) => r.v2InRange != null);
  return {
    cases: results.length,
    v1MeanAbsDevPct: mean(abs1),
    v1MedianAbsDevPct: median(abs1),
    v2MeanAbsDevPct: mean(abs2),
    v2MedianAbsDevPct: median(abs2),
    v1MeanDevPct: mean(results.map((r) => r.v1DevPct)),
    v2MeanDevPct: mean(results.map((r) => r.v2DevPct)),
    v2InRange: ranged.filter((r) => r.v2InRange).length,
    v1InRange: ranged.filter((r) => r.v1InRange).length,
    withRange: ranged.length,
    v2Close: results.filter((r) => r.v2Close).length,
  };
}

export function resultsMarkdown(run: CalibrationRun, now: Date = new Date()): string {
  const out: string[] = [
    '# תוצאות כיול: V1 מול V2',
    '',
    `נוצר על ידי \`npx tsx scripts/calibration/run.ts\` ב ${now.toISOString().slice(0, 16).replace('T', ' ')} (UTC). התיקייה והקובץ הזה מחוץ לגיט.`,
    '',
  ];
  if (!run.results.length) {
    out.push('אין תיקים בתיקייה. להוספת תיק: להעתיק את TEMPLATE.json לקובץ חדש ולמלא לפי ההסבר בתוכו.');
  } else {
    out.push(
      '| תיק | בסיס | V1 מנוע | V2 מנוע | נכסים מחוץ לפעילות | V1 כולל | V2 כולל | יעד (מרכז) | טווח | סטייה V1 | סטייה V2 | V1 בטווח | V2 בטווח | V2 בתוך 15% | ממי, שיטה, תאריך |',
      '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
    );
    for (const r of run.results) {
      const range = r.low != null && r.high != null ? `${fmtM(r.low)} עד ${fmtM(r.high)}` : 'אין';
      out.push(
        `| ${r.caseCode} | ${r.basis === 'ev' ? 'EV' : 'שווי לבעלים'} | ${fmtM(r.v1Engine)} | ${fmtM(r.v2Engine)} | ${fmtNonOp(r)} | ${fmtM(r.v1)} | ${fmtM(r.v2)} | ${fmtM(r.target)} | ${range} | ${fmtPct(r.v1DevPct)} | ${fmtPct(r.v2DevPct)} | ${yesNo(r.v1InRange)} | ${yesNo(r.v2InRange)} | ${r.v2Close ? 'כן' : 'לא'} | ${r.by}, ${r.method}, ${r.date ?? 'תאריך לא צוין'} |`,
      );
    }
    const s = summarize(run.results);
    out.push(
      '',
      '## סיכום',
      '',
      '| | V1 | V2 |',
      '|---|---|---|',
      `| סטייה ממוצעת (בערך מוחלט) | ${fmtAbs(s.v1MeanAbsDevPct)} | ${fmtAbs(s.v2MeanAbsDevPct)} |`,
      `| סטייה חציונית (בערך מוחלט) | ${fmtAbs(s.v1MedianAbsDevPct)} | ${fmtAbs(s.v2MedianAbsDevPct)} |`,
      `| סטייה ממוצעת (עם סימן) | ${fmtPct(s.v1MeanDevPct)} | ${fmtPct(s.v2MeanDevPct)} |`,
      `| בתוך טווח היעד | ${s.v1InRange} מתוך ${s.withRange} | ${s.v2InRange} מתוך ${s.withRange} |`,
      '',
      `V2 בתוך ${CLOSE_PCT}% ממרכז היעד: ${s.v2Close} מתוך ${s.cases} תיקים.`,
    );
  }
  const withNonOpRange = run.results.filter((r) => r.nonOperatingLow != null && r.nonOperatingHigh != null);
  if (withNonOpRange.length) {
    out.push(
      '',
      '## רגישות לנכסים מחוץ לפעילות',
      '',
      'השווי הכולל כשהנכסים מחוץ לפעילות בקצה התחתון ובקצה העליון של הטווח שלהם.',
      '',
      '| תיק | V1 כולל | V2 כולל | סטייה V1 | סטייה V2 |',
      '|---|---|---|---|---|',
    );
    for (const r of withNonOpRange) {
      const lo = r.nonOperatingLow!;
      const hi = r.nonOperatingHigh!;
      const dev = (v: number) => fmtPct(((v - r.target) / r.target) * 100);
      out.push(
        `| ${r.caseCode} | ${fmtM(r.v1Engine + lo)} עד ${fmtM(r.v1Engine + hi)} | ${fmtM(r.v2Engine + lo)} עד ${fmtM(r.v2Engine + hi)} | ${dev(r.v1Engine + lo)} עד ${dev(r.v1Engine + hi)} | ${dev(r.v2Engine + lo)} עד ${dev(r.v2Engine + hi)} |`,
      );
    }
  }
  if (run.errors.length) {
    out.push('', '## קבצים שלא נקראו', '');
    for (const e of run.errors) out.push(`* ${e.file}: ${e.error}`);
  }
  out.push('');
  return out.join('\n');
}

function main(): void {
  const dir = process.env.CALIBRATION_DIR ? path.resolve(process.env.CALIBRATION_DIR) : DEFAULT_DIR;
  const run = runCalibration(dir);
  const md = resultsMarkdown(run);
  if (fs.existsSync(dir)) {
    fs.writeFileSync(path.join(dir, 'results.md'), md);
    console.log(`results: ${path.relative(ROOT, path.join(dir, 'results.md'))}`);
  } else {
    console.log(`calibration folder not found: ${path.relative(ROOT, dir)} (nothing to run)`);
  }
  console.log(md);
}

if (require.main === module) main();
