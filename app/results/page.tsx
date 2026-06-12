'use client';

import { useEffect, useState } from 'react';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import { EquifyResultsReport } from '../../components/results/EquifyResultsReport';
import { ValuationI18nProvider, useValuationI18n } from '../../valuation_i18n';

const STORAGE_KEY = 'valubot.lastValuationMatrix';

function ResultsContent() {
  const { locale } = useValuationI18n();
  const [matrix, setMatrix] = useState<ForecastMatrixWithDiagnostics | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        setMatrix(JSON.parse(raw) as ForecastMatrixWithDiagnostics);
      }
    } catch {
      setMatrix(null);
    }
  }, []);

  return <EquifyResultsReport matrix={matrix} locale={locale} />;
}

export default function ResultsPage() {
  return (
    <ValuationI18nProvider>
      <ResultsContent />
    </ValuationI18nProvider>
  );
}
