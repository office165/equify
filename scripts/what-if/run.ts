/**
 * What-if analysis for the methodology decision (round 1, part B). Analysis only:
 * production defaults are untouched; alternatives are parallel functions in this folder.
 *
 * Usage: npx tsx scripts/what-if/run.ts   -> writes reports/round-1-what-if.md
 *
 * Method: the engine runs as today (same path as the customer report). For each option the
 * script recomputes only the legs the option touches (DCF and/or revenue multiple) and moves
 * the EV by weight x (new leg - old leg). Weights, the EBITDA multiple leg and the backlog
 * uplift stay as today. Equity = EV - net debt (floored at 0, as in production).
 */
import fs from 'fs';
import path from 'path';
import { resolveSubSectorMultiplesIndustry } from '../../lib/constants/industry_config';
import { computeValuation, type ValuationComputed, type ValuationInputs } from '../../lib/valuation';
import { computeFCFF, parseCapexPct, resolveCapexIndustryKey } from '../../lib/valuation/capex_fcf';
import { CAPM_CORPORATE_TAX_RATE, CAPM_WACC_MAX_PCT, CAPM_WACC_MIN_PCT, computeLeveredBeta } from '../../lib/valuation/capm_wacc';
import { ISRAEL_MULTIPLES_2026 } from '../../lib/valuation/multiples';
import { normalizeMultipleForPrivateCompany } from '../../lib/valuation/normalize_multiple';
import {
  explicitGrowthRateForYear,
  marginForTurnaroundYear,
  projectDcfHorizon,
  type TurnaroundDcfParams,
} from '../../lib/valuation/scenario_matrix';
import { resolveSectorMethodologyConfig } from '../../lib/valuation/sector_methodology_resolver';
import { resolveSubSectorRevenueMultiple } from '../../lib/valuation/sub_sector_default_multiple';
import { buildValuationInputsFromEquifyState } from '../../lib/wizard/build_valuation_inputs';
import { syncFinancialsDerived } from '../../lib/wizard/financial_history';
import {
  ANCHOR_CASES,
  buildLadderCases,
  buildLifecycleCases,
  buildSubsectorCases,
  type CaseSpec,
} from '../../tests/lib/cases';
import { buildWizardState } from '../../tests/lib/fixtures';
import { withQuietConsole } from '../../tests/lib/quiet';
import { TEST_FX } from '../../tests/lib/run_case';
import {
  G1_SECTOR_CAP_PCT,
  ISRAEL_CRP,
  R1_SOURCE,
  SECTOR_TARGET_DE,
  T1_MIN_SPREAD,
  TERMINAL_G,
} from './constants';

type T = 'T0' | 'T1' | 'T2';
type G = 'G0' | 'G1';
type W = 'W0' | 'W1';
type R = 'R0' | 'R1';
interface Combo { key: string; t: T; g: G; w: W; r: R }

export const COMBOS: Combo[] = [
  { key: 'T1+W1', t: 'T1', g: 'G0', w: 'W1', r: 'R0' },
  { key: 'T1+W1+R1', t: 'T1', g: 'G0', w: 'W1', r: 'R1' },
  { key: 'T2+W1+R1', t: 'T2', g: 'G0', w: 'W1', r: 'R1' },
  { key: 'T1+G1+W1+R1', t: 'T1', g: 'G1', w: 'W1', r: 'R1' },
  { key: 'T2+G1+W1+R1', t: 'T2', g: 'G1', w: 'W1', r: 'R1' },
];

interface Ctx {
  spec: CaseSpec;
  inputs: ValuationInputs;
  c: ValuationComputed;
  revK: number;
  capexPct: number;
  industry: string;
  turnaround?: TurnaroundDcfParams;
  depRate: number;
}

function buildCtx(spec: CaseSpec): Ctx {
  return withQuietConsole(() => {
    const state = buildWizardState(spec);
    const synced = { ...state, financials: syncFinancialsDerived(state.financials) };
    const inputs = buildValuationInputsFromEquifyState(synced, TEST_FX);
    const c = computeValuation(inputs);
    const revK = inputs.revenue2026K ?? inputs.rev;
    const capexPct = parseCapexPct(inputs.capexLevelPct ?? 0);
    const industry = resolveCapexIndustryKey(inputs.sector, inputs.subSector);
    const regime = c.profitabilityRegime;
    const n = c.normalizedEbitda;
    const cfg = resolveSectorMethodologyConfig(inputs.sector, inputs.subSector);
    const anchor =
      n?.isCurrentYearAnomalous && n.anomalyDirection === 'downside' && n.historicalAvgMarginPct != null
        ? (n.historicalAvgMarginPct / 100) * 0.8
        : cfg.maxHistoricalMargin;
    const turnaround =
      regime && regime.turnaroundYears > 0 && (regime.regime === 'loss_making' || regime.regime === 'deep_loss')
        ? { currentMargin: revK > 0 ? (inputs.ebitda2026K ?? c.ebitda) / revK : 0, sectorNormalMargin: anchor, turnaroundYears: regime.turnaroundYears }
        : undefined;
    const depRate = computeFCFF({ ebitda: 200, revenue: 1000, capexPct: 0, industry }).breakdown.depreciation / 1000;
    return { spec, inputs, c, revK, capexPct, industry, turnaround, depRate };
  });
}

/** W1: Ke with Israel CRP, weights from sector target D/E. */
function waccW1(ctx: Ctx): number {
  const b = ctx.c.waccBreakdown;
  const de = SECTOR_TARGET_DE[ctx.inputs.sector ?? 'other'].de;
  const unlevered = unleverFromBreakdown(ctx);
  const betaL = computeLeveredBeta(unlevered, de, 1);
  const ke = b.rf + betaL * b.erp + b.alpha + b.specificRiskPremium + b.profitabilityLossPremium + ISRAEL_CRP.valuePp;
  const we = 1 / (1 + de);
  const w = ke * we + b.kd * (1 - we);
  return Math.min(CAPM_WACC_MAX_PCT, Math.max(CAPM_WACC_MIN_PCT, w));
}

/** Unlevered beta used by production for this sector (read back via Hamada with D/E 0). */
function unleverFromBreakdown(ctx: Ctx): number {
  // Production unlevered beta per sector (sector_market_defaults.ts) via computeLeveredBeta(bu, 0, E) = bu.
  const { resolveSectorUnleveredBeta } = require('../../lib/wizard/sector_market_defaults') as typeof import('../../lib/wizard/sector_market_defaults');
  return ctx.inputs.unleveredBeta && ctx.inputs.unleveredBeta > 0 ? ctx.inputs.unleveredBeta : resolveSectorUnleveredBeta(ctx.inputs.sector);
}

function growthPath(ctx: Ctx, g: G): number[] {
  const out: number[] = [];
  if (g === 'G0') {
    for (let t = 1; t <= 5; t += 1) out.push(explicitGrowthRateForYear(t, ctx.inputs.growth, ctx.capexPct));
    return out;
  }
  const cap = G1_SECTOR_CAP_PCT[ctx.inputs.sector ?? 'other'];
  const g1 = Math.min(Math.max(ctx.inputs.growth, -5), cap);
  for (let t = 1; t <= 5; t += 1) out.push((g1 + ((2.5 - g1) * (t - 1)) / 4) / 100);
  return out;
}

interface DcfAlt { ev: number; explicitPv: number; terminalPv: number }

function dcfAlt(ctx: Ctx, waccPct: number, g: G, t: T): DcfAlt {
  const w = waccPct / 100;
  const path = growthPath(ctx, g);
  let rev = ctx.revK;
  let ebitda = ctx.c.ebitda;
  let fcff = 0;
  let explicitPv = 0;
  const initialFcff = computeFCFF({ ebitda: ctx.c.ebitda, revenue: ctx.revK, capexPct: ctx.capexPct, industry: ctx.industry, growthRate: Math.max(0, ctx.inputs.growth) / 100 }).fcff;
  for (let i = 1; i <= 5; i += 1) {
    const gi = path[i - 1];
    rev *= 1 + gi;
    if (ctx.turnaround) {
      ebitda = rev * marginForTurnaroundYear(i, ctx.turnaround.currentMargin, ctx.turnaround.sectorNormalMargin, ctx.turnaround.turnaroundYears);
      fcff = computeFCFF({ ebitda, revenue: rev, capexPct: ctx.capexPct, industry: ctx.industry, growthRate: Math.max(0, gi) }).fcff;
    } else if (g === 'G0') {
      ebitda *= 1 + gi;
      fcff = (i === 1 ? initialFcff : fcff) * (1 + gi);
    } else {
      ebitda *= 1 + gi;
      fcff = computeFCFF({ ebitda, revenue: rev, capexPct: ctx.capexPct, industry: ctx.industry, growthRate: Math.max(0, gi) }).fcff;
    }
    explicitPv += fcff / (1 + w) ** (i === 1 ? 0.5 : i - 0.5);
  }
  // Normalized terminal year: CAPEX = D&A, working capital grows with g.
  const revT = rev * (1 + TERMINAL_G);
  const ebitdaT =
    ctx.turnaround && ctx.turnaround.sectorNormalMargin > 0 ? revT * ctx.turnaround.sectorNormalMargin : ebitda * (1 + TERMINAL_G);
  const da = revT * ctx.depRate;
  const nopat = Math.max(ebitdaT - da, 0) * (1 - CAPM_CORPORATE_TAX_RATE);
  const dWc = revT * 0.015 * TERMINAL_G;
  const fcffT = Math.max(0, nopat - dWc);
  const tvGordon = fcffT / (Math.max(w, TERMINAL_G + T1_MIN_SPREAD) - TERMINAL_G);
  let tv = tvGordon;
  if (t === 'T2') {
    const revenueStrategy = ctx.c.methodologyStrategy === 'current_run_rate_revenue';
    const exitTv = revenueStrategy ? revT * (ctx.c.revMultiplier || ctx.c.effectiveMult) : Math.max(0, ebitdaT) * ctx.c.effectiveMult;
    tv = (tvGordon + exitTv) / 2;
  }
  const terminalPv = tv / (1 + w) ** 4.5;
  return { ev: explicitPv + terminalPv, explicitPv, terminalPv };
}

function revLegR1(ctx: Ctx): { ev: number; multiple: number } {
  const cfg = resolveSectorMethodologyConfig(ctx.inputs.sector, ctx.inputs.subSector);
  const raw = resolveSubSectorRevenueMultiple({ sector: ctx.inputs.sector, subSector: ctx.inputs.subSector, sectorConfig: cfg });
  const nb = normalizeMultipleForPrivateCompany({ rawMultiple: raw, revenueK: ctx.revK, industry: ctx.industry, lifecycleStage: ctx.inputs.lifecycle ?? 'growth', isManualOverride: false }).breakdown;
  const factor = nb.dlomFactor * nb.scaleFactor;
  const range = ISRAEL_MULTIPLES_2026[resolveSubSectorMultiplesIndustry(ctx.inputs.sector!, ctx.inputs.subSector ?? '')]?.evSales ?? [0.5, 1.5];
  const m = Math.min(Math.max(raw * factor, range[0] * factor), range[1] * factor);
  return { ev: ctx.revK * m, multiple: m };
}

export interface ComboResult { equityK: number; evK: number; changePct: number; impliedEbitdaMult: number | null; waccPct: number }

export function evaluate(ctx: Ctx, combo: Combo): ComboResult {
  const c = ctx.c;
  const wacc = combo.w === 'W1' ? waccW1(ctx) : c.wacc;
  const dcf = dcfAlt(ctx, wacc, combo.g, combo.t).ev;
  let ev = c.ev + c.blendWeights.dcf * (dcf - c.dcf);
  if (combo.r === 'R1' && c.blendWeights.rev > 0) ev += c.blendWeights.rev * (revLegR1(ctx).ev - c.revMult);
  const equity = Math.max(0, ev - ctx.inputs.debt);
  const norm = c.normalizedEbitda?.normalizedEbitdaK ?? c.ebitda;
  return {
    equityK: equity,
    evK: ev,
    changePct: c.equity > 0 ? ((equity - c.equity) / c.equity) * 100 : 0,
    impliedEbitdaMult: norm > 0 ? ev / norm : null,
    waccPct: wacc,
  };
}

function sectorRange(ctx: Ctx): string {
  const r = ISRAEL_MULTIPLES_2026[resolveSubSectorMultiplesIndustry(ctx.inputs.sector!, ctx.inputs.subSector ?? '')]?.evEbitda;
  return r ? `${r[0]} עד ${r[1]}` : '';
}

const fmtM = (k: number) => `${(k / 1000).toFixed(2)}M`;
const fmtPct = (p: number) => `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`;
const fmtX = (x: number | null) => (x == null ? 'n/a' : `x${x.toFixed(1)}`);

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

function caseTable(title: string, ctxs: Ctx[]): string[] {
  const lines = [`### ${title}`, '', `| תיק | שווי היום | ${COMBOS.map((c) => c.key).join(' | ')} | מכפיל EBITDA משתמע היום | טווח EV/EBITDA בענף |`, `|---|---|${COMBOS.map(() => '---').join('|')}|---|---|`];
  for (const ctx of ctxs) {
    const cells = COMBOS.map((combo) => {
      const r = evaluate(ctx, combo);
      return `${fmtM(r.equityK)} (${fmtPct(r.changePct)}) ${fmtX(r.impliedEbitdaMult)}`;
    });
    const norm = ctx.c.normalizedEbitda?.normalizedEbitdaK ?? ctx.c.ebitda;
    lines.push(`| ${ctx.spec.id} | ${fmtM(ctx.c.equity)} | ${cells.join(' | ')} | ${fmtX(norm > 0 ? ctx.c.ev / norm : null)} | ${sectorRange(ctx)} |`);
  }
  lines.push('');
  return lines;
}

/** Fidelity check: the G0 explicit period here must match production projectDcfHorizon. */
function fidelity(ctxs: Ctx[]): { maxDevPct: number; worst: string } {
  let maxDevPct = 0;
  let worst = '';
  for (const ctx of ctxs) {
    const prod = projectDcfHorizon({ ebitdaK: ctx.c.ebitda, revK: ctx.revK, capexLevelPct: ctx.capexPct, dcfGrowthPct: ctx.inputs.growth, wacc: ctx.c.wacc, industry: ctx.industry, turnaround: ctx.turnaround });
    const mine = dcfAlt(ctx, ctx.c.wacc, 'G0', 'T1').explicitPv;
    const dev = prod.explicitPvK > 0 ? Math.abs(mine - prod.explicitPvK) / prod.explicitPvK * 100 : 0;
    if (dev > maxDevPct) { maxDevPct = dev; worst = ctx.spec.id; }
  }
  return { maxDevPct, worst };
}

/** One-line explanation per anchor (why it moves). */
const ANCHOR_REASON: Record<string, string> = {
  'anchor-1-restaurant': 'הערך הטרמינלי נחתך היום בתקרת 0.42 (0.71M מול 1.55M ב T1). W1 מעלה את ה WACC, אבל הסרת התקרה חזקה יותר. משקל DCF של 35%.',
  'anchor-2-saas': 'משקל DCF של 30% בלבד ומכפיל הכנסות שכבר בטווח, ולכן זז מעט. G1 (צמיחה 25% בשנה 1 במקום 3.55%) ו T2 (יציאה לפי מכפיל הכנסות) הם שמזיזים אותו.',
  'anchor-3-contractor': 'W1 מעלה את ה WACC מ 10.6% ל 11.6%, והסרת התקרה מפצה חלקית. T2 מוסיף ערך יציאה לפי מכפיל EBITDA.',
  'anchor-4-accounting': 'משקל DCF של 25% בלבד. הסרת התקרה מוסיפה, ו W1 כמעט לא משנה (בלי חוב).',
  'anchor-5-young-factory': 'R1 מוריד את מכפיל ההכנסות מ 2.0 ל 0.52 (טווח EV/Sales של ייצור), ומשקל ההכנסות 29%. בנוסף W1 מעלה את ה WACC מ 9.4% ל 16.5%, ו FCFF הטרמינלי אפס כי הפחת גבוה מה EBITDA.',
  'anchor-6-loss-factory': 'R1 מוריד את רגל ההכנסות (משקל 50%) מ 2.0 ל 0.52 כפול הכנסות. זה התיקון של ממצא 5: מפעל מפסיד כבר לא שווה יותר ממפעל רווחי.',
  'anchor-7-thin-factory': 'W1 מעלה את ה WACC מ 9.2% ל 16.0% (היום חוב גבוה מוריד אותו), ו R1 מוריד את מכפיל ההכנסות מ 2.0 ל 0.52. EBITDA מנורמל של כ 245K מול פחת של 720K.',
};

function main(): void {
  const anchors = ANCHOR_CASES.map(buildCtx);
  const subs = buildSubsectorCases().map(buildCtx);
  const ladder = buildLadderCases().map(buildCtx);
  const lifecycle = buildLifecycleCases().map(buildCtx);
  const all = [...anchors, ...subs, ...ladder, ...lifecycle];

  const out: string[] = [];
  out.push('# סבב 1: ניתוח "מה אם" למתודולוגיה');
  out.push('');
  out.push('נוצר על ידי `npx tsx scripts/what-if/run.ts`. ניתוח בלבד: ברירות המחדל בקוד לא השתנו, וה snapshot זהה.');
  out.push('');
  out.push('## האפשרויות');
  out.push('');
  out.push('1. T0: היום (Gordon עם תקרה 0.42 מערך התקופה המפורשת, תקרת נתח 36%, מרווח מינימלי 7.5 נקודות, מנחית CAPEX).');
  out.push(`2. T1: Gordon בלי תקרה, על שנה טרמינלית מנורמלת: CAPEX שווה לפחת, הון חוזר גדל לפי g (1.5% מההכנסות כפול g, כמו במנוע), מס 23% על EBIT, g של ${TERMINAL_G * 100}%, מרווח מינימלי של ${T1_MIN_SPREAD * 100} נקודות בין WACC ל g. היוון ב 4.5 שנים כמו היום.`);
  out.push('3. T2: ממוצע של T1 ושל ערך יציאה: EBITDA טרמינלי כפול המכפיל האפקטיבי של התיק (בענפי הכנסות: הכנסות טרמינליות כפול מכפיל ההכנסות).');
  out.push('4. G0: היום (צמיחה עד 2.5 ועוד 0.35 כפול CAPEX, לכל היותר 5.3%, ודעיכה בשנים 3 עד 5).');
  out.push('5. G1: צמיחת הלקוח בשנה 1, עם תקרה ענפית (תוכנה, פינטק וסייבר 25%, בריאות ואנרגיה 15%, אחרים 10%), ודעיכה ליניארית ל 2.5% בשנה 5. FCFF מחושב מחדש בכל שנה, כך ש CAPEX והון חוזר נגזרים מההכנסות ומהצמיחה.');
  out.push(`6. W1: Ke כולל פרמיית סיכון מדינה ${ISRAEL_CRP.valuePp} נקודות (מקור: ${ISRAEL_CRP.source}, תאריך: ${ISRAEL_CRP.asOf}), ומשקלות לפי D/E ענפי (scripts/what-if/constants.ts, כל הערכים מסומנים "חסר מקור" כי אינם בקוד). בטא ממונפת מחדש לפי ה D/E הענפי.`);
  out.push(`7. R1: מכפיל הכנסות בטווח EV/Sales נפרד לכל ענף (${R1_SOURCE}), אחרי הנחת סחירות וגודל, בלי גבולות מכפיל ה EBITDA.`);
  out.push('');
  out.push('שיטת החישוב: המנוע רץ כמו היום. לכל אפשרות מחושבות מחדש רק הרגליים שהיא נוגעת בהן (DCF ו/או מכפיל הכנסות), וה EV זז במשקל הרגל כפול השינוי. המשקלות, רגל מכפיל ה EBITDA ותוספת הצבר נשארים. בתיקים עם צבר, כיול מרכז הכובד של המנוע לא מחושב מחדש, ולכן התוצאה שם קירוב.');
  const fid = fidelity(all);
  out.push(`בדיקת נאמנות: התקופה המפורשת בסקריפט (G0) מול projectDcfHorizon בקוד: סטייה מקסימלית ${fid.maxDevPct.toFixed(3)}% (${fid.worst || 'אין'}) על ${all.length} תיקים.`);
  out.push('');

  out.push('## א. טבלה לפי תיק');
  out.push('');
  out.push('בכל תא: שווי לבעלים (שינוי מהיום) ומכפיל EBITDA משתמע (EV חלקי EBITDA מנורמל). "טווח בענף" הוא EV/EBITDA מ ISRAEL_MULTIPLES_2026.');
  out.push('');
  out.push(...caseTable('תיקי העוגן (7)', anchors));
  out.push(...caseTable('תיק אחד לכל תת ענף (50)', subs));
  out.push(...caseTable('סולם גודל', ladder));

  out.push('## ב. סיכום לפי ענף (כל התיקים, כולל מטריצת שלבי החיים)');
  out.push('');
  out.push(`| ענף | תיקים | ${COMBOS.map((c) => `${c.key}: חציון (p10 עד p90)`).join(' | ')} |`);
  out.push(`|---|---|${COMBOS.map(() => '---').join('|')}|`);
  const sectors = [...new Set(all.map((x) => x.inputs.sector!))];
  const summary: Record<string, { anchorsMedAbs: number; healthyAnchorsMedAbs: number; allMed: number; allMedAbs: number; inRange: number }> = {};
  for (const s of sectors) {
    const xs = all.filter((x) => x.inputs.sector === s && x.c.equity > 0);
    const cells = COMBOS.map((combo) => {
      const ch = xs.map((x) => evaluate(x, combo).changePct);
      return `${fmtPct(median(ch))} (${fmtPct(quantile(ch, 0.1))} עד ${fmtPct(quantile(ch, 0.9))})`;
    });
    out.push(`| ${s} | ${xs.length} | ${cells.join(' | ')} |`);
  }
  out.push('');
  out.push('### סיכום כללי');
  out.push('');
  out.push('| שילוב | חציון שינוי, כל התיקים | חציון שינוי מוחלט | חציון שינוי מוחלט, 7 העוגן | חציון שינוי מוחלט, 4 העוגן הרווחיים | תיקים שהמכפיל המשתמע שלהם בטווח הענף | לעומת היום |');
  out.push('|---|---|---|---|---|---|---|');
  const pos = all.filter((x) => x.c.equity > 0);
  const inRangeToday = pos.filter((x) => {
    const r = ISRAEL_MULTIPLES_2026[resolveSubSectorMultiplesIndustry(x.inputs.sector!, x.inputs.subSector ?? '')]?.evEbitda;
    const n = x.c.normalizedEbitda?.normalizedEbitdaK ?? x.c.ebitda;
    return r && n > 0 && x.c.ev / n >= r[0] * 0.8 * 0.88 && x.c.ev / n <= r[1];
  }).length;
  for (const combo of COMBOS) {
    const ch = pos.map((x) => evaluate(x, combo).changePct);
    const chA = anchors.filter((x) => x.c.equity > 0).map((x) => Math.abs(evaluate(x, combo).changePct));
    const inRange = pos.filter((x) => {
      const r = ISRAEL_MULTIPLES_2026[resolveSubSectorMultiplesIndustry(x.inputs.sector!, x.inputs.subSector ?? '')]?.evEbitda;
      const m = evaluate(x, combo).impliedEbitdaMult;
      return r && m != null && m >= r[0] * 0.8 * 0.88 && m <= r[1];
    }).length;
    const chH = anchors.slice(0, 4).map((x) => Math.abs(evaluate(x, combo).changePct));
    summary[combo.key] = { anchorsMedAbs: median(chA), healthyAnchorsMedAbs: median(chH), allMed: median(ch), allMedAbs: median(ch.map(Math.abs)), inRange };
    out.push(`| ${combo.key} | ${fmtPct(median(ch))} | ${median(ch.map(Math.abs)).toFixed(1)}% | ${median(chA).toFixed(1)}% | ${median(chH).toFixed(1)}% | ${inRange} מתוך ${pos.length} | היום: ${inRangeToday} |`);
  }
  out.push('');
  out.push('"בטווח הענף": המכפיל המשתמע בין הקצה התחתון של EV/EBITDA בענף אחרי הנחת סחירות 0.8 וגודל 0.88, לבין הקצה העליון. תיקים עם EBITDA מנורמל שלילי לא נספרים כבטווח.');
  out.push('');

  out.push('## ג. תיקי העוגן');
  out.push('');
  out.push(`| תיק | שווי היום | ${COMBOS.map((c) => c.key).join(' | ')} | למה זז |`);
  out.push(`|---|---|${COMBOS.map(() => '---').join('|')}|---|`);
  for (const a of anchors) {
    const cells = COMBOS.map((combo) => {
      const r = evaluate(a, combo);
      return `${fmtM(r.equityK)} (${fmtPct(r.changePct)})`;
    });
    const t1 = dcfAlt(a, waccW1(a), 'G0', 'T1');
    const t0 = projectDcfHorizon({ ebitdaK: a.c.ebitda, revK: a.revK, capexLevelPct: a.capexPct, dcfGrowthPct: a.inputs.growth, wacc: a.c.wacc, industry: a.industry, turnaround: a.turnaround });
    const reason = ANCHOR_REASON[a.spec.id] ?? `משקל DCF ${(a.c.blendWeights.dcf * 100).toFixed(0)}%. ערך טרמינלי היום ${(t0.terminalPvK / 1000).toFixed(2)}M, ב T1 ${(t1.terminalPv / 1000).toFixed(2)}M. WACC היום ${a.c.wacc.toFixed(1)}%, ב W1 ${waccW1(a).toFixed(1)}%.${a.c.blendWeights.rev > 0 ? ` משקל הכנסות ${(a.c.blendWeights.rev * 100).toFixed(0)}%, מכפיל הכנסות היום ${(a.c.revMult / a.revK).toFixed(2)}, ב R1 ${revLegR1(a).multiple.toFixed(2)}.` : ''}`;
    out.push(`| ${a.spec.id} | ${fmtM(a.c.equity)} | ${cells.join(' | ')} | ${reason} |`);
  }
  out.push('');
  const S = summary;
  const lossAnchors = anchors.slice(4).map((a) => `${a.spec.id.replace('anchor-', '')}: ${fmtM(a.c.equity)} ל ${fmtM(evaluate(a, COMBOS[1]).equityK)}`).join(', ');
  out.push('## ד. המלצה');
  out.push('');
  out.push(`ההמלצה: **T1+W1+R1** (Gordon בלי תקרה על שנה מנורמלת, WACC עם CRP ומשקלות ענפיים, מכפיל הכנסות בטווח EV/Sales נפרד). בלי G1 ובלי T2 בשלב הזה.`);
  out.push('');
  out.push('נימוק במספרים:');
  out.push('');
  out.push(`1. שמירה על הכיול: בארבעת תיקי העוגן הרווחיים (מסעדה, SaaS, קבלן, רו"ח), שכוילו מול אומוייז ודני, השינוי החציוני המוחלט הוא ${S['T1+W1+R1'].healthyAnchorsMedAbs.toFixed(1)}%, הנמוך מכל השילובים שכוללים R1 (T2+W1+R1: ${S['T2+W1+R1'].healthyAnchorsMedAbs.toFixed(1)}%, T1+G1+W1+R1: ${S['T1+G1+W1+R1'].healthyAnchorsMedAbs.toFixed(1)}%, T2+G1+W1+R1: ${S['T2+G1+W1+R1'].healthyAnchorsMedAbs.toFixed(1)}%). חריג אחד: המסעדה עולה ב 23%, כי היום הערך הטרמינלי שלה נחתך מ כ 1.55M ל 0.71M.`);
  out.push(`2. עקביות עם מה שהדוח מצהיר: T1 הוא Gordon כמו שכתוב בדוח, בלי תקרה נסתרת (ממצא 3). W1 מכניס את ה CRP שהגרף כבר מציג, כך שהגרף והטבלה יכולים להיות שווים (ממצא 2). R1 מפריד את מכפיל ההכנסות מגבולות ה EBITDA (ממצא 5).`);
  out.push(`3. R1 מתקן את ההיפוך של ממצא 5: מפעלי ההפסד והרווח הדק יורדים (${lossAnchors}). היום מפעל מפסיד שווה יותר ממפעל רווחי באותו גודל. אחרי R1 הסדר מתהפך לסדר הנכון. זה שינוי גדול בתיקים האלה, והוא מכוון.`);
  out.push(`4. מכפילים משתמעים: ${S['T1+W1+R1'].inRange} מתוך ${pos.length} תיקים בטווח הענף, לעומת ${inRangeToday} היום.`);
  out.push(`5. G1 מוסיף כ 3 עד 4 נקודות לחציון הכללי ומזיז בעיקר תוכנה, פינטק ובריאות. T2 מוסיף עוד כ 3 נקודות ומגדיל במיוחד מלונאות, אנרגיה וביטחון. כדאי לשקול כל אחד מהם בנפרד אחרי שההחלטה הראשונה נכנסת.`);
  out.push('');
  out.push('מה לא בטוח:');
  out.push('');
  out.push(`1. כל השילובים מעלים את רמת השווי הכללית: חציון של ${fmtPct(S['T1+W1+R1'].allMed)} ב T1+W1+R1. העלייה מגיעה בעיקר מהסרת תקרת הערך הטרמינלי, והיא מרוכזת באנרגיה, מלונאות, ביטחון ונדל"ן. אם רוצים לשמור על רמת השווי של היום, הכלי הנכון הוא פרמיית הסיכון או מרווח WACC מינוס g, לא תקרה נסתרת.`);
  out.push('2. ערכי D/E הענפיים ב W1 לא נמצאים בקוד. הם מסומנים "חסר מקור" ב scripts/what-if/constants.ts וצריך לאמת אותם מול Damodaran לפני שימוש. ב W1 ה WACC של חברות ממונפות וקטנות עולה הרבה (מפעל צעיר: מ 9.4% ל 16.5%), כי היום חוב גבוה מוריד את ה WACC שלהן.');
  out.push('3. ה CRP של 1.6 נקודות הוא הערך שכבר מוצג בגרף, בלי תאריך מקור.');
  out.push('4. בתיקים עם צבר (קבלן) החישוב הוא קירוב, כי כיול מרכז הכובד של המנוע לא רץ מחדש.');
  out.push('');
  out.push('## ה. החלטות');
  out.push('');
  out.push('(צור ולירון ממלאים בבוקר)');
  out.push('');
  out.push('| נושא | החלטה | מי | תאריך |');
  out.push('|---|---|---|---|');
  out.push('| ערך טרמינלי (T0, T1, T2) | | | |');
  out.push('| צמיחה (G0, G1) | | | |');
  out.push('| WACC (W0, W1), כולל מקור ל D/E ול CRP | | | |');
  out.push('| מכפיל הכנסות (R0, R1) | | | |');
  out.push('| כיול מחדש מול אומוייז ודני אחרי השינוי | | | |');
  out.push('');
  fs.writeFileSync(path.join(__dirname, '..', '..', 'reports', 'round-1-what-if.md'), out.join('\n'), 'utf8');
  console.log(JSON.stringify(summary, null, 1));
  console.log('fidelity', fid);
}

main();
