import type { ValuationLocale } from '../../api_client';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import { getWizardContext } from '../pdf/wizard_context';
import {
  BLEND_WEIGHTS,
  buildWaccDonutSlices,
  type ReportViewModel,
} from './report-view-model';
import type { ValuationScenario } from '../valuation/canonical_valuation';
import { formatCurrencyShort } from '../utils/formatCurrency';

export const SCROLL_SECTIONS = [
  { id: 'p1', labelHe: 'שער', labelEn: 'Cover' },
  { id: 'p2', labelHe: 'תקציר מנהלים', labelEn: 'Executive summary' },
  { id: 'p3', labelHe: 'נתונים פיננסיים', labelEn: 'Financial data' },
  { id: 'p4', labelHe: 'DCF', labelEn: 'DCF' },
  { id: 'p5', labelHe: 'מכפילים', labelEn: 'Multiples' },
  { id: 'p6', labelHe: 'תרחישים', labelEn: 'Scenarios' },
  { id: 'p7', labelHe: 'שווי משולב', labelEn: 'Combined value' },
];

export interface FinBarPoint {
  label: string;
  revenueM: number;
  ebitdaM: number;
  forecast?: boolean;
}

export interface MultipleRowView {
  title: string;
  subtitle: string;
  bandStart: string;
  bandEnd: string;
  dotPct: number;
  rangeStart: string;
  rangeEnd: string;
  value: string;
  valueSub: string;
  dotGold?: boolean;
}

export interface QualityFactorView {
  label: string;
  pct: number;
}

export interface ScrollScenarioView {
  equityM: number;
  cap: string;
  dotPct: number;
  growth: string;
  margin: string;
  wacc: string;
  mult: string;
  ev: string;
}

export function toMillions(n: number): number {
  return n / 1_000_000;
}

export function formatReportDate(locale: ValuationLocale): string {
  return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

export function resolvePurposeLabel(vm: ReportViewModel): string {
  const map: Record<string, string> = {
    'M&A_SALE': 'משא ומתן אסטרטגי',
    CAPITAL_RAISE: 'גיוס הון',
    TAX: 'הליך משפטי / מס',
    INTERNAL_REPORT: 'שימוש פנימי',
  };
  const code = vm.matrix.capital_structure.valuation_purpose;
  if (code && map[code]) {
    return `מטרת ההערכה: ${map[code]}`;
  }
  return `ענף: ${vm.industrySector}`;
}

export function buildExecSummary(
  vm: ReportViewModel,
  currency: string,
  locale: ValuationLocale,
): string {
  const base = vm.scenarios.base;
  const isHe = locale === 'he';
  if (isHe) {
    return `שקלול DCF (${(BLEND_WEIGHTS.dcf * 100).toFixed(0)}%), מכפיל EBITDA (${(BLEND_WEIGHTS.ebitda * 100).toFixed(0)}%) ומכפיל הכנסות (${(BLEND_WEIGHTS.rev * 100).toFixed(0)}%) מניב שווי פעילות של ${formatCurrencyShort(base.enterpriseValue, currency)}. בניכוי חוב נטו, השווי לבעלים עומד על ${formatCurrencyShort(base.equityValue, currency)}.`;
  }
  return `Blended DCF, EBITDA and revenue multiples yield enterprise value of ${formatCurrencyShort(base.enterpriseValue, currency)} and equity value of ${formatCurrencyShort(base.equityValue, currency)}.`;
}

export function buildFinChartData(vm: ReportViewModel): FinBarPoint[] {
  return vm.trajectory.map((row, i) => ({
    label: row.year,
    revenueM: row.revenue / 1_000_000,
    ebitdaM: row.ebitda / 1_000_000,
    forecast: i >= vm.trajectory.length - 3,
  }));
}

export function buildMultipleRows(
  vm: ReportViewModel,
  currency: string,
): MultipleRowView[] {
  const base = vm.scenarios.base;
  const mult = vm.reportData.multiplesAnalysis;
  const ebitdaRow = mult.find((m) => /ebitda/i.test(m.name));
  const revRow = mult.find((m) => /sales|הכנסות|revenue/i.test(m.name));

  const ebitdaMult = ebitdaRow?.ratio ?? base.evEbitda / Math.max(vm.ebitda, 1);
  const revMult = revRow?.ratio ?? base.evRev / Math.max(vm.revenue, 1);

  return [
    {
      title: 'מכפיל EBITDA',
      subtitle: 'EV / EBITDA',
      bandStart: '12%',
      bandEnd: '12%',
      dotPct: 52,
      rangeStart: `×${(ebitdaMult * 0.55).toFixed(1)}`,
      rangeEnd: `×${(ebitdaMult * 1.45).toFixed(1)}`,
      value: `×${ebitdaMult.toFixed(1)}`,
      valueSub: formatCurrencyShort(base.evEbitda, currency),
    },
    {
      title: 'מכפיל הכנסות',
      subtitle: 'EV / Revenue',
      bandStart: '18%',
      bandEnd: '18%',
      dotPct: 48,
      rangeStart: `×${(revMult * 0.5).toFixed(1)}`,
      rangeEnd: `×${(revMult * 1.5).toFixed(1)}`,
      value: `×${revMult.toFixed(1)}`,
      valueSub: formatCurrencyShort(base.evRev, currency),
    },
    {
      title: 'DCF (להשוואה)',
      subtitle: 'Discounted cash flow',
      bandStart: '0%',
      bandEnd: '0%',
      dotPct: 62,
      rangeStart: formatCurrencyShort(base.evDcf * 0.75, currency),
      rangeEnd: formatCurrencyShort(base.evDcf * 1.25, currency),
      value: formatCurrencyShort(base.evDcf, currency),
      valueSub: 'EV',
      dotGold: true,
    },
  ];
}

export function buildQualityFactors(
  matrix: ForecastMatrixWithDiagnostics,
): QualityFactorView[] {
  const ctx = getWizardContext(matrix);
  const recurring = ctx.recurring_revenue_percent ?? 60;
  const concentration = ctx.customer_concentration_pct ?? 20;
  return [
    { label: 'הכנסות חוזרות', pct: Math.round(recurring) },
    {
      label: `פיזור לקוחות (${Math.round(concentration)}% מרכזי)`,
      pct: Math.max(20, 100 - concentration * 1.4),
    },
    {
      label: 'עצמאות תפעולית',
      pct: ctx.customer_concentration_over_20 ? 52 : 72,
    },
    { label: 'עמידות תחרותית', pct: concentration > 30 ? 48 : 68 },
  ];
}

const SCENARIO_GROWTH: Record<ValuationScenario, number> = {
  bear: 3,
  base: 9,
  bull: 15,
};

export function buildScrollScenarioView(
  vm: ReportViewModel,
  scenario: ValuationScenario,
  currency: string,
): ScrollScenarioView {
  const s = vm.scenarios[scenario];
  const bear = vm.scenarios.bear.equityValue;
  const bull = vm.scenarios.bull.equityValue;
  const span = bull - bear || 1;
  const dotPct = Math.max(4, Math.min(96, ((s.equityValue - bear) / span) * 100));

  const caps: Record<ValuationScenario, string> = {
    bear: 'תרחיש דובי — האטה ענפית והקפאת מכפילים',
    base: 'תרחיש בסיס — מגמה נוכחית וצמיחה מתונה',
    bull: 'תרחיש שורי — האצת צמיחה והרחבת קיבולת',
  };

  return {
    equityM: s.equityValue / 1_000_000,
    cap: caps[scenario],
    dotPct,
    growth: `${SCENARIO_GROWTH[scenario]}%`,
    margin: `${vm.ebitdaMarginPct.toFixed(1)}%`,
    wacc: `${s.waccPct.toFixed(1)}%`,
    mult: `×${(s.evEbitda / Math.max(vm.ebitda, 1)).toFixed(1)}`,
    ev: formatCurrencyShort(s.enterpriseValue, currency),
  };
}

export function buildWaccRows(
  vm: ReportViewModel,
  scenario: ValuationScenario,
): { label: string; pct: string }[] {
  const wacc = vm.scenarios[scenario].waccPct;
  const slices = buildWaccDonutSlices(wacc);
  return slices.map((s) => ({
    label: s.labelHe,
    pct: `${s.pct.toFixed(1)}%`,
  }));
}

export function buildDcfBreakdown(
  vm: ReportViewModel,
  currency: string,
): { explicitPv: string; terminal: string; total: string } {
  const base = vm.scenarios.base;
  const terminal = vm.reportData.terminalValuePV ?? base.evDcf * 0.55;
  const explicit = base.evDcf - terminal;
  return {
    explicitPv: formatCurrencyShort(explicit, currency),
    terminal: formatCurrencyShort(terminal, currency),
    total: formatCurrencyShort(base.evDcf, currency),
  };
}
