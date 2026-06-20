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
import type { EquifyWizardState } from './map_equify_wizard';
import { computeNetDebtK } from './map_equify_wizard';

/** Single builder for wizard valuation inputs — live UI, PDF, matrix patch. */
export function buildValuationInputsFromEquifyState(
  state: EquifyWizardState,
): ValuationInputs {
  const { financials, risk, profile } = state;
  const netDebt = computeNetDebtK(financials);
  return {
    rev: financials.rev,
    margin: financials.margin,
    growth: financials.growth,
    debt: netDebt,
    grossDebt: financials.grossDebtK,
    cash: financials.cashK,
    normalizedOwnerSalary: financials.normalizedOwnerSalaryK,
    capexLevelPct: financials.capexLevelPct,
    sector: profile.sector,
    sectorMult: SECTOR_MULTIPLIERS[profile.sector],
    subSectorMult: getSubSectorMultAdj(profile.sector, profile.subSector),
    lifecycleAdj: LIFECYCLE_ADJ[profile.lifecycle],
    recurring: risk.recurring,
    topCustomer: risk.topCustomer,
    founderDep: risk.founderDep,
    competition: risk.competition,
    ip: risk.ip,
    contracts: risk.contracts,
  };
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
