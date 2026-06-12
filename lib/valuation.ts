/**
 * מנוע הערכת שווי equify — פונקציות טהורות (פורט מה-HTML)
 */

export type EquifySectorKey =
  | 'saas'
  | 'fintech'
  | 'cyber'
  | 'health'
  | 'services'
  | 'industry'
  | 'ecom'
  | 'energy'
  | 'other';

export type EquifyLifecycleKey = 'seed' | 'early' | 'growth' | 'mature';

export type EquifyGoalKey =
  | 'negotiation'
  | 'fundraise'
  | 'partner'
  | 'bank'
  | 'internal'
  | 'legal'
  | '';

export type QualityGrade = 'A' | 'A−' | 'B+' | 'B' | 'B−' | 'C+';

/** קלט גולמי לאשף — כל הערכים ב-₪K למעט אחוזים */
export interface ValuationInputs {
  rev: number;
  margin: number;
  growth: number;
  debt: number;
  sectorMult: number;
  lifecycleAdj: number;
  recurring: number;
  topCustomer: number;
  founderDep: boolean;
  competition: boolean;
  ip: boolean;
  contracts: boolean;
}

export interface ValuationComputed {
  ebitda: number;
  wacc: number;
  qs: number;
  qsGrade: QualityGrade;
  effectiveMult: number;
  ebtMult: number;
  revMult: number;
  dcf: number;
  ev: number;
  equity: number;
}

export interface ScenarioRow {
  label: 'bear' | 'base' | 'bull';
  growthPct: number;
  ebitdaAdj: string;
  waccPct: number;
  multDisplay: string;
  ev: number;
  equity: number;
}

export interface ValuationScenarios {
  bearEv: number;
  bullEv: number;
  bearEq: number;
  bullEq: number;
  baseEq: number;
  rows: ScenarioRow[];
}

export const SECTOR_MULTIPLIERS: Record<EquifySectorKey, number> = {
  saas: 1.4,
  fintech: 1.5,
  cyber: 1.45,
  health: 1.3,
  services: 1.0,
  industry: 0.88,
  ecom: 0.95,
  energy: 1.1,
  other: 1.0,
};

export const LIFECYCLE_ADJ: Record<EquifyLifecycleKey, number> = {
  seed: -0.1,
  early: 0,
  growth: 0.08,
  mature: 0.04,
};

/** מחשב שווי פעילות, הון עצמי, WACC וציון איכות */
export function computeValuation(inputs: ValuationInputs): ValuationComputed {
  const {
    rev,
    margin,
    growth,
    debt,
    sectorMult,
    lifecycleAdj,
    recurring,
    topCustomer,
    founderDep,
    competition,
    ip,
    contracts,
  } = inputs;

  const ebitda = rev * (margin / 100);

  const rf = 4.3;
  const erp = 5.4;
  const crp = 1.6;
  const sizePr = 3.1;
  const qualityPr =
    (founderDep ? 0.6 : 0) +
    (competition ? 0.4 : 0) +
    (ip ? -0.3 : 0) +
    (contracts ? -0.2 : 0);
  const recurPr = (1 - recurring / 100) * 0.8;
  const concPr = topCustomer > 40 ? 0.8 : topCustomer > 20 ? 0.4 : 0;
  const wacc = Math.max(
    10,
    Math.min(25, rf + erp + crp + sizePr + qualityPr + recurPr + concPr - lifecycleAdj * 3),
  );

  const qRec = recurring * 0.28;
  const qConc = (1 - topCustomer / 100) * 22;
  const qFound = founderDep ? 0 : 14;
  const qComp = competition ? 0 : 10;
  const qIP = ip ? 12 : 0;
  const qContr = contracts ? 10 : 0;
  const qGrowth = Math.min(14, growth * 0.5);
  const qs = Math.round(
    Math.min(100, qRec + qConc + qFound + qComp + qIP + qContr + qGrowth),
  );
  const qsGrade = qualityScoreGrade(qs);

  const baseM = 5.2;
  const growthM = Math.min(3.5, growth * 0.14);
  const qualM = ((qs - 50) / 100) * 2.8;
  const effectiveMult = Math.max(
    2.5,
    Math.min(13, baseM + growthM + qualM) * sectorMult,
  );
  const ebtMult = ebitda * effectiveMult;

  const revMultiplier = Math.max(
    0.5,
    Math.min(4.5, (margin / 100) * 8 + (growth / 100) * 6 + 0.8) * sectorMult,
  );
  const revMult = rev * revMultiplier;

  let pv = 0;
  let fcff = ebitda * 0.85;
  const g = Math.max(-0.05, growth / 100);
  const w = wacc / 100;
  for (let i = 1; i <= 5; i += 1) {
    fcff *= 1 + g;
    pv += fcff / (1 + w) ** i;
  }
  const gTerm = 0.025;
  const tv = (fcff * (1 + gTerm)) / (w - gTerm) / (1 + w) ** 5;
  const dcf = pv + tv;

  const ev = dcf * 0.5 + ebtMult * 0.3 + revMult * 0.2;
  const equity = Math.max(0, ev - debt);

  return {
    ebitda,
    wacc,
    qs,
    qsGrade,
    effectiveMult,
    ebtMult,
    revMult,
    dcf,
    ev,
    equity,
  };
}

export function qualityScoreGrade(qs: number): QualityGrade {
  if (qs >= 85) return 'A';
  if (qs >= 75) return 'A−';
  if (qs >= 65) return 'B+';
  if (qs >= 55) return 'B';
  if (qs >= 45) return 'B−';
  return 'C+';
}

/** תרחישי Bear / Base / Bull */
export function computeScenarios(
  computed: ValuationComputed,
  inputs: Pick<ValuationInputs, 'growth' | 'debt'>,
): ValuationScenarios {
  const { dcf, ebtMult, revMult, ev, equity, wacc, effectiveMult } = computed;
  const { growth, debt } = inputs;

  const bearEv = dcf * 0.5 * 0.72 + ebtMult * 0.3 * 0.78 + revMult * 0.2 * 0.8;
  const bullEv = dcf * 0.5 * 1.28 + ebtMult * 0.3 * 1.24 + revMult * 0.2 * 1.18;
  const bearEq = Math.max(0, bearEv - debt);
  const bullEq = Math.max(0, bullEv - debt);

  const bearGrowth = Math.max(-5, growth - 6);
  const bullGrowth = growth + 6;

  return {
    bearEv,
    bullEv,
    bearEq,
    bullEq,
    baseEq: equity,
    rows: [
      {
        label: 'bear',
        growthPct: bearGrowth,
        ebitdaAdj: '−2%',
        waccPct: wacc + 1.6,
        multDisplay: `×${(effectiveMult * 0.78).toFixed(1)}`,
        ev: bearEv,
        equity: bearEq,
      },
      {
        label: 'base',
        growthPct: growth,
        ebitdaAdj: '—',
        waccPct: wacc,
        multDisplay: `×${effectiveMult.toFixed(1)}`,
        ev,
        equity,
      },
      {
        label: 'bull',
        growthPct: bullGrowth,
        ebitdaAdj: '+2%',
        waccPct: wacc - 1.4,
        multDisplay: `×${(effectiveMult * 1.18).toFixed(1)}`,
        ev: bullEv,
        equity: bullEq,
      },
    ],
  };
}

/** פורמט ₪K — למשל ₪12.0M או ₪450K */
export function fmtK(k: number): string {
  if (k >= 1_000_000) return `₪${(k / 1_000_000).toFixed(1)}M`;
  if (k >= 1000) return `₪${(k / 1000).toFixed(1)}M`;
  return `₪${Math.round(k)}K`;
}

/** המרה ל-M ₪ (מספר בלבד) */
export function fmtM(k: number): string {
  return (k / 1000).toFixed(1);
}

/** תצוגת שווי לבעלים בסרגל הצד */
export function fmtEquitySidebarM(equityK: number): string {
  return `${fmtM(equityK)}M ₪`;
}

/** אחוז ערך טרמינלי מ-DCF */
export function terminalValuePct(dcf: number): number {
  if (dcf <= 0) return 0;
  return Math.round(((dcf * 0.57) / dcf) * 100);
}
