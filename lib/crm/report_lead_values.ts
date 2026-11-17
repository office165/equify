/**
 * Lead / Monday valuation values from the customer report engine (LEAD_VALUE_FROM_REPORT=on).
 * Same path as the PDF: buildValuationInputsFromEquifyState -> computeValuation, so the
 * number in Monday equals "שווי לבעלים" in the report (ILS).
 */
import { computeValuation } from '../valuation';
import { buildValuationInputsFromEquifyState } from '../wizard/build_valuation_inputs';
import { syncFinancialsDerived } from '../wizard/financial_history';
import type { EquifyWizardState } from '../wizard/map_equify_wizard';
import type { FxRatesSnapshot } from '../utils/fxService';
import { getCachedFxRates } from '../utils/fxService';
import { isFlagOn } from '../flags/round1_flags';
import type { LeadUpsertBody } from './leads_types';

export interface ReportLeadValues {
  /** Equity value in ILS (full shekels), as in the report. */
  reportValuationMidpoint: number;
  reportQualityScore: number;
}

export function computeReportLeadValues(
  state: EquifyWizardState,
  fxRates: FxRatesSnapshot = getCachedFxRates(),
): ReportLeadValues {
  const synced = { ...state, financials: syncFinancialsDerived(state.financials) };
  const computed = computeValuation(buildValuationInputsFromEquifyState(synced, fxRates));
  return {
    reportValuationMidpoint: Math.round(computed.equity * 1000),
    reportQualityScore: computed.qs,
  };
}

/** Server side: picks the report-engine values when the flag is on and they were sent. */
export function applyLeadValueSource(body: LeadUpsertBody, env: NodeJS.ProcessEnv = process.env): LeadUpsertBody {
  if (!isFlagOn('LEAD_VALUE_FROM_REPORT', env)) return body;
  const next = { ...body };
  if (typeof body.reportValuationMidpoint === 'number' && body.reportValuationMidpoint > 0) {
    next.valuationMidpoint = body.reportValuationMidpoint;
  }
  if (typeof body.reportQualityScore === 'number' && Number.isFinite(body.reportQualityScore)) {
    next.qualityScore = body.reportQualityScore;
  }
  return next;
}
