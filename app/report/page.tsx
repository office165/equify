'use client';

import { EquifyResultsReport } from '../../components/results/EquifyResultsReport';
import { useReportHydration } from '../../components/results/useReportHydration';
import { ValuationI18nProvider, useValuationI18n } from '../../valuation_i18n';

function ReportContent() {
  const { locale } = useValuationI18n();
  const { matrix, equifyState, loading, error } = useReportHydration(locale);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-[var(--dim,#94a3b8)]">
        {locale === 'he' ? 'טוען דוח...' : 'Loading report...'}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-red-300">
        {error}
      </div>
    );
  }

  return <EquifyResultsReport matrix={matrix} equifyState={equifyState} />;
}

export default function ReportPage() {
  return (
    <ValuationI18nProvider>
      <ReportContent />
    </ValuationI18nProvider>
  );
}
