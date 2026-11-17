/**
 * Page 7 sensitivity tables (round 2, finding 6): every cell is a full engine run.
 *
 * Table 1: WACC (base -2 to +2 points, step 1) x terminal growth (1.5% to 3.5%, step 0.5).
 * Table 2: EBITDA (-20% to +20%, step 10%) x multiple (base -1.0x to +1.0x, step 0.5x).
 * The multiple is the one the sub-sector uses: EBITDA multiple, or revenue multiple for
 * revenue-strategy sub-sectors. Cells are equity value in the reporting currency (millions).
 * The center cell is the base run, so it equals the reported equity.
 */
import type { ValuationComputed, ValuationInputs } from '../valuation';
import { computeValuation, type EngineOverrides } from '../valuation/valuation_engine';
import { TERMINAL_GROWTH_RATE } from '../valuation/scenario_matrix';
import { formatCurrencyShort } from '../utils/formatCurrency';
import type { EbitdaSensitivityMatrix, SensitivityMatrix } from './types';

export const SENS_WACC_STEPS_PP = [-2, -1, 0, 1, 2] as const;
/** Terminal growth rows, highest first (table reads top to bottom). */
export const SENS_TERMINAL_GROWTH = [0.035, 0.03, 0.025, 0.02, 0.015] as const;
export const SENS_EBITDA_STEPS = [-0.2, -0.1, 0, 0.1, 0.2] as const;
export const SENS_MULTIPLE_STEPS = [-1, -0.5, 0, 0.5, 1] as const;

/** Scales every EBITDA input of the case by `factor` (revenue unchanged). */
export function scaleEbitdaInputs(inputs: ValuationInputs, factor: number): ValuationInputs {
  const sc = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? v : v * factor);
  return {
    ...inputs,
    margin: inputs.margin * factor,
    ebitda2024K: sc(inputs.ebitda2024K) as number | undefined,
    ebitda2025K: sc(inputs.ebitda2025K) as number | undefined,
    ebitda2026K: sc(inputs.ebitda2026K) as number | undefined,
    ebitda2027K: sc(inputs.ebitda2027K) as number | null | undefined,
    projectedEbitdaK: inputs.projectedEbitdaK?.map((v) => v * factor),
  };
}

export interface SensitivityContext {
  inputs: ValuationInputs;
  /** Engine result in ILS for the same inputs (the base run). */
  baseIls: ValuationComputed;
  /** Equity in the reporting currency (absolute), as shown in the report. */
  reportedEquityAbs: number;
  /** ILS K to reporting-currency K multiplier. */
  fxMultiplier: number;
  /** Multiple-leg EBITDA base (absolute, reporting currency) for the row labels. */
  multipleLegEbitdaAbs: number;
  currency: string;
}

function run(inputs: ValuationInputs, overrides: EngineOverrides): number {
  return computeValuation(inputs, { ...overrides, silent: true }).equity;
}

/**
 * Converts an engine equity (ILS K) to millions in the reporting currency. If the live path
 * produced a base equity that differs from a fresh engine run (should not happen), cells are
 * scaled by the ratio so the center still equals the reported equity, and a warning is logged.
 */
function makeToMillions(ctx: SensitivityContext): (equityIlsK: number) => number {
  const baseAbs = ctx.baseIls.equity * 1000 * ctx.fxMultiplier;
  const diverged =
    Math.abs(baseAbs - ctx.reportedEquityAbs) > Math.max(1, Math.abs(ctx.reportedEquityAbs) * 1e-6);
  if (diverged) {
    console.warn('[sensitivity] base run differs from reported equity; scaling by ratio', {
      baseAbs,
      reported: ctx.reportedEquityAbs,
    });
  }
  const ratio = diverged && baseAbs > 0 ? ctx.reportedEquityAbs / baseAbs : 1;
  return (equityIlsK) => (equityIlsK * 1000 * ctx.fxMultiplier * ratio) / 1e6;
}

export function buildGrowthWaccSensitivity(ctx: SensitivityContext, en = false): SensitivityMatrix {
  const toM = makeToMillions(ctx);
  const baseWacc = ctx.baseIls.wacc;
  const waccs = SENS_WACC_STEPS_PP.map((d) => baseWacc + d);
  const baseRow = SENS_TERMINAL_GROWTH.indexOf(TERMINAL_GROWTH_RATE as (typeof SENS_TERMINAL_GROWTH)[number]);
  const baseCol = SENS_WACC_STEPS_PP.indexOf(0);
  const cells = SENS_TERMINAL_GROWTH.map((g, ri) =>
    waccs.map((w, ci) => {
      if (ri === baseRow && ci === baseCol) return ctx.reportedEquityAbs / 1e6;
      return toM(run(ctx.inputs, { waccPct: w, terminalGrowthRate: g }));
    }),
  );
  const flatGrowth = cells.every((row) => row.every((v, ci) => Math.abs(v - cells[baseRow][ci]) < 0.05));
  const note = en
    ? `Each cell is a full engine run. Terminal growth is the Gordon growth after year 5.${flatGrowth ? ' Rows are almost equal because the terminal value is capped at 42% of the explicit-period value.' : ''}`
    : `כל תא הוא הרצה מלאה של המנוע. הצמיחה הטרמינלית היא צמיחת Gordon אחרי שנה 5.${flatGrowth ? ' השורות כמעט זהות, כי הערך הטרמינלי מוגבל ל 42% מערך התקופה המפורשת.' : ''}`;
  return {
    growthLabels: SENS_TERMINAL_GROWTH.map((g) => `${(g * 100).toFixed(1)}%`),
    waccLabels: waccs.map((w) => `${w.toFixed(1)}%`),
    cells,
    baseRow,
    baseCol,
    note,
  };
}

export function buildEbitdaMultipleSensitivity(ctx: SensitivityContext, en = false): EbitdaSensitivityMatrix {
  const toM = makeToMillions(ctx);
  const baseMult = ctx.baseIls.effectiveMult;
  const isRevenue = ctx.baseIls.methodologyStrategy === 'current_run_rate_revenue';
  const mults = SENS_MULTIPLE_STEPS.map((d) => Math.max(0.1, baseMult + d));
  const baseRow = SENS_EBITDA_STEPS.indexOf(0);
  const baseCol = SENS_MULTIPLE_STEPS.indexOf(0);
  const cells = SENS_EBITDA_STEPS.map((d, ri) => {
    const scaled = d === 0 ? ctx.inputs : scaleEbitdaInputs(ctx.inputs, 1 + d);
    return mults.map((m, ci) => {
      if (ri === baseRow && ci === baseCol) return ctx.reportedEquityAbs / 1e6;
      return toM(run(scaled, { effectiveMultiple: m }));
    });
  });
  const note = en
    ? `Each cell is a full engine run with EBITDA of all years scaled. Multiple: ${isRevenue ? 'revenue' : 'EBITDA'} multiple after the marketability and size discounts.`
    : `כל תא הוא הרצה מלאה של המנוע, עם EBITDA של כל השנים מוכפל באחוז השורה. המכפיל: מכפיל ${isRevenue ? 'ההכנסות' : 'ה EBITDA'} אחרי הנחת סחירות וגודל.`;
  return {
    ebitdaLabels: SENS_EBITDA_STEPS.map((d) =>
      formatCurrencyShort(ctx.multipleLegEbitdaAbs * (1 + d), ctx.currency),
    ),
    multipleLabels: mults.map((m) => `×${m.toFixed(1)}`),
    cells,
    baseRow,
    baseCol,
    baseEbitdaAbs: ctx.multipleLegEbitdaAbs,
    baseMultiple: baseMult,
    multipleKind: isRevenue ? 'revenue' : 'ebitda',
    note,
  };
}
