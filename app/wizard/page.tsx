'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import ValuationDashboard, { type ForecastMatrixJson } from '../../ValuationDashboard';
import EquifyWizard from '../../components/wizard/equify/EquifyWizard';
import { runValuationFlow, type ValuationLocale } from '../../api_client';
import {
  clearBackupRelaySession,
  dispatchUnifiedBackupRelay,
} from '../../lib/pdf/backup_mirror';
import { clearLeadSession, postLeadEvent } from '../../lib/crm/leads_client';
import { getIndustryLabel } from '../../lib/constants/industries';
import {
  buildWizardLeadRelayInput,
  captureWizardLeadIdentifiers,
  lockLeadPayload,
} from '../../lib/wizard/lead_wire';
import { toLeadUpsertBody } from '../../lib/wizard/secured_lead_dispatch';
import { ValuationI18nProvider } from '../../valuation_i18n';

function captureLeadInBackground(
  values: Parameters<typeof runValuationFlow>[0],
  options: {
    locale: ValuationLocale;
    valuationMidpoint: number;
    sectorLabel?: string;
  },
): void {
  const valuationPurpose = values.valuationPurpose || undefined;
  const leadRelay = buildWizardLeadRelayInput(values, {
    valuationMidpoint: options.valuationMidpoint,
    locale: options.locale,
    industry: values.industry,
    sectorLabel: options.sectorLabel,
    pdfBase64: '',
  });

  void Promise.allSettled([
    postLeadEvent({
      event: 'wizard_completed',
      fullName: leadRelay.fullName,
      companyName: leadRelay.companyName,
      userEmail: leadRelay.userEmail,
      userPhone: leadRelay.userPhone,
      nationalId: leadRelay.nationalId,
      corporateTaxId: leadRelay.corporateTaxId,
      industryCode: values.industry,
      sectorLabel: options.sectorLabel,
      valuationPurpose,
      valuationMidpoint: options.valuationMidpoint,
      locale: options.locale,
    }),
    Promise.resolve(dispatchUnifiedBackupRelay(leadRelay)),
  ]).then((results) => {
    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      console.warn('[wizard] background lead capture had failures', failures);
    }
  });
}

export default function WizardPage() {
  const router = useRouter();
  const [forecastMatrix, setForecastMatrix] = useState<ForecastMatrixJson | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [wizardSessionKey, setWizardSessionKey] = useState(0);

  const handleRunValuation = useCallback(
    async (
      values: Parameters<typeof runValuationFlow>[0],
      options?: { locale?: ValuationLocale },
    ) => {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        const locale = options?.locale ?? 'he';
        const lockedPayload = lockLeadPayload(values, locale);
        const sectorLabel = values.industry
          ? getIndustryLabel(values.industry, locale)
          : undefined;

        const result = await runValuationFlow(values, options);
        const valuationMidpoint =
          result.forecast_matrix_json?.scenarios?.base?.enterprise_value ?? 0;

        const completedLeadBody = toLeadUpsertBody(
          captureWizardLeadIdentifiers(values),
          'wizard_completed',
          {
            corporateTaxId: lockedPayload.corporateTaxId,
            industryCode: values.industry,
            sectorLabel,
            valuationMidpoint,
            valuationPurpose: values.valuationPurpose || undefined,
            locale,
          },
        );
        console.log(
          '🚀 MONDAY INTEGRATION INGESTION INITIATED. PAYLOAD:',
          completedLeadBody,
        );
        void postLeadEvent(completedLeadBody).catch((err) => {
          console.error('❌ MONDAY ROUTING FAILURE:', err);
        });

        // שומרים מטריצה ל-sessionStorage — תוצאות מוצגות inline ב-EquifyWizard
        try {
          sessionStorage.setItem(
            'valubot.lastValuationMatrix',
            JSON.stringify(result.forecast_matrix_json),
          );
        } catch {
          // ignore quota errors
        }

        captureLeadInBackground(values, {
          locale,
          valuationMidpoint,
          sectorLabel,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Valuation request failed.';
        setSubmitError(message);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const handleRunAnotherValuation = useCallback(() => {
    clearBackupRelaySession();
    clearLeadSession();
    setForecastMatrix(null);
    setSubmitError(null);
    setWizardSessionKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleBackToHome = useCallback(() => {
    setForecastMatrix(null);
    setSubmitError(null);
    router.push('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [router]);

  return (
    <ValuationI18nProvider>
      {forecastMatrix ? (
        <ValuationDashboard
          forecast_matrix_json={forecastMatrix}
          onRunAnotherValuation={handleRunAnotherValuation}
          onBackToHome={handleBackToHome}
        />
      ) : (
        <EquifyWizard
          key={wizardSessionKey}
          onRunValuation={handleRunValuation}
          isSubmitting={isSubmitting}
          submitError={submitError}
        />
      )}
    </ValuationI18nProvider>
  );
}
