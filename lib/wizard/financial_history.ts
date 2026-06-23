import type { TrajectoryPoint } from '../pdf-template/types';
import type { CalibratedYearSlice } from '../valuation/adaptive_calibration';
import type { EquifyWizardFinancials } from './map_equify_wizard';
import { computeNetDebtK } from './map_equify_wizard';

export type { CalibratedYearSlice } from '../valuation/adaptive_calibration';

export interface YearFinancialsK {
  revenueK: number;
  ebitdaK: number;
}

function safeK(value: number | undefined | null): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function kToM(k: number): number {
  return k / 1000;
}

/** Reported EBITDA margin for display: (EBITDA / Revenue) × 100 — no synthetic fallbacks. */
export function ebitdaMarginPctFromYear(year: YearFinancialsK): number {
  const revenueK = safeK(year.revenueK);
  const ebitdaK = safeK(year.ebitdaK);
  if (revenueK <= 0) return 0;
  return (ebitdaK / revenueK) * 100;
}

export function deriveMarginFromYear(
  year: YearFinancialsK,
  normalizedOwnerSalaryK = 0,
): number {
  if (year.revenueK <= 0) return 0;
  const operatingEbitda = year.ebitdaK - normalizedOwnerSalaryK;
  return Math.max(0, (operatingEbitda / year.revenueK) * 100);
}

/** Ensure year buckets exist after legacy sessionStorage payloads. */
export function normalizeEquifyFinancials(
  financials: EquifyWizardFinancials,
): EquifyWizardFinancials {
  const legacyRev = safeK(financials.rev);
  const legacyMargin = safeK(financials.margin);

  const y2024 = financials.y2024 ?? { revenueK: 0, ebitdaK: 0 };
  const y2025 = financials.y2025 ?? { revenueK: 0, ebitdaK: 0 };
  const y2026 = financials.y2026 ?? {
    revenueK: legacyRev,
    ebitdaK: legacyRev > 0 ? legacyRev * (legacyMargin / 100) : 0,
  };

  return {
    ...financials,
    y2024: {
      revenueK: safeK(y2024.revenueK),
      ebitdaK: safeK(y2024.ebitdaK),
    },
    y2025: {
      revenueK: safeK(y2025.revenueK),
      ebitdaK: safeK(y2025.ebitdaK),
    },
    y2026: {
      revenueK: safeK(y2026.revenueK),
      ebitdaK: safeK(y2026.ebitdaK),
    },
    projectedEbitdaK: financials.projectedEbitdaK ?? [0, 0, 0],
    backlogSignedK: safeK(financials.backlogSignedK),
  };
}

/** Keep legacy rev/margin/debt fields aligned with y2026 after history edits. */
export function syncFinancialsDerived(
  financials: EquifyWizardFinancials,
): EquifyWizardFinancials {
  const normalized = normalizeEquifyFinancials(financials);
  const rev = normalized.y2026.revenueK;
  const margin = deriveMarginFromYear(
    normalized.y2026,
    normalized.normalizedOwnerSalaryK,
  );
  const next = { ...normalized, rev, margin };
  return { ...next, debt: computeNetDebtK(next) };
}

/**
 * PDF / results trajectory from manual wizard inputs only:
 * revenue & EBITDA for 2024–2026 plus optional 2027F (projected EBITDA).
 */
export function buildFinancialTrajectoryFromEquifyState(
  financials: EquifyWizardFinancials,
): TrajectoryPoint[] {
  const synced = syncFinancialsDerived(financials);
  const { y2024, y2025, y2026, growth, projectedEbitdaK } = synced;
  const points: TrajectoryPoint[] = [];

  const pushYear = (
    label: string,
    revenueK: number,
    ebitdaK: number,
    forecast = false,
  ) => {
    if (revenueK <= 0 && ebitdaK <= 0) return;
    const revenueM = kToM(revenueK);
    const ebitdaM = kToM(ebitdaK);
    points.push({
      label,
      revenueM,
      ebitdaM,
      forecast,
      fcffM: forecast ? ebitdaM * 0.82 : undefined,
    });
  };

  pushYear('2024', y2024.revenueK, y2024.ebitdaK);
  pushYear('2025', y2025.revenueK, y2025.ebitdaK);
  pushYear('2026', y2026.revenueK, y2026.ebitdaK);

  const ebitda2027K = safeK(projectedEbitdaK?.[0]);
  if (ebitda2027K > 0) {
    const rev2027K =
      y2026.revenueK > 0 ? y2026.revenueK * (1 + safeK(growth) / 100) : 0;
    pushYear('2027F', rev2027K, ebitda2027K, true);
  }

  return points;
}

/** PDF trajectory from engine-calibrated year slices (post winsorization). */
export function buildCalibratedFinancialTrajectory(
  computed: {
    calibratedYears?: {
      y2024: CalibratedYearSlice;
      y2025: CalibratedYearSlice;
      y2026: CalibratedYearSlice;
    };
    forwardEbitda2027K?: number;
  },
  financials: EquifyWizardFinancials,
): TrajectoryPoint[] {
  const years = computed.calibratedYears;
  if (!years) {
    return buildFinancialTrajectoryFromEquifyState(financials);
  }

  const points: TrajectoryPoint[] = [];
  const pushYear = (
    label: string,
    slice: CalibratedYearSlice,
    forecast = false,
  ) => {
    if (slice.revenueK <= 0 && slice.ebitdaK <= 0) return;
    const revenueM = kToM(slice.revenueK);
    const ebitdaM = kToM(slice.ebitdaK);
    points.push({
      label,
      revenueM,
      ebitdaM,
      forecast,
      fcffM: forecast ? ebitdaM * 0.82 : undefined,
    });
  };

  pushYear('2024', years.y2024);
  pushYear('2025', years.y2025);
  pushYear('2026', years.y2026);

  const forwardEbitdaK = safeK(computed.forwardEbitda2027K);
  if (forwardEbitdaK > 0) {
    const backlogK = safeK(financials.backlogSignedK);
    const rev2027K =
      backlogK > 0
        ? backlogK
        : years.y2026.revenueK > 0
          ? years.y2026.revenueK * (1 + safeK(financials.growth) / 100)
          : 0;
    pushYear(
      '2027F',
      {
        revenueK: rev2027K,
        ebitdaK: forwardEbitdaK,
        marginPct: rev2027K > 0 ? (forwardEbitdaK / rev2027K) * 100 : 0,
      },
      true,
    );
  }

  return points;
}

export function patchFinancialHistoryYear(
  financials: EquifyWizardFinancials,
  year: 'y2024' | 'y2025' | 'y2026',
  patch: Partial<YearFinancialsK>,
): EquifyWizardFinancials {
  const normalized = normalizeEquifyFinancials(financials);
  return syncFinancialsDerived({
    ...normalized,
    [year]: { ...normalized[year], ...patch },
  });
}
