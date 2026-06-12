/**
 * Server-side forecast matrix builder (wizard inputs → dashboard JSON).
 */

import type { ValuationWizardFormValues } from './ValuationWizard';
import { parseFinancialInput } from './lib/utils/financialParser';
import {
  snapshotUserIdentifiers,
  type UserIdentifiersSnapshot,
} from './lib/validation/user_identifiers';
import {
  buildDiagnosticsInputsFromWizard,
  type DiagnosticsInputsSnapshot,
} from './api_client';
import {
  createSampleForecastMatrix,
  type ForecastMatrixJson,
} from './forecast_sample';
import { getIndustryLabel } from './lib/constants/industries';
import { computeSectorEnterpriseValue } from './lib/constants/sector_multipliers';
import type { MultiplesAnalysisSnapshot } from './lib/valuation/engine';
import type { ValuationLocale } from './api_client';

export type { MultiplesAnalysisSnapshot };

const DEFAULT_TAX_RATE = 0.23;

/** Wizard qualitative & risk inputs carried statelessly into the PDF. */
export interface WizardContextSnapshot {
  qualitative_description: string;
  recurring_revenue_percent: number;
  net_debt: number;
  customer_concentration_over_20: boolean;
  customer_concentration_pct: number;
  /** Contact full name from wizard Step 1 */
  full_name?: string;
  /** Legal / display company name from wizard Step 1 */
  company_name?: string;
  /** Stable industry code from wizard (e.g. renewable_energy) */
  industry_code?: string;
  /** Localized sector label for CRM / archive */
  sector_label?: string;
  /** Base64 data URL for white-label PDF branding */
  custom_logo_data_url?: string;
  /** Mandatory identity gate — required for report / PDF access */
  user_identifiers?: UserIdentifiersSnapshot;
}

export type ForecastMatrixWithDiagnostics = ForecastMatrixJson & {
  diagnostics_inputs?: DiagnosticsInputsSnapshot;
  wizard_context?: WizardContextSnapshot;
  /** Israeli market multiples analysis (2024–2026) — runs alongside DCF */
  multiples_analysis?: MultiplesAnalysisSnapshot;
};

export function resolveNetDebtFromWizard(values: ValuationWizardFormValues): number {
  const explicit = parseNumber(values.netDebt, NaN);
  if (values.netDebt.trim() && Number.isFinite(explicit)) {
    return explicit;
  }
  return (
    parseNumber(values.totalDebt, 0) - parseNumber(values.cashAndEquivalents, 0)
  );
}

export function buildWizardContextFromWizard(
  values: ValuationWizardFormValues,
  locale: ValuationLocale = 'en',
): WizardContextSnapshot {
  const concentrationPct = values.customerConcentrationOver20
    ? Math.max(values.customerConcentrationPct, 20)
    : values.customerConcentrationPct;
  const industryCode = values.industry.trim();

  return {
    qualitative_description: values.qualitativeDescription.trim(),
    recurring_revenue_percent: values.recurringRevenuePct,
    net_debt: resolveNetDebtFromWizard(values),
    customer_concentration_over_20: values.customerConcentrationOver20,
    customer_concentration_pct: concentrationPct,
    full_name: values.fullName.trim() || undefined,
    company_name: values.companyName.trim() || undefined,
    industry_code: industryCode || undefined,
    sector_label: industryCode ? getIndustryLabel(industryCode, locale) : undefined,
    custom_logo_data_url: values.customLogoDataUrl.trim() || undefined,
    user_identifiers: snapshotUserIdentifiers(values),
  };
}

function parseNumber(value: string, fallback = 0): number {
  if (!value.trim()) return fallback;
  const n = parseFinancialInput(value);
  return Number.isFinite(n) ? n : fallback;
}

export function buildForecastMatrixFromWizard(
  values: ValuationWizardFormValues,
  valuationId: string,
  locale: ValuationLocale = 'en',
): ForecastMatrixWithDiagnostics {
  const sample = createSampleForecastMatrix();
  const revenue = parseNumber(values.annualRevenue, sample.assumptions.base_revenue);
  const ebitda = parseNumber(values.ebitda, 0);
  const ebitEstimate = ebitda > 0 ? ebitda * 0.85 : sample.assumptions.adjusted_ebit;
  const debt = parseNumber(values.totalDebt, sample.capital_structure.total_debt);
  const cash = parseNumber(
    values.cashAndEquivalents,
    sample.capital_structure.cash_and_equivalents,
  );
  const taxRate = sample.assumptions.effective_tax_rate ?? DEFAULT_TAX_RATE;
  const diagnostics_inputs = buildDiagnosticsInputsFromWizard(values, taxRate);

  const baseRevenue = revenue > 0 ? revenue : sample.assumptions.base_revenue;
  const sectorEv = computeSectorEnterpriseValue(
    values.industry,
    baseRevenue,
    ebitda,
  );
  const baseEv =
    sectorEv > 0
      ? sectorEv
      : Math.round(baseRevenue * 4.5 * 100) / 100;
  const bearEv = Math.round(baseEv * 0.82 * 100) / 100;
  const bullEv = Math.round(baseEv * 1.18 * 100) / 100;
  const netDebt = resolveNetDebtFromWizard(values);
  const equityBase = Math.round((baseEv - netDebt) * 100) / 100;

  return {
    ...sample,
    meta: {
      ...sample.meta,
      company_name: values.companyName.trim() || sample.meta.company_name,
      currency: values.currency || sample.meta.currency,
      valuation_id: valuationId,
      generated_at: new Date().toISOString(),
    },
    assumptions: {
      ...sample.assumptions,
      adjusted_ebit: ebitEstimate,
      base_revenue: baseRevenue,
    },
    capital_structure: {
      ...sample.capital_structure,
      total_debt: debt,
      cash_and_equivalents: cash,
      valuation_purpose:
        values.valuationPurpose || sample.capital_structure.valuation_purpose,
    },
    enterprise_value: baseEv,
    scenarios: {
      bear: {
        enterprise_value: bearEv,
        final_equity_value: Math.round(equityBase * 0.82 * 100) / 100,
      },
      base: {
        enterprise_value: baseEv,
        final_equity_value: equityBase,
      },
      bull: {
        enterprise_value: bullEv,
        final_equity_value: Math.round(equityBase * 1.18 * 100) / 100,
      },
    },
    diagnostics_inputs,
    wizard_context: buildWizardContextFromWizard(values, locale),
  };
}
