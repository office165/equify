/**
 * Secure anonymized ML training ingestion — `ml_training_dataset`.
 */

import type { Pool } from 'pg';
import type { ValuationWizardFormValues } from '../../ValuationWizard';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import { SessionTokenService } from '../auth/session_token_service';

export interface MlTrainingIngestInput {
  valuationId: string;
  wizard: ValuationWizardFormValues;
  forecastMatrix: ForecastMatrixWithDiagnostics;
  locale?: string;
}

export interface MlRiskModifiers {
  recurring_revenue_pct: number;
  customer_concentration_pct: number;
  competition_level: number;
  ip_protection: boolean;
  founder_dependency: boolean;
  industry: string;
}

function parseNumber(value: string, fallback = 0): number {
  const cleaned = value.replace(/,/g, '').trim();
  if (!cleaned) return fallback;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

function extractMidpointMultiRunOutcome(matrix: ForecastMatrixWithDiagnostics): number {
  const scenarios = matrix.scenarios;
  if (scenarios?.bear && scenarios?.base && scenarios?.bull) {
    const values = [
      scenarios.bear.enterprise_value,
      scenarios.base.enterprise_value,
      scenarios.bull.enterprise_value,
    ].filter((v) => Number.isFinite(v));
    if (values.length > 0) {
      return values.reduce((a, b) => a + b, 0) / values.length;
    }
  }
  if (matrix.enterprise_value && Number.isFinite(matrix.enterprise_value)) {
    return matrix.enterprise_value;
  }
  if (matrix.terminal_value?.terminal_value) {
    return matrix.terminal_value.terminal_value;
  }
  const revenue = matrix.assumptions.base_revenue;
  return Math.round(revenue * 4.15 * 100) / 100;
}

export class MlTrainingPipelineService {
  private readonly anonymizer = new SessionTokenService();

  constructor(private readonly pool: Pool) {}

  async ingestCompletedValuation(input: MlTrainingIngestInput): Promise<void> {
    const revenue = parseNumber(input.wizard.annualRevenue, 0);
    const ebitda = parseNumber(input.wizard.ebitda, 0);
    const normalizedRevenue =
      revenue > 0 ? Math.round((revenue / 1_000_000) * 1_000_000) / 1_000_000 : 0;
    const ebitdaMargin = revenue > 0 ? ebitda / revenue : 0;

    const riskModifiers: MlRiskModifiers = {
      recurring_revenue_pct: input.wizard.recurringRevenuePct,
      customer_concentration_pct: input.wizard.customerConcentrationPct,
      competition_level: input.wizard.competitionLevel,
      ip_protection: input.wizard.ipProtection,
      founder_dependency: input.wizard.founderDependency,
      industry: input.wizard.industry,
    };

    const midpoint = extractMidpointMultiRunOutcome(input.forecastMatrix);
    const anonymizedRunId = this.anonymizer.anonymizeRunId(input.valuationId);
    const sectorCode = input.wizard.industry?.trim() || 'UNCLASSIFIED';

    const featureVector = {
      currency: input.wizard.currency,
      valuation_purpose: input.wizard.valuationPurpose,
      wacc: input.forecastMatrix.assumptions.wacc,
      g_terminal: input.forecastMatrix.assumptions.g_terminal,
      confidence_score: input.forecastMatrix.meta.confidence_score,
      total_debt: input.forecastMatrix.capital_structure.total_debt,
      cash: input.forecastMatrix.capital_structure.cash_and_equivalents,
    };

    await this.pool.query(
      `INSERT INTO ml_training_dataset (
         anonymized_run_id, sector_code, normalized_revenue, ebitda_margin,
         risk_modifiers, midpoint_multi_run_outcome, feature_vector, locale
       ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8)
       ON CONFLICT (anonymized_run_id) DO UPDATE SET
         sector_code = EXCLUDED.sector_code,
         normalized_revenue = EXCLUDED.normalized_revenue,
         ebitda_margin = EXCLUDED.ebitda_margin,
         risk_modifiers = EXCLUDED.risk_modifiers,
         midpoint_multi_run_outcome = EXCLUDED.midpoint_multi_run_outcome,
         feature_vector = EXCLUDED.feature_vector,
         locale = EXCLUDED.locale,
         ingested_at = NOW()`,
      [
        anonymizedRunId,
        sectorCode,
        normalizedRevenue,
        ebitdaMargin,
        JSON.stringify(riskModifiers),
        midpoint,
        JSON.stringify(featureVector),
        input.locale ?? 'en',
      ],
    );
  }
}
