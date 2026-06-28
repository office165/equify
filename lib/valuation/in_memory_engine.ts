/**
 * Emergency MVP valuation engine — 100% in-memory, zero database I/O.
 * Computes forecast matrix (WACC overlays, DCF inputs, scenario multiples) from wizard intake.
 */

import * as crypto from 'node:crypto';
import type {
  PaymentVerification,
  ValuationCalculateSuccessResponse,
  ValuationLocale,
} from '../../api_client';
import type { ValuationWizardFormValues } from '../../ValuationWizard';
import {
  buildForecastMatrixFromWizard,
  resolveNetDebtFromWizard,
} from '../../valuation_forecast';
import { runIsraelMultiplesValuation } from './engine';
import type { WizardValuationCalculateRequest } from '../../valuation_live';
import { LIVE_ON_DEMAND_AMOUNT_ILS, LIVE_ON_DEMAND_CURRENCY } from '../../valuation_live';
import {
  putInMemoryValuation,
  type InMemoryValuationRecord,
} from './in_memory_store';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseWizardNumber(value: string, fallback = 0): number {
  const cleaned = value.replace(/,/g, '').trim();
  if (!cleaned) return fallback;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Risk-adjusted WACC overlay from wizard modifiers (in-memory only).
 */
export function deriveWaccFromWizard(wizard: ValuationWizardFormValues): number {
  // Israeli market WACC build-up (Damodaran 2026 conventions)
  const riskFree = 0.045;        // Israel 10Y government bond yield
  const erp = 0.055;             // Global ERP (Damodaran)
  const crp = 0.028;             // Israel Country Risk Premium 2026 (war premium)
  const baseCostOfEquity = riskFree + erp + crp; // 12.8%

  // Size premium (Ibbotson): micro-cap Israeli private companies
  const revenue = parseWizardNumber(wizard.annualRevenue, 0);
  const sizePremium = revenue < 1_500_000 ? 0.0407 : revenue < 10_000_000 ? 0.0250 : 0.0181;

  // Risk overlays
  const competitionAdj = (wizard.competitionLevel - 3) * 0.010;
  const concentrationPct = wizard.customerConcentrationOver20
    ? Math.max(wizard.customerConcentrationPct, 20)
    : wizard.customerConcentrationPct;
  const concentrationAdj = (concentrationPct / 100) * 0.035;
  const recurringDiscount = (wizard.recurringRevenuePct / 100) * -0.020;
  const founderAdj = wizard.founderDependency ? 0.018 : 0;
  const ipAdj = wizard.ipProtection ? -0.012 : 0.008;
  const lifecycleAdj =
    wizard.lifecycleStage === 'seed'       ? 0.045
    : wizard.lifecycleStage === 'early'    ? 0.025
    : wizard.lifecycleStage === 'mature'   ? -0.008
    : (wizard.lifecycleStage as string) === 'distressed' ? 0.06
    : 0;

  return clamp(
    baseCostOfEquity + sizePremium + competitionAdj + concentrationAdj
      + recurringDiscount + founderAdj + ipAdj + lifecycleAdj,
    0.13,  // realistic Israeli private-company floor
    0.35,
  );
}

function applyWaccToMatrix(
  matrix: ReturnType<typeof buildForecastMatrixFromWizard>,
  wacc: number,
  wizard: ValuationWizardFormValues,
): ReturnType<typeof buildForecastMatrixFromWizard> {
  const revenue = parseWizardNumber(wizard.annualRevenue, matrix.assumptions.base_revenue);
  const ebitda = parseWizardNumber(wizard.ebitda, 0);

  const multiplesAnalysis = runIsraelMultiplesValuation(wizard, { isPrivate: true });
  const { low: bearEv, base: baseEv, high: bullEv } = multiplesAnalysis.valuationRange;

  const netDebt = resolveNetDebtFromWizard(wizard);
  const equityBase = Math.round((baseEv - netDebt) * 100) / 100;

  return {
    ...matrix,
    assumptions: {
      ...matrix.assumptions,
      wacc,
      adjusted_ebit: ebitda > 0 ? ebitda * 0.85 : matrix.assumptions.adjusted_ebit,
      base_revenue: revenue > 0 ? revenue : matrix.assumptions.base_revenue,
    },
    enterprise_value: baseEv,
    scenarios: {
      bear: {
        enterprise_value: bearEv,
        final_equity_value: Math.round((bearEv - netDebt) * 100) / 100,
      },
      base: {
        enterprise_value: baseEv,
        final_equity_value: equityBase,
      },
      bull: {
        enterprise_value: bullEv,
        final_equity_value: Math.round((bullEv - netDebt) * 100) / 100,
      },
    },
    multiples_analysis: multiplesAnalysis,
  };
}

/**
 * Run valuation entirely in memory — mock payment + UUID, no persistence layer.
 */
export function executeInMemoryValuation(
  body: WizardValuationCalculateRequest,
): ValuationCalculateSuccessResponse {
  const valuationId = crypto.randomUUID();
  const locale: ValuationLocale = body.locale === 'he' ? 'he' : 'en';
  const wacc = deriveWaccFromWizard(body.wizard);

  const rawMatrix = buildForecastMatrixFromWizard(body.wizard, valuationId, locale);
  const forecast_matrix_json = applyWaccToMatrix(rawMatrix, wacc, body.wizard);

  const record: InMemoryValuationRecord = {
    valuationId,
    forecast_matrix_json,
    locale,
    companyName: body.wizard.companyName.trim() || body.companyId,
    createdAt: new Date().toISOString(),
  };
  putInMemoryValuation(record);

  const payment: PaymentVerification = {
    verified: true,
    gatewayTransactionId: `txn_mvp_${valuationId.slice(0, 8)}`,
    gatewaySaleId: `sale_mvp_${valuationId.slice(0, 8)}`,
    amount: LIVE_ON_DEMAND_AMOUNT_ILS,
    currency: LIVE_ON_DEMAND_CURRENCY,
    status: 'success',
  };

  return {
    status: 'completed',
    valuationId,
    entitlement: 'on_demand_token',
    payment,
    forecast_matrix_json,
  };
}
