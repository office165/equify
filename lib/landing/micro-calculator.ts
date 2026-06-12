/** Live micro-calculator — indicative equity from Israeli market multiples (landing teaser). */

export interface MicroCalcInputs {
  /** Annual revenue in ₪ thousands */
  revenueK: number;
  /** EBITDA margin 0–1 */
  margin: number;
  /** Expected annual growth 0–1 */
  growth: number;
  sectorMultiplier: number;
}

export interface MicroCalcResult {
  revenueM: number;
  marginPct: number;
  growthPct: number;
  ebitdaK: number;
  ebitdaM: number;
  mult: number;
  grade: string;
  equityK: number;
  equityM: number;
  lowM: number;
  highM: number;
  /** 14–86 range position for sensitivity dot */
  dotPct: number;
}

export const MICRO_SECTORS = [
  { id: 'services', label: 'שירותים', multiplier: 1.0 },
  { id: 'tech', label: 'טכנולוגיה / SaaS', multiplier: 1.35 },
  { id: 'retail', label: 'מסחר וקמעונאות', multiplier: 0.85 },
  { id: 'industry', label: 'תעשייה', multiplier: 0.9 },
] as const;

export function formatMillionsFromK(thousands: number): string {
  return (thousands / 1000).toFixed(1);
}

export function computeMicroValuation(input: MicroCalcInputs): MicroCalcResult {
  const { revenueK, margin, growth, sectorMultiplier } = input;
  const ebitdaK = revenueK * margin;

  let mult = 5.0 + growth * 9 + (margin - 0.15) * 6;
  mult = Math.max(2.2, Math.min(12, mult)) * sectorMultiplier;

  const evK = ebitdaK * mult;
  const equityK = Math.max(evK * 0.86, revenueK * 0.25);
  const lowK = equityK * 0.78;
  const highK = equityK * 1.22;

  const score = margin * 120 + growth * 90 + (sectorMultiplier - 0.85) * 40;
  const grade =
    score > 62 ? 'A' : score > 48 ? 'A−' : score > 36 ? 'B+' : score > 26 ? 'B' : 'C+';

  const dotPct = 14 + ((equityK - lowK) / (highK - lowK)) * 72;

  return {
    revenueM: revenueK / 1000,
    marginPct: Math.round(margin * 100),
    growthPct: Math.round(growth * 100),
    ebitdaK,
    ebitdaM: ebitdaK / 1000,
    mult,
    grade,
    equityK,
    equityM: equityK / 1000,
    lowM: lowK / 1000,
    highM: highK / 1000,
    dotPct,
  };
}
