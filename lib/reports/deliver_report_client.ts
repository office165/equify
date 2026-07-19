'use client';

import type { ValuationLocale } from '../../api_client';
import type { EquifyValuationPersistedState } from '../wizard/equify_valuation_persistence';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import type { ReportDeliverTrigger } from './deliver_equify_report';

export interface DeliverReportRequest {
  mondayItemId?: string | null;
  email: string;
  valuationState: EquifyValuationPersistedState;
  triggerType: ReportDeliverTrigger;
  locale?: ValuationLocale;
  forecastMatrix?: ForecastMatrixWithDiagnostics | null;
}

export interface DeliverReportResponse {
  ok: boolean;
  reportId?: string;
  pdfBytes?: number;
  monday?: {
    ok: boolean;
    itemId: string | null;
    columnsUpdated: boolean;
    fileUploaded: boolean;
    error?: string;
  };
  email?: {
    ok: boolean;
    delivered: boolean;
    messageId: string | null;
    error?: string;
  };
  error?: string;
}

export async function postDeliverEquifyReport(
  body: DeliverReportRequest,
): Promise<DeliverReportResponse> {
  if (typeof window === 'undefined') {
    return { ok: false, error: 'ssr' };
  }

  try {
    const response = await fetch('/api/reports/deliver', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = (await response.json().catch(() => null)) as DeliverReportResponse | null;
    if (!response.ok) {
      return {
        ok: false,
        error: data?.error ?? `http_${response.status}`,
        ...data,
      };
    }
    return data ?? { ok: true };
  } catch {
    return { ok: false, error: 'network' };
  }
}
