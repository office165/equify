/**
 * Non-blocking marketing dispatch worker — email + WhatsApp.
 * Failures never propagate to the valuation PDF response path.
 */

import type { Pool } from 'pg';
import type { ValuationLocale } from '../../api_client';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import { ValuationDispatchService } from './valuation_dispatch';

export interface ValuationMarketingDispatchJob {
  valuationId: string;
  companyName: string;
  locale: ValuationLocale;
  forecastMatrix: ForecastMatrixWithDiagnostics;
  email?: string | null;
  phoneE164?: string | null;
  pdfDownloadUrl: string;
  pdfBuffer?: Buffer | null;
  recipientName?: string | null;
}

/**
 * Fire-and-forget background marketing dispatch.
 * Safe to call without awaiting — errors are logged, never thrown.
 */
export function scheduleValuationMarketingDispatch(
  job: ValuationMarketingDispatchJob,
): void {
  void runValuationMarketingDispatch(job).catch((err) => {
    console.error(
      '[valuation_marketing_worker] unhandled dispatch error:',
      err instanceof Error ? err.message : err,
    );
  });
}

export async function runValuationMarketingDispatch(
  job: ValuationMarketingDispatchJob,
): Promise<void> {
  const pool: Pool | null = null;

  try {
    const dispatcher = new ValuationDispatchService(pool);
    await dispatcher.dispatchAfterPaymentResolution({
      valuationId: job.valuationId,
      companyName: job.companyName,
      locale: job.locale,
      forecastMatrix: job.forecastMatrix,
      email: job.email,
      phoneE164: job.phoneE164,
      // Only paypal-webhook (verified capture) may set paymentVerified: true.
      paymentVerified: false,
      pdfDownloadUrl: job.pdfDownloadUrl,
      pdfBuffer: job.pdfBuffer,
      recipientName: job.recipientName,
    });
  } catch (err) {
    console.error(
      '[valuation_marketing_worker] dispatch failed:',
      err instanceof Error ? err.message : err,
    );
  }
}
