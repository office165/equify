export type LifecycleStage = 'seed' | 'early' | 'growth' | 'mature' | 'distressed';

export type Industry =
  | 'saas'
  | 'fintech'
  | 'healthtech'
  | 'cyber'
  | 'realestate'
  | 'construction'
  | 'manufacturing'
  | 'retail'
  | 'food'
  | 'professional_services'
  | 'defense'
  | 'energy'
  | 'other';

export interface MultiplesRange {
  evEbitda: [number, number];
  evEbita: [number, number];
  evSales: [number, number];
  pe?: [number, number];
  pbv?: [number, number];
}

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
  retail: {
    evEbitda: [6, 9],
    evEbita: [7, 11],
    evSales: [0.3, 0.6],
    pe: [10, 18],
  },
  food: {
    evEbitda: [7, 10],
    evEbita: [8, 12],
    evSales: [0.8, 1.4],
    pe: [10, 18],
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
  retail: 0.04,
  food: 0.05,
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
  // DLOM (Discount for Lack of Marketability): 20% for private companies
  const dlom = isPrivate ? 0.80 : 1.0;
  const median = getMedianMultiple(multipleRange);

  // Bear: low multiple × DLOM × additional 10% stress
  // Base: median multiple × DLOM
  // Bull: high multiple × DLOM × slight optimism premium
  return {
    low:  Math.round(metric * multipleRange[0] * dlom * 0.92 * 100) / 100,
    base: Math.round(metric * median            * dlom         * 100) / 100,
    high: Math.round(metric * multipleRange[1]  * dlom * 1.05  * 100) / 100,
  };
}
