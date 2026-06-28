import type { ValuationLocale } from '../../api_client';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import { coerceWizardSectorSelection } from '../constants/industry_config';
import { mapEngineResultToValuationData } from '../pdf-template/map-from-wizard';
import type { ValuationData } from '../pdf-template/types';
import { syncMatrixFromEquifyState } from '../valuation/sync_matrix_from_equify';
import { getCachedFxRates } from '../utils/fxService';
import { buildValuationInputsFromEquifyState } from '../wizard/build_valuation_inputs';
import { syncFinancialsDerived } from '../wizard/financial_history';
import type { EquifyWizardState } from '../wizard/map_equify_wizard';

/** Builds PDF layout data from the same sync path as the live results dashboard. */
export function buildExportValuationDataFromLiveSession(
  matrix: ForecastMatrixWithDiagnostics,
  state: EquifyWizardState,
  locale: ValuationLocale = 'he',
  reportId?: string,
): ValuationData {
  const coerced = coerceWizardSectorSelection(state.profile.sector, state.profile.subSector);
  const syncedState: EquifyWizardState = {
    ...state,
    profile: {
      ...state.profile,
      sector: coerced.sector,
      subSector: coerced.subSector,
    },
    financials: syncFinancialsDerived(state.financials),
  };
  const sync = syncMatrixFromEquifyState(matrix, syncedState, locale);
  const inputs = buildValuationInputsFromEquifyState(syncedState);
  const fxRates = getCachedFxRates();

  return mapEngineResultToValuationData(
    syncedState,
    inputs,
    sync.computed,
    sync.scenarios,
    fxRates,
    locale,
    reportId,
  );
}
