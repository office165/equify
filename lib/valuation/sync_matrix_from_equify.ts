import type { ValuationLocale } from '../../api_client';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import { getIndustryConfig, getSectorDisplayLabel } from '../constants/industry_config';
import { getIndustryLabel } from '../constants/industries';
import { isValidLogoDataUrl } from '../utils/logo_data_url';
import {
  computeScenarios,
  computeValuation,
  type ValuationComputed,
  type ValuationScenarios,
} from '../valuation';
import { capGrowthPctForSector } from './sector_configs';
import type { EquifyWizardState } from '../wizard/map_equify_wizard';
import {
  computeNetDebtK,
  mapEquifyToWizardFormValues,
} from '../wizard/map_equify_wizard';
import { buildValuationInputsFromEquifyState } from '../wizard/build_valuation_inputs';
import { applyReportingFxLayer } from './apply_reporting_fx';
import { getCachedFxRates } from '../utils/fxService';
import { resolveDisplayCompanyName } from '../wizard/resolve_company_display';
import { buildWizardContextFromWizard } from '../../valuation_forecast';

const K_TO_ABS = (k: number) => Math.round(k * 1000 * 100) / 100;

export interface EquifyMatrixSyncResult {
  matrix: ForecastMatrixWithDiagnostics;
  computed: ValuationComputed;
  scenarios: ValuationScenarios;
}

/** Align forecast matrix with equify engine — same numbers as live wizard + PDF. */
export function syncMatrixFromEquifyState(
  matrix: ForecastMatrixWithDiagnostics,
  state: EquifyWizardState,
  locale: ValuationLocale = 'he',
): EquifyMatrixSyncResult {
  const { financials, profile, risk } = state;
  const inputs = buildValuationInputsFromEquifyState(state);
  const baseComputed = computeValuation(inputs);
  const baseScenarios = computeScenarios(baseComputed, inputs);
  const { computed, scenarios } = applyReportingFxLayer(
    baseComputed,
    baseScenarios,
    profile.currency,
    getCachedFxRates(),
  );
  const netDebtK = computeNetDebtK(financials);
  const netDebtAbs = K_TO_ABS(netDebtK);
  const revAbs = K_TO_ABS(financials.rev);
  const ebitdaAbs = K_TO_ABS(computed.ebitda);
  const ebitAbs = Math.round(ebitdaAbs * 0.85 * 100) / 100;
  const growthDec = computed.dcfGrowthPct / 100;
  const waccDec = computed.wacc / 100;
  const formValues = mapEquifyToWizardFormValues(state);
  const industryCode = getIndustryConfig(profile.sector).industryCode;
  const displayName = resolveDisplayCompanyName(profile.companyName, locale);

  const existing = matrix.scenarios ?? {
    bear: { enterprise_value: 0, final_equity_value: 0 },
    base: { enterprise_value: 0, final_equity_value: 0 },
    bull: { enterprise_value: 0, final_equity_value: 0 },
  };

  const syncedMatrix: ForecastMatrixWithDiagnostics = {
    ...matrix,
    meta: {
      ...matrix.meta,
      company_name: displayName,
      currency: profile.currency || matrix.meta.currency || 'ILS',
      confidence_score: computed.qs,
      generated_at: matrix.meta.generated_at ?? new Date().toISOString(),
    },
    assumptions: {
      ...matrix.assumptions,
      wacc: waccDec,
      g_terminal: 0.025,
      adjusted_ebit: ebitAbs,
      base_revenue: revAbs,
      revenue_growth_rates: [
        growthDec,
        growthDec * 0.92,
        growthDec * 0.85,
        growthDec * 0.78,
        growthDec * 0.72,
      ],
      ebit_margin_targets: Array(5).fill(financials.margin / 100),
      capex_pct_of_revenue: financials.capexLevelPct / 100,
    },
    capital_structure: {
      ...matrix.capital_structure,
      total_debt: K_TO_ABS(financials.grossDebtK),
      cash_and_equivalents: K_TO_ABS(financials.cashK),
      market_cap_or_offer_price: K_TO_ABS(computed.equity),
      valuation_purpose:
        formValues.valuationPurpose ||
        matrix.capital_structure.valuation_purpose,
    },
    enterprise_value: K_TO_ABS(computed.ev),
    scenarios: {
      bear: {
        ...existing.bear,
        enterprise_value: K_TO_ABS(scenarios.bearEv),
        final_equity_value: K_TO_ABS(scenarios.bearEq),
      },
      base: {
        ...existing.base,
        enterprise_value: K_TO_ABS(computed.ev),
        final_equity_value: K_TO_ABS(computed.equity),
      },
      bull: {
        ...existing.bull,
        enterprise_value: K_TO_ABS(scenarios.bullEv),
        final_equity_value: K_TO_ABS(scenarios.bullEq),
      },
    },
    terminal_value: {
      ...matrix.terminal_value,
      wacc: waccDec,
      g_terminal: 0.025,
      terminal_value: K_TO_ABS(computed.dcf * 0.57),
      pv_terminal: K_TO_ABS(computed.dcf * 0.57),
    },
    wizard_context: {
      ...buildWizardContextFromWizard(formValues, locale),
      qualitative_description: profile.qualitativeDescription,
      recurring_revenue_percent: risk.recurring,
      net_debt: netDebtAbs,
      customer_concentration_over_20: risk.topCustomer > 20,
      customer_concentration_pct: risk.topCustomer,
      full_name: profile.fullName || undefined,
      company_name: displayName,
      industry_code: industryCode,
      sector_label:
        getSectorDisplayLabel(profile.sector, profile.subSector, locale) ||
        getIndustryLabel(industryCode, locale),
      custom_logo_data_url: isValidLogoDataUrl(profile.customLogoDataUrl)
        ? profile.customLogoDataUrl
        : undefined,
    },
  };

  return { matrix: syncedMatrix, computed, scenarios };
}

/** @deprecated Use syncMatrixFromEquifyState */
export function applyEquifyValuationToMatrix(
  matrix: ForecastMatrixWithDiagnostics,
  state: EquifyWizardState,
  locale: ValuationLocale = 'he',
): ForecastMatrixWithDiagnostics {
  return syncMatrixFromEquifyState(matrix, state, locale).matrix;
}
