/**
 * Round 7 (OPUS_NARRATIVE): the facts the model gets, and the only numbers it may write.
 *
 * Built from the engine output only (ValuationData). No company name, contact details, report id or
 * free text from the client: the sector and a size band are the only descriptive fields.
 * Every number is given as the exact string the report shows ("8.1M ₪", "13.4%", "×2.7"), and the
 * guard (narrative_guard.ts) accepts only those strings.
 *
 * "What the value rests on": three assumptions and how far each must move for the equity value to
 * fall by 30%, computed here in code with the Excel appendix formulas (lib/excel/appendix_model.ts),
 * not by the model.
 */
import { buildAppendixModel, evaluateModel, splitRef, type AppendixModel } from '../excel/appendix_model';
import type { ValuationData } from '../pdf-template/types';
import { formatCurrencyShort } from '../utils/formatCurrency';

export const VALUE_DROP = 0.3;

export interface ValueDriver {
  key: 'wacc' | 'ebitda_multiple' | 'revenue_multiple' | 'ebitda_level';
  label: string;
  /** Plain description of the move, built from the numbers below. */
  move: string;
  reachable: boolean;
  numbers: string[];
}

export interface NarrativeFacts {
  sector: string;
  sizeBand: string;
  currency: string;
  numbers: Record<string, string>;
  scenarios: { bear: string; base: string; bull: string };
  methods: Array<{ method: string; weight: string; value: string }>;
  netPosition: 'net_debt' | 'net_cash';
  drivers: ValueDriver[];
  valueDropPct: string;
}

function pct(v: number, d = 1): string {
  return `${v.toFixed(d)}%`;
}

function money(v: number, currency: string): string {
  return formatCurrencyShort(v, currency);
}

function sizeBand(revenue: number): string {
  if (revenue < 5e6) return 'עסק קטן (הכנסות של עד 5 מיליון)';
  if (revenue < 50e6) return 'עסק קטן עד בינוני (הכנסות של 5 עד 50 מיליון)';
  if (revenue < 300e6) return 'עסק בינוני (הכנסות של 50 עד 300 מיליון)';
  return 'עסק גדול (הכנסות של מעל 300 מיליון)';
}

function equityWith(model: AppendixModel, overrides: Map<string, number>): number {
  const ev = evaluateModel(model, overrides);
  const r = splitRef(model.keys.equity);
  return ev.value(r.sheet, r.addr);
}

function bisect(f: (x: number) => number, lo: number, hi: number, target: number): number {
  // f is monotone between lo and hi; returns x with f(x) close to target.
  let a = lo;
  let b = hi;
  const fa = f(a);
  for (let i = 0; i < 60; i += 1) {
    const m = (a + b) / 2;
    const fm = f(m);
    if ((fm - target) * (fa - target) > 0) a = m;
    else b = m;
  }
  return (a + b) / 2;
}

/** The three drivers and how far each must move for equity to fall by VALUE_DROP. */
export function computeDrivers(data: ValuationData, model: AppendixModel | null = buildAppendixModel(data)): ValueDriver[] {
  if (!model || data.equity <= 0) return [];
  const cur = data.currency ?? 'ILS';
  const target = data.equity * (1 - VALUE_DROP);
  const ref = (key: string) => {
    const r = model.assumptionRefs.get(key);
    if (!r) throw new Error(`no assumption ${key}`);
    const s = splitRef(r);
    return `${s.sheet}!${s.addr}`;
  };
  const waccKey = (() => {
    const s = splitRef(model.keys.wacc);
    return `${s.sheet}!${s.addr}`;
  })();
  const w0 = data.waccPct / 100;
  const drivers: ValueDriver[] = [];

  // 1. WACC up (DCF leg only; the other methods do not use WACC).
  const fW = (w: number) => equityWith(model, new Map([[waccKey, w]]));
  // A reasonable range: up to 10 points above today's WACC.
  const wHi = w0 + 0.1;
  if (fW(wHi) <= target) {
    const w = bisect(fW, w0, wHi, target);
    const d = (w - w0) * 100;
    drivers.push({
      key: 'wacc', label: 'עלות ההון (WACC)', reachable: true,
      move: `WACC שעולה ב ${d.toFixed(1)} נקודות אחוז, מ ${pct(w0 * 100)} ל ${pct(w * 100)}`,
      numbers: [d.toFixed(1), pct(w0 * 100), pct(w * 100)],
    });
  } else {
    drivers.push({
      key: 'wacc', label: 'עלות ההון (WACC)', reachable: false,
      move: `גם עלייה של 10 נקודות אחוז ב WACC לא מורידה את השווי ב 30%, כי משקל ה DCF בשקלול הוא ${pct((data.financialCore?.blendWeights.dcf ?? 0) * 100)}`,
      numbers: ['10', pct((data.financialCore?.blendWeights.dcf ?? 0) * 100)],
    });
  }

  // 2. The multiple with the larger weight down (EBITDA multiple, or revenue multiple for revenue-led cases).
  const wts = data.financialCore?.blendWeights;
  const revenueLed = (wts?.rev ?? 0) > (wts?.ebitda ?? 0);
  const mKey = revenueLed ? 'revMult' : 'ebitdaMult';
  const mLabel = revenueLed ? 'מכפיל ההכנסות' : 'מכפיל ה EBITDA';
  const mName = revenueLed ? 'מכפיל הכנסות' : 'מכפיל EBITDA';
  const mRef = ref(mKey);
  const m0 = revenueLed ? data.revenueMultiple ?? 0 : data.effectiveMult;
  const mWeight = pct(((revenueLed ? wts?.rev : wts?.ebitda) ?? 0) * 100);
  const fM = (m: number) => equityWith(model, new Map([[mRef, m]]));
  if (m0 > 0 && fM(0) <= target) {
    const m = bisect(fM, m0, 0, target);
    const dPct = (1 - m / m0) * 100;
    drivers.push({
      key: revenueLed ? 'revenue_multiple' : 'ebitda_multiple', label: mLabel, reachable: true,
      move: `${mName} שיורד ב ${dPct.toFixed(0)}%, מ ×${m0.toFixed(1)} ל ×${m.toFixed(1)}`,
      numbers: [`${dPct.toFixed(0)}%`, `×${m0.toFixed(1)}`, `×${m.toFixed(1)}`],
    });
  } else {
    drivers.push({
      key: revenueLed ? 'revenue_multiple' : 'ebitda_multiple', label: mLabel, reachable: false,
      move: `גם ${mName} של אפס לא מוריד את השווי ב 30%, כי משקל השיטה בשקלול הוא ${mWeight}`,
      numbers: [mWeight],
    });
  }

  // 3. EBITDA level down (the EBITDA base and the forecast cash flows move by the same share).
  const baseRef = ref('ebitdaBase');
  const fcffRefs = data.dcfRows.map((_, i) => ref(`fcff${i}`));
  const base0 = data.financialCore!.multipleLegEbitdaBaseAbs;
  const fcff0 = data.dcfRows.map((r) => r.fcffM * 1e6);
  const fK = (k: number) =>
    equityWith(model, new Map<string, number>([[baseRef, base0 * k], ...fcffRefs.map((r, i) => [r, fcff0[i]! * k] as [string, number])]));
  if (fK(0) <= target) {
    const k = bisect(fK, 1, 0, target);
    const dPct = (1 - k) * 100;
    drivers.push({
      key: 'ebitda_level', label: 'רמת ה EBITDA', reachable: true,
      move: `EBITDA שיורד ב ${dPct.toFixed(0)}% (מ ${money(base0, cur)} ל ${money(base0 * k, cur)} בבסיס המכפיל), כשהתזרים בתחזית יורד באותו שיעור`,
      numbers: [`${dPct.toFixed(0)}%`, money(base0, cur), money(base0 * k, cur)],
    });
  } else {
    drivers.push({
      key: 'ebitda_level', label: 'רמת ה EBITDA', reachable: false,
      move: 'גם ירידה של ה EBITDA לאפס לא מורידה את השווי ב 30%',
      numbers: [],
    });
  }
  return drivers;
}

export function buildNarrativeFacts(data: ValuationData): NarrativeFacts | null {
  const fc = data.financialCore;
  if (!fc) return null;
  const cur = data.currency ?? 'ILS';
  const lastHist = [...data.trajectory].reverse().find((t) => !t.forecast);
  const revenue = (lastHist?.revenueM ?? 0) * 1e6;
  const margin = lastHist && lastHist.revenueM > 0 ? (lastHist.ebitdaM / lastHist.revenueM) * 100 : data.marginPct;
  const bear = data.scenarios.find((s) => s.key === 'bear');
  const bull = data.scenarios.find((s) => s.key === 'bull');
  const methods = data.modelBlend
    .filter((r) => r.weightPct > 0 && !/צבר|backlog/i.test(r.name))
    .map((r) => ({
      method: /dcf/i.test(r.name) ? 'DCF' : /ebitda/i.test(r.name) ? 'מכפיל EBITDA' : 'מכפיל הכנסות',
      weight: pct(r.weightPct),
      value: money(r.ev, cur),
    }));
  return {
    sector: data.sectorLabel,
    sizeBand: sizeBand(revenue),
    currency: cur,
    numbers: {
      equity: money(data.equity, cur),
      enterpriseValue: money(data.enterpriseValue, cur),
      netDebtOrCash: money(Math.abs(data.netDebt), cur),
      wacc: pct(data.waccPct),
      qualityScore: `${Math.round(data.qualityScore)}`,
      qualityGrade: data.qualityGrade,
      ebitdaMultiple: `×${data.effectiveMult.toFixed(1)}`,
      ebitdaMargin: pct(margin),
      growth: `${Math.round(data.growthPct)}%`,
      terminalShare: `${Math.round(data.terminalSharePct)}%`,
    },
    scenarios: { bear: money(data.bearEquity, cur), base: money(data.equity, cur), bull: money(data.bullEquity, cur) },
    methods,
    netPosition: data.netDebt < 0 ? 'net_cash' : 'net_debt',
    drivers: computeDrivers(data),
    valueDropPct: `${Math.round(VALUE_DROP * 100)}%`,
  };
}

/** Every number string the model may write. */
export function allowedNumberStrings(f: NarrativeFacts): string[] {
  return [
    f.sector,
    f.sizeBand,
    ...Object.values(f.numbers),
    ...Object.values(f.scenarios),
    ...f.methods.flatMap((m) => [m.weight, m.value]),
    ...f.drivers.flatMap((d) => d.numbers),
    f.valueDropPct,
  ];
}
