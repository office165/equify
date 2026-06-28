'use client';

import { useEffect, useState } from 'react';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import { EquifyResultsReport } from '../../components/results/EquifyResultsReport';
import { syncMatrixFromEquifyState } from '../../lib/valuation/sync_matrix_from_equify';
import { refreshFxRates } from '../../lib/utils/fxService';
import { loadEquifyWizardState } from '../../lib/wizard/equify_storage';
import type { EquifyWizardState } from '../../lib/wizard/map_equify_wizard';
import { ValuationI18nProvider, useValuationI18n } from '../../valuation_i18n';

const MATRIX_STORAGE_KEY = 'valubot.lastValuationMatrix';

function ResultsContent() {
  const { locale } = useValuationI18n();
  const [matrix, setMatrix] = useState<ForecastMatrixWithDiagnostics | null>(null);
  const [equifyState, setEquifyState] = useState<EquifyWizardState | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const storedState = loadEquifyWizardState();
        if (!cancelled) setEquifyState(storedState);

        const raw = sessionStorage.getItem(MATRIX_STORAGE_KEY);
        if (!raw) {
          if (!cancelled) setMatrix(null);
          return;
        }

        const parsed = JSON.parse(raw) as ForecastMatrixWithDiagnostics;
        await refreshFxRates();
        if (cancelled) return;

        if (storedState) {
          setMatrix(syncMatrixFromEquifyState(parsed, storedState, locale).matrix);
        } else {
          setMatrix(parsed);
        }
      } catch {
        if (!cancelled) setMatrix(null);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  return <EquifyResultsReport matrix={matrix} equifyState={equifyState} />;
}

export default function ResultsPage() {
  return (
    <ValuationI18nProvider>
      <ResultsContent />
    </ValuationI18nProvider>
  );
}
