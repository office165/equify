import type { ValuationLocale } from '../api_client';

/**
 * מנוע הערכת שווי equify — פונקציות טהורות (פורט מה-HTML)
 */

export type EquifySectorKey =
  | 'hospitality'
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
  /** חוב נטו (₪K) — grossDebt − cash */
  debt: number;
  sectorMult: number;
  subSectorMult?: number;
  lifecycleAdj: number;
  recurring: number;
  topCustomer: number;
  founderDep: boolean;
  competition: boolean;
  ip: boolean;
  contracts: boolean;
  /** שכר בעלים מנורמל (₪K) — מוסיף ל-EBITDA התפעולי */
  normalizedOwnerSalary?: number;
  /** CAPEX כ-% מהכנסות — מוריד מ-FCFF */
  capexLevelPct?: number;
  grossDebt?: number;
  cash?: number;
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
  hospitality: 1.05,
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
    subSectorMult = 1,
    lifecycleAdj,
    recurring,
    topCustomer,
    founderDep,
    competition,
    ip,
    contracts,
    normalizedOwnerSalary = 0,
    capexLevelPct = 0,
  } = inputs;

  const reportedEbitda = rev * (margin / 100);
  const ebitda = reportedEbitda + normalizedOwnerSalary;

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

  const combinedSectorMult = sectorMult * subSectorMult;
  const baseM = 5.2;
  const growthM = Math.min(3.5, growth * 0.14);
  const qualM = ((qs - 50) / 100) * 2.8;
  const effectiveMult = Math.max(
    2.5,
    Math.min(13, baseM + growthM + qualM) * combinedSectorMult,
  );
  const ebtMult = ebitda * effectiveMult;

  const revMultiplier = Math.max(
    0.5,
    Math.min(4.5, (margin / 100) * 8 + (growth / 100) * 6 + 0.8) * combinedSectorMult,
  );
  const revMult = rev * revMultiplier;

  const capexK = rev * (capexLevelPct / 100);
  const fcffConversion = Math.max(0.55, 0.85 - capexLevelPct / 100);

  let pv = 0;
  let fcff = ebitda * fcffConversion - capexK * 0.15;
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

function formatKAmount(k: number): string {
  if (k >= 1_000_000) return `${(k / 1_000_000).toFixed(1)}M`;
  if (k >= 1000) return `${(k / 1000).toFixed(1)}M`;
  return `${Math.round(k)}K`;
}

/** פורמט ₪K — RTL: 12.0M ₪ · LTR: ₪12.0M */
export function fmtK(k: number, locale: ValuationLocale = 'he'): string {
  const amount = formatKAmount(k);
  const sym = '₪';
  return locale === 'he' ? `${amount} ${sym}` : `${sym}${amount}`;
}

/** המרה ל-M (מספר בלבד) */
export function fmtM(k: number): string {
  return (k / 1000).toFixed(1);
}

/** תצוגת שווי לבעלים בסרגל הצד */
export function fmtEquitySidebarM(
  equityK: number,
  locale: ValuationLocale = 'he',
): string {
  const amount = `${fmtM(equityK)}M`;
  const sym = '₪';
  return locale === 'he' ? `${amount} ${sym}` : `${sym}${amount}`;
}

/** חלקי תצוגת מיליוני ₪ לספירה אנימטיבית (cover / scenario) */
export function fmtMillionParts(
  locale: ValuationLocale,
): { prefix: string; suffix: string } {
  return locale === 'he'
    ? { prefix: '', suffix: 'M ₪' }
    : { prefix: '₪', suffix: 'M' };
}

/** אחוז ערך טרמינלי מ-DCF */
export function terminalValuePct(dcf: number): number {
  if (dcf <= 0) return 0;
  return Math.round(((dcf * 0.57) / dcf) * 100);
}
