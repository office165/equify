/**
 * Non-blocking lead persistence — fires after successful PDF export.
 * Retries ×3 with exponential backoff; failures logged + queued in localStorage.
 */

import type { ValuationLocale } from '../../api_client';
import { getOrCreateLeadSessionId } from '../crm/lead_session';
import { flushFailedLeadQueue } from '../crm/submit_lead_event';
import type { LeadUpsertBody } from '../crm/leads_types';
import { submitLeadEventToApi } from '../crm/submit_lead_event';

export interface LeadPersistenceInput {
  fullName: string;
  companyName: string;
  nationalId?: string;
  corporateTaxId?: string;
  userPhone: string;
  userEmail: string;
  valuationMidpoint: number;
  industry?: string;
  sectorLabel?: string;
  locale?: ValuationLocale;
  sessionId?: string;
}

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toLeadBody(input: LeadPersistenceInput): LeadUpsertBody {
  return {
    event: 'pdf_downloaded',
    sessionId: input.sessionId ?? getOrCreateLeadSessionId(),
    fullName: input.fullName,
    companyName: input.companyName,
    nationalId: input.nationalId,
    corporateTaxId: input.corporateTaxId,
    userPhone: input.userPhone,
    userEmail: input.userEmail,
    valuationMidpoint: input.valuationMidpoint,
    industryCode: input.industry,
    sectorLabel: input.sectorLabel,
    locale: input.locale ?? 'he',
  };
}

async function persistWithRetry(input: LeadPersistenceInput): Promise<void> {
  const body = toLeadBody(input);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const result = await submitLeadEventToApi(body, {
      timeoutMs: 15_000,
      queueOnFailure: attempt === MAX_ATTEMPTS - 1,
    });

    if (result.ok) {
      console.log('[lead-persistence] CRM capture succeeded after PDF export', {
        event: body.event,
        fullName: body.fullName,
        userEmail: body.userEmail,
        sector: body.sectorLabel ?? body.industryCode,
        valuationMidpoint: body.valuationMidpoint,
        attempt: attempt + 1,
      });
      return;
    }

    if (attempt < MAX_ATTEMPTS - 1) {
      await sleep(BASE_DELAY_MS * 2 ** attempt);
    }
  }

  console.error('[lead-persistence] CRM capture failed after retries — queued locally', {
    fullName: body.fullName,
    userEmail: body.userEmail,
    sector: body.sectorLabel ?? body.industryCode,
    valuationMidpoint: body.valuationMidpoint,
  });
}

/**
 * Queue CRM persistence after export — never awaited by PDF callers; never throws.
 */
export function queueLeadPersistenceBeforeExport(input: LeadPersistenceInput): void {
  void flushFailedLeadQueue().finally(() => persistWithRetry(input));
}

/** Awaitable variant for explicit post-export capture (still swallows errors). */
export async function captureLeadAfterReportExport(
  input: LeadPersistenceInput,
): Promise<void> {
  try {
    await flushFailedLeadQueue();
    await persistWithRetry(input);
  } catch (err) {
    console.error('[lead-persistence] unexpected error (PDF flow unaffected)', err);
  }
}
