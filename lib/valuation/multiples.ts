import { resolveIndustryKey } from './industry_migration';

export type { Industry } from './industry_types';
export {
  migrateLegacyIndustryKey,
  migrateLegacyEquifySectorKey,
  resolveIndustryKey,
} from './industry_migration';

export type LifecycleStage = 'seed' | 'early' | 'growth' | 'mature' | 'distressed';

import type { Industry } from './industry_types';

export interface MultiplesRange {
  evEbitda: [number, number];
  evEbita: [number, number];
  evSales: [number, number];
  pe?: [number, number];
  pbv?: [number, number];
}

/**
 * Israeli private-market multiples (2024–2026) — Damodaran baselines + 20% DLOM calibration.
 * food_service: standalone restaurants (CBS ענף 56) — never hotel multiples.
 * hospitality: hotels & lodging only.
 * retail_unified: thin-margin commerce (physical + D2C + marketplace).
 */
export const ISRAEL_MULTIPLES_2026: Record<Industry, MultiplesRange> = {
  saas: {
    evEbitda: [12, 18],
    evEbita: [14, 22],
    evSales: [4, 8],
    pe: [18, 35],
  },
  fintech: {
    evEbitda: [10, 15],
    evEbita: [12, 18],
    evSales: [5, 10],
    pe: [15, 28],
  },
  healthtech: {
    evEbitda: [10, 14],
    evEbita: [12, 16],
    evSales: [3, 6],
    pe: [15, 30],
  },
  cyber: {
    evEbitda: [14, 20],
    evEbita: [18, 25],
    evSales: [6, 12],
    pe: [20, 40],
  },
  realestate: {
    evEbitda: [15, 20],
    evEbita: [16, 22],
    evSales: [8, 14],
    pbv: [0.8, 1.8],
  },
  construction: {
    evEbitda: [5, 7],
    evEbita: [6, 9],
    evSales: [0.4, 0.7],
    pe: [8, 14],
  },
  manufacturing: {
    evEbitda: [5, 8],
    evEbita: [6, 10],
    evSales: [0.5, 1.0],
    pe: [8, 14],
  },
  /** Unified retail & commerce — replaces legacy retail/ecom split. */
  retail_unified: {
    evEbitda: [4.5, 8.0],
    evEbita: [5.5, 9.5],
    evSales: [0.25, 0.55],
    pe: [9, 16],
  },
  /**
   * Food & restaurants (ענף 56) — QSR 3–4×, chains 5–7×, franchise up to 9×.
   * Asset-heavy kitchens; EBITDA margin cap ~22%.
   */
  food_service: {
    evEbitda: [3.5, 6.5],
    evEbita: [4.0, 8.0],
    evSales: [0.35, 0.85],
    pe: [8, 15],
  },
  /** Hotels & lodging only — no restaurant sub-sectors. */
  hospitality: {
    evEbitda: [7.5, 12.0],
    evEbita: [8.5, 14.0],
    evSales: [1.2, 2.8],
    pe: [12, 22],
  },
  professional_services: {
    evEbitda: [7, 10],
    evEbita: [8, 12],
    evSales: [1.0, 2.0],
    pe: [12, 20],
  },
  defense: {
    evEbitda: [8, 12],
    evEbita: [10, 14],
    evSales: [1.5, 2.5],
    pe: [12, 22],
  },
  energy: {
    evEbitda: [10, 15],
    evEbita: [12, 18],
    evSales: [3, 6],
    pe: [12, 22],
  },
  other: {
    evEbitda: [7, 11],
    evEbita: [8, 13],
    evSales: [1.0, 2.0],
    pe: [10, 18],
  },
};

export const INDUSTRY_GROWTH_RATES: Record<Industry, number> = {
  saas: 0.3,
  fintech: 0.25,
  healthtech: 0.2,
  cyber: 0.35,
  realestate: 0.08,
  construction: 0.06,
  manufacturing: 0.05,
  retail_unified: 0.035,
  food_service: 0.045,
  hospitality: 0.055,
  professional_services: 0.08,
  defense: 0.1,
  energy: 0.15,
  other: 0.07,
};

export type PrimaryMultipleKey = 'evEbitda' | 'evEbita' | 'evSales';

export interface SelectedMultiple {
  multiple: PrimaryMultipleKey;
  label: string;
  rationale: string;
}

export function getMedianMultiple(range: [number, number]): number {
  return (range[0] + range[1]) / 2;
}

export function getIndustryMultiples(industry: Industry | string): MultiplesRange {
  return ISRAEL_MULTIPLES_2026[resolveIndustryKey(industry)];
}

export function selectPrimaryMultiple(
  stage: LifecycleStage,
  hasRevenue: boolean,
  hasEbitda: boolean,
  _isPrivate: boolean,
): SelectedMultiple {
  if (stage === 'seed' || !hasRevenue) {
    return {
      multiple: 'evSales',
      label: 'EV/Sales',
      rationale: 'חברה pre-revenue — מכפיל מכירות Forward',
    };
  }
  if (stage === 'early' || !hasEbitda) {
    return {
      multiple: 'evSales',
      label: 'EV/Sales',
      rationale: 'שלב early — EBITDA אינו מייצג עדיין',
    };
  }
  if (stage === 'growth') {
    return {
      multiple: 'evEbitda',
      label: 'EV/EBITDA',
      rationale: 'שלב Growth — מכפיל תפעולי סטנדרטי',
    };
  }
  if (stage === 'mature') {
    return {
      multiple: 'evEbita',
      label: 'EV/EBITA',
      rationale: 'חברה בוגרת — EBITA מנטרל פחת ומבנה הון',
    };
  }
  return {
    multiple: 'evSales',
    label: 'EV/Sales',
    rationale: 'חברה במצוקה — מכפיל מכירות כ-floor',
  };
}

export function applyPrivateCompanyDiscount(ev: number, isPrivate: boolean): number {
  return isPrivate ? ev * 0.8 : ev;
}

export interface ValuationRangeResult {
  low: number;
  base: number;
  high: number;
}

export function calculateValuationRange(
  metric: number,
  multipleRange: [number, number],
  isPrivate: boolean,
): ValuationRangeResult {
  const dlom = isPrivate ? 0.8 : 1.0;
  const median = getMedianMultiple(multipleRange);

  return {
    low: Math.round(metric * multipleRange[0] * dlom * 0.92 * 100) / 100,
    base: Math.round(metric * median * dlom * 100) / 100,
    high: Math.round(metric * multipleRange[1] * dlom * 1.05 * 100) / 100,
  };
}
