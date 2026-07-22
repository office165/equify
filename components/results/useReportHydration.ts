'use client';

import { useEffect, useState } from 'react';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import {
  VALUATION_DISPATCH_PATH,
  runValuationFlow,
  type ValuationLocale,
} from '../../api_client';
import { mapEquifyToWizardFormValues } from '../../lib/wizard/map_equify_wizard';
import type { EquifyWizardState } from '../../lib/wizard/map_equify_wizard';
import {
  loadBestEquifyWizardState,
  loadEquifyValuationState,
  persistEquifyValuationState,
  buildEquifyValuationSnapshot,
  type EquifyValuationPersistedState,
} from '../../lib/wizard/equify_valuation_persistence';
import { saveEquifyWizardState } from '../../lib/wizard/equify_storage';
import { syncMatrixFromEquifyState } from '../../lib/valuation/sync_matrix_from_equify';
import { refreshFxRates } from '../../lib/utils/fxService';
import { postDeliverEquifyReport } from '../../lib/reports/deliver_report_client';
import { computeValuation } from '../../lib/valuation';
import { buildValuationInputsFromEquifyState } from '../../lib/wizard/build_valuation_inputs';
import { EQUIFY_DISPATCH_TOKEN_KEY } from '../../lib/payments/dispatch_token_storage';

const MATRIX_STORAGE_KEY = 'valubot.lastValuationMatrix';
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

export type PaymentVerifyStatus = 'idle' | 'verifying' | 'delivered' | 'timeout';

export interface UseReportHydrationResult {
  matrix: ForecastMatrixWithDiagnostics | null;
  equifyState: EquifyWizardState | null;
  loading: boolean;
  error: string | null;
  paymentVerifyStatus: PaymentVerifyStatus;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function peekDispatchValuationId(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2 || !parts[1]) return null;
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as { valuationId?: unknown };
    return typeof payload.valuationId === 'string' ? payload.valuationId : null;
  } catch {
    return null;
  }
}

function readStoredDispatchToken(): string | null {
  try {
    const token = sessionStorage.getItem(EQUIFY_DISPATCH_TOKEN_KEY);
    return token?.trim() || null;
  } catch {
    return null;
  }
}

function clearStoredDispatchToken(): void {
  try {
    sessionStorage.removeItem(EQUIFY_DISPATCH_TOKEN_KEY);
  } catch {
    // ignore
  }
}

async function dispatchWithBearerToken(input: {
  dispatchToken: string;
  valuationId: string;
  locale: ValuationLocale;
  email: string;
  phone?: string;
  forecastMatrix: ForecastMatrixWithDiagnostics;
}): Promise<boolean> {
  try {
    const response = await fetch(VALUATION_DISPATCH_PATH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${input.dispatchToken}`,
      },
      body: JSON.stringify({
        valuationId: input.valuationId,
        locale: input.locale,
        email: input.email,
        phone: input.phone,
        forecast_matrix_json: input.forecastMatrix,
      }),
    });
    return response.ok || response.status === 202;
  } catch {
    return false;
  }
}

async function pollPaypalDeliver(input: {
  persisted: EquifyValuationPersistedState;
  locale: ValuationLocale;
  forecastMatrix: ForecastMatrixWithDiagnostics;
  signal: { cancelled: boolean };
  onVerifying: () => void;
  triggerType: 'PAYPAL_PAID' | 'PROMO_FREE';
}): Promise<'delivered' | 'timeout' | 'failed'> {
  const deliveredKey = `equify.report.delivered:${input.persisted.savedAt}`;
  if (sessionStorage.getItem(deliveredKey)) {
    return 'delivered';
  }

  input.onVerifying();
  const startedAt = Date.now();

  while (!input.signal.cancelled && Date.now() - startedAt < POLL_TIMEOUT_MS) {
    const result = await postDeliverEquifyReport({
      mondayItemId: input.persisted.mondayItemId,
      email: input.persisted.userEmail,
      valuationState: input.persisted,
      triggerType: input.triggerType,
      locale: input.locale,
      forecastMatrix: input.forecastMatrix,
    });

    if (input.signal.cancelled) return 'failed';

    if (result.status === 'awaiting_payment') {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    if (result.ok) {
      sessionStorage.setItem(deliveredKey, '1');
      return 'delivered';
    }

    // Transient/network errors: keep polling until timeout.
    await sleep(POLL_INTERVAL_MS);
  }

  return input.signal.cancelled ? 'failed' : 'timeout';
}

export function useReportHydration(locale: ValuationLocale): UseReportHydrationResult {
  const [matrix, setMatrix] = useState<ForecastMatrixWithDiagnostics | null>(null);
  const [equifyState, setEquifyState] = useState<EquifyWizardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentVerifyStatus, setPaymentVerifyStatus] =
    useState<PaymentVerifyStatus>('idle');

  useEffect(() => {
    let cancelled = false;
    const signal = { cancelled: false };

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

        let synced: ForecastMatrixWithDiagnostics | null = null;

        const rawMatrix = sessionStorage.getItem(MATRIX_STORAGE_KEY);
        if (rawMatrix) {
          const parsed = JSON.parse(rawMatrix) as ForecastMatrixWithDiagnostics;
          synced = storedState
            ? syncMatrixFromEquifyState(parsed, storedState, locale).matrix
            : parsed;
        } else if (storedState) {
          const formValues = mapEquifyToWizardFormValues(storedState);
          const result = await runValuationFlow(formValues, { locale });
          if (cancelled) return;

          synced = syncMatrixFromEquifyState(
            result.forecast_matrix_json,
            storedState,
            locale,
          ).matrix;

          sessionStorage.setItem(MATRIX_STORAGE_KEY, JSON.stringify(synced));

          if (persisted) {
            persistEquifyValuationState(persisted);
          } else {
            const computed = computeValuation(
              buildValuationInputsFromEquifyState(storedState),
            );
            persistEquifyValuationState(
              buildEquifyValuationSnapshot(storedState, computed, {
                paymentPath: 'paypal',
              }),
            );
          }
        }

        if (!cancelled) setMatrix(synced);

        const paymentPath = persisted?.paymentPath;
        const shouldDeliver =
          Boolean(persisted) &&
          (paymentPath === 'paypal' || paymentPath === 'promo_free') &&
          Boolean(synced) &&
          Boolean(persisted?.userEmail);

        if (shouldDeliver && persisted && synced) {
          if (!cancelled) setPaymentVerifyStatus('verifying');

          let outcome: 'delivered' | 'timeout' | 'failed' = 'failed';

          if (paymentPath === 'promo_free') {
            const dispatchToken = readStoredDispatchToken();
            const valuationId = dispatchToken
              ? peekDispatchValuationId(dispatchToken)
              : null;

            if (dispatchToken && valuationId) {
              const dispatched = await dispatchWithBearerToken({
                dispatchToken,
                valuationId,
                locale,
                email: persisted.userEmail,
                phone: persisted.wizard.profile.userMobilePhone,
                forecastMatrix: synced,
              });
              if (dispatched) {
                clearStoredDispatchToken();
                sessionStorage.setItem(
                  `equify.report.delivered:${persisted.savedAt}`,
                  '1',
                );
                outcome = 'delivered';
              }
            }

            if (outcome !== 'delivered') {
              outcome = await pollPaypalDeliver({
                persisted,
                locale,
                forecastMatrix: synced,
                signal,
                onVerifying: () => {
                  if (!cancelled) setPaymentVerifyStatus('verifying');
                },
                triggerType: 'PROMO_FREE',
              });
              if (outcome === 'delivered') clearStoredDispatchToken();
            }
          } else {
            outcome = await pollPaypalDeliver({
              persisted,
              locale,
              forecastMatrix: synced,
              signal,
              onVerifying: () => {
                if (!cancelled) setPaymentVerifyStatus('verifying');
              },
              triggerType: 'PAYPAL_PAID',
            });
          }

          if (!cancelled) {
            if (outcome === 'delivered') setPaymentVerifyStatus('delivered');
            else if (outcome === 'timeout') setPaymentVerifyStatus('timeout');
          }
        }
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
      signal.cancelled = true;
    };
  }, [locale]);

  return { matrix, equifyState, loading, error, paymentVerifyStatus };
}
