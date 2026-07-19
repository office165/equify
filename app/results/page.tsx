'use client';

import { EquifyResultsReport } from '../../components/results/EquifyResultsReport';
import { useReportHydration } from '../../components/results/useReportHydration';
import { ValuationI18nProvider, useValuationI18n } from '../../valuation_i18n';

function supportWhatsAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_URL?.trim() ||
    'https://wa.me/'
  );
}

function ResultsContent() {
  const { locale } = useValuationI18n();
  const { matrix, equifyState, loading, paymentVerifyStatus } =
    useReportHydration(locale);
  const isHe = locale === 'he';

  if (loading || paymentVerifyStatus === 'verifying') {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center text-sm text-[var(--dim,#94a3b8)]">
        <p>
          {paymentVerifyStatus === 'verifying'
            ? isHe
              ? 'מאמתים את התשלום...'
              : 'Verifying your payment...'
            : isHe
              ? 'טוען תוצאות...'
              : 'Loading results...'}
        </p>
      </div>
    );
  }

  if (paymentVerifyStatus === 'timeout') {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <p className="text-sm text-slate-300">
          {isHe
            ? 'עדיין לא אימתנו את התשלום. אפשר לרענן את העמוד או לפנות אלינו בוואטסאפ.'
            : 'We could not verify payment yet. Refresh the page or contact us on WhatsApp.'}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            className="rounded-full border border-slate-700/50 bg-[#111815] px-5 py-2 text-sm text-slate-100 transition hover:border-emerald-500/20"
            onClick={() => window.location.reload()}
          >
            {isHe ? 'רענון' : 'Refresh'}
          </button>
          <a
            href={supportWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-[#00F5A0] px-5 py-2 text-sm font-semibold text-[#020504] transition hover:opacity-90"
          >
            WhatsApp
          </a>
        </div>
      </div>
    );
  }

  return <EquifyResultsReport matrix={matrix} equifyState={equifyState} />;
}

export default function ResultsPage() {
  return (
    <ValuationI18nProvider>
      <ResultsContent />
    </ValuationI18nProvider>
  );
}
