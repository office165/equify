'use client';

import { useEffect, useState } from 'react';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import { runValuationFlow, type ValuationLocale } from '../../api_client';
import { mapEquifyToWizardFormValues } from '../../lib/wizard/map_equify_wizard';
import type { EquifyWizardState } from '../../lib/wizard/map_equify_wizard';
import {
  loadBestEquifyWizardState,
  loadEquifyValuationState,
  persistEquifyValuationState,
  buildEquifyValuationSnapshot,
} from '../../lib/wizard/equify_valuation_persistence';
import { saveEquifyWizardState } from '../../lib/wizard/equify_storage';
import { syncMatrixFromEquifyState } from '../../lib/valuation/sync_matrix_from_equify';
import { refreshFxRates } from '../../lib/utils/fxService';
import { computeValuation } from '../../lib/valuation';
import { buildValuationInputsFromEquifyState } from '../../lib/wizard/build_valuation_inputs';

const MATRIX_STORAGE_KEY = 'valubot.lastValuationMatrix';

export interface UseReportHydrationResult {
  matrix: ForecastMatrixWithDiagnostics | null;
  equifyState: EquifyWizardState | null;
  loading: boolean;
  error: string | null;
}

export function useReportHydration(locale: ValuationLocale): UseReportHydrationResult {
  const [matrix, setMatrix] = useState<ForecastMatrixWithDiagnostics | null>(null);
  const [equifyState, setEquifyState] = useState<EquifyWizardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      setLoading(true);
      setError(null);

      try {
        const persisted = loadEquifyValuationState();
        const storedState = persisted?.wizard ?? loadBestEquifyWizardState();
        if (storedState) {
          saveEquifyWizardState(storedState);
          if (!cancelled) setEquifyState(storedState);
        }

        await refreshFxRates();
        if (cancelled) return;

        const rawMatrix = sessionStorage.getItem(MATRIX_STORAGE_KEY);
        if (rawMatrix) {
          const parsed = JSON.parse(rawMatrix) as ForecastMatrixWithDiagnostics;
          if (!cancelled) {
            setMatrix(
              storedState
                ? syncMatrixFromEquifyState(parsed, storedState, locale).matrix
                : parsed,
            );
          }
          return;
        }

        if (!storedState) {
          if (!cancelled) setMatrix(null);
          return;
        }

        const formValues = mapEquifyToWizardFormValues(storedState);
        const result = await runValuationFlow(formValues, { locale });
        if (cancelled) return;

        const synced = syncMatrixFromEquifyState(
          result.forecast_matrix_json,
          storedState,
          locale,
        ).matrix;

        sessionStorage.setItem(MATRIX_STORAGE_KEY, JSON.stringify(synced));

        if (persisted) {
          persistEquifyValuationState(persisted);
        } else {
          const computed = computeValuation(buildValuationInputsFromEquifyState(storedState));
          persistEquifyValuationState(
            buildEquifyValuationSnapshot(storedState, computed, {
              paymentPath: 'paypal',
            }),
          );
        }

        if (!cancelled) setMatrix(synced);
      } catch (err) {
        if (!cancelled) {
          setMatrix(null);
          setError(err instanceof Error ? err.message : 'report_hydration_failed');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  return { matrix, equifyState, loading, error };
}
