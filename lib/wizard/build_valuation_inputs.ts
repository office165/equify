import {
  INDUSTRY_CONFIG,
  getSubSectorMultAdj,
} from '../constants/industry_config';
import {
  LIFECYCLE_ADJ,
  SECTOR_MULTIPLIERS,
  type EquifySectorKey,
  type ValuationInputs,
} from '../valuation';
import { BACKLOG_INFLECTION_RATIO_THRESHOLD } from '../valuation/backlog_inflection_accelerator';
import { normalizeValuationInputsToIls } from '../currency-normalize';
import { getCachedFxRates } from '../utils/fxService';
import type { EquifyWizardState } from './map_equify_wizard';
import { computeNetDebtK } from './map_equify_wizard';
import { syncFinancialsDerived } from './financial_history';
import { resolveLiveSectorMult } from './sector_market_defaults';

/** Single builder for wizard valuation inputs — live UI, PDF, matrix patch. */
export function buildValuationInputsFromEquifyState(
  state: EquifyWizardState,
  fxRates = getCachedFxRates(),
): ValuationInputs {
  const { risk, profile } = state;
  const financials = syncFinancialsDerived(state.financials);
  const netDebt = computeNetDebtK(financials);
  const { y2024, y2025, y2026 } = financials;
  const backlogSignedK = financials.backlogSignedK ?? 0;
  const revenue2026K = y2026.revenueK ?? 0;
  const backlogRatio =
    revenue2026K > 0 && backlogSignedK > 0 ? backlogSignedK / revenue2026K : 0;

  const rawInputs: ValuationInputs = {
    rev: y2026.revenueK,
    margin: financials.margin,
    growth: financials.growth,
    debt: netDebt,
    grossDebt: financials.grossDebtK,
    cash: financials.cashK,
    normalizedOwnerSalary: financials.normalizedOwnerSalaryK,
    capexLevelPct: financials.capexLevelPct,
    sector: profile.sector,
    subSector: profile.subSector,
    sectorMult: resolveLiveSectorMult(
      profile.sector,
      SECTOR_MULTIPLIERS[profile.sector],
      financials.marketContext,
    ),
    subSectorMult: getSubSectorMultAdj(profile.sector, profile.subSector),
    customMultiple: financials.customMultiple ?? null,
    isManualMultiple: financials.isManualMultiple ?? false,
    marketEvEbitda: financials.marketContext?.evEbitda,
    marketEvRevenue: financials.marketContext?.evRevenue,
    lifecycle: profile.lifecycle,
    lifecycleAdj: LIFECYCLE_ADJ[profile.lifecycle],
    unleveredBeta: financials.marketContext?.unleveredBeta,
    recurring: risk.recurring,
    topCustomer: risk.topCustomer,
    founderDep: risk.founderDep,
    competition: risk.competition,
    ip: risk.ip,
    contracts: risk.contracts,
    backlogSignedK,
    hasSignificantBacklog: backlogRatio >= BACKLOG_INFLECTION_RATIO_THRESHOLD,
    projectedEbitdaK: financials.projectedEbitdaK,
    revenue2026K,
    revenue2024K: y2024.revenueK,
    revenue2025K: y2025.revenueK,
    ebitda2024K: y2024.ebitdaK,
    ebitda2025K: y2025.ebitdaK,
    ebitda2026K: y2026.ebitdaK,
    ebitda2027K:
      financials.projectedEbitdaK[0] > 0 ? financials.projectedEbitdaK[0] : undefined,
  };

  return normalizeValuationInputsToIls(rawInputs, profile.currency, fxRates);
}

/** Resolve equify sector key from persisted industry code (CRM / matrix). */
export function resolveEquifySectorFromIndustryCode(
  industryCode: string | undefined,
): EquifySectorKey {
  const code = industryCode?.trim();
  if (!code) return 'other';

  for (const key of Object.keys(INDUSTRY_CONFIG) as EquifySectorKey[]) {
    if (INDUSTRY_CONFIG[key].industryCode === code) return key;
  }

  if (code === 'Defense & Military') return 'defense_aerospace';
  return 'other';
}
