import { createSampleForecastMatrix } from '../../forecast_sample';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';

/** Demo matrix for landing product screenshots — VerdictHero + DCF preview */
export const LANDING_DEMO_MATRIX: ForecastMatrixWithDiagnostics = {
  ...createSampleForecastMatrix(),
  meta: {
    ...createSampleForecastMatrix().meta,
    company_name: 'חברת טכנולוגיה בע״מ',
  },
  enterprise_value: 5_650_000,
  scenarios: {
    bear: { enterprise_value: 4_200_000, final_equity_value: 4_250_000 },
    base: { enterprise_value: 5_650_000, final_equity_value: 4_850_000 },
    bull: { enterprise_value: 7_100_000, final_equity_value: 6_400_000 },
  },
  multiples_analysis: {
    comparisonGroup: 'SaaS · צמיחה',
    valuationRange: { low: 4_200_000, base: 4_850_000, high: 6_400_000 },
    selectedMultiple: {
      multiple: 'evEbitda',
      label: 'EV/EBITDA',
      rationale: 'מכפיל ענף',
    },
    industry: 'saas',
    lifecycleStage: 'growth',
    metricValue: 780_000,
    medianMultiple: 6.5,
    normalizedEbitda: 780_000,
    forwardEbitda: 780_000,
    sanityCheck: 'ok',
    methodologyNote: 'נתוני שוק ישראלי 2026',
    multiplesUsed: {
      evEbitda: [5.5, 7.5],
      evEbita: [7, 11],
      evSales: [1.8, 3.2],
      pe: [10, 16],
    },
  },
};
