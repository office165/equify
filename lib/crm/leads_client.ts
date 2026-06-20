'use client';

import {
  getOrCreateLeadSessionId,
  persistLeadSession,
  readLeadSession,
  clearLeadSession,
} from './lead_session';
import {
  flushFailedLeadQueue,
  submitLeadEventToApi,
} from './submit_lead_event';
import type { LeadUpsertBody, ValubotLeadRecord } from './leads_types';

export {
  getOrCreateLeadSessionId,
  persistLeadSession,
  readLeadSession,
  clearLeadSession,
};

export interface LeadApiResponse {
  ok: boolean;
  lead?: ValubotLeadRecord;
  mondayItemId?: string | null;
  mondaySynced?: boolean;
  mondayError?: string | null;
  error?: string;
  saved?: boolean;
}

export async function postLeadEvent(body: LeadUpsertBody): Promise<LeadApiResponse | null> {
  if (typeof window === 'undefined') return null;

  void flushFailedLeadQueue();

  const result = await submitLeadEventToApi(body, {
    timeoutMs: 15_000,
    queueOnFailure: body.event === 'pdf_downloaded',
  });

  if (!result.ok) {
    return null;
  }

  const data = result.data;
  if (data?.lead) {
    persistLeadSession({
      id: data.lead.id,
      sessionId: data.lead.sessionId,
      mondayItemId: data.mondayItemId ?? data.lead.mondayItemId,
    });
  }

  return (data as LeadApiResponse | null) ?? { ok: true };
}
