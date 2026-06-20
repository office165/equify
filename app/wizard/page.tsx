'use client';

import { useCallback, useEffect, useState } from 'react';
import EquifyWizard from '../../components/wizard/equify/EquifyWizard';
import { runValuationFlow, type ValuationLocale } from '../../api_client';
import { dispatchUnifiedBackupRelay } from '../../lib/pdf/backup_mirror';
import { postLeadEvent } from '../../lib/crm/leads_client';
import { getIndustryLabel } from '../../lib/constants/industries';
import {
  buildWizardLeadRelayInput,
  captureWizardLeadIdentifiers,
  lockLeadPayload,
} from '../../lib/wizard/lead_wire';
import { syncMatrixFromEquifyState } from '../../lib/valuation/sync_matrix_from_equify';
import { loadEquifyWizardState, saveEquifyWizardState } from '../../lib/wizard/equify_storage';
import type { EquifyWizardState } from '../../lib/wizard/map_equify_wizard';
import { resolveBaseEquityValue } from '../../lib/wizard/resolve_base_equity';
import { toLeadUpsertBody } from '../../lib/wizard/secured_lead_dispatch';
import { resumeWizardProgressQueue } from '../../lib/wizard/wizard_progress_queue';
import { ValuationI18nProvider } from '../../valuation_i18n';

function captureLeadInBackground(
  values: Parameters<typeof runValuationFlow>[0],
  options: {
    locale: ValuationLocale;
    valuationMidpoint: number;
    sectorLabel?: string;
  },
): void {
  const leadRelay = buildWizardLeadRelayInput(values, {
    valuationMidpoint: options.valuationMidpoint,
    locale: options.locale,
    industry: values.industry,
    sectorLabel: options.sectorLabel,
    pdfBase64: '',
  });

  void Promise.resolve(dispatchUnifiedBackupRelay(leadRelay)).catch((err) => {
    console.warn('[wizard] backup relay failed', err);
  });
}

export default function WizardPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [wizardSessionKey, setWizardSessionKey] = useState(0);

  useEffect(() => {
    resumeWizardProgressQueue();
  }, []);

  const handleRunValuation = useCallback(
    async (
      values: Parameters<typeof runValuationFlow>[0],
      options?: { locale?: ValuationLocale; equifyState?: EquifyWizardState },
    ) => {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        const locale = options?.locale ?? 'he';
        const equifyState = options?.equifyState;
        if (equifyState) {
          saveEquifyWizardState(equifyState);
        }
        const lockedPayload = lockLeadPayload(values, locale);
        const sectorLabel = values.industry
          ? getIndustryLabel(values.industry, locale)
          : undefined;

        const result = await runValuationFlow(values, options);
        const valuationMidpoint = resolveBaseEquityValue(
          result.forecast_matrix_json,
        );
        const qualityScore =
          result.forecast_matrix_json?.meta?.confidence_score ?? undefined;

        const completedLeadBody = toLeadUpsertBody(
          captureWizardLeadIdentifiers(values),
          'wizard_completed',
          {
            corporateTaxId: lockedPayload.corporateTaxId,
            industryCode: values.industry,
            sectorLabel,
            valuationMidpoint,
            qualityScore,
            valuationPurpose: values.valuationPurpose || undefined,
            locale,
          },
        );
        console.log(
          '🚀 MONDAY INTEGRATION INGESTION INITIATED. PAYLOAD:',
          completedLeadBody,
        );
        await postLeadEvent(completedLeadBody).catch((err) => {
          console.error('❌ MONDAY ROUTING FAILURE:', err);
        });

        try {
          const stateForSync = equifyState ?? loadEquifyWizardState();
          const matrixJson = stateForSync
            ? syncMatrixFromEquifyState(
                result.forecast_matrix_json,
                stateForSync,
                locale,
              ).matrix
            : result.forecast_matrix_json;
          sessionStorage.setItem(
            'valubot.lastValuationMatrix',
            JSON.stringify(matrixJson),
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

  return (
    <ValuationI18nProvider>
      <EquifyWizard
        key={wizardSessionKey}
        onRunValuation={handleRunValuation}
        isSubmitting={isSubmitting}
        submitError={submitError}
      />
    </ValuationI18nProvider>
  );
}
