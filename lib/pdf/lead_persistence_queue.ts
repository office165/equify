/**
 * Non-blocking lead persistence — fires before PDF export, never blocks UI.
 * Retries ×3 with exponential backoff; failures logged server-side only.
 */

import type { ValuationLocale } from '../../api_client';

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

async function persistLeadAttempt(input: LeadPersistenceInput): Promise<boolean> {
  const response = await fetch('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'pdf_downloaded',
      sessionId: input.sessionId,
      fullName: input.fullName?.trim() ?? '',
      companyName: input.companyName?.trim() ?? '',
      nationalId: input.nationalId?.trim() ?? '',
      corporateTaxId: input.corporateTaxId?.trim() ?? '',
      userPhone: input.userPhone?.trim() ?? '',
      userEmail: input.userEmail?.trim() ?? '',
      valuationMidpoint: input.valuationMidpoint,
      industryCode: input.industry,
      sectorLabel: input.sectorLabel,
      locale: input.locale ?? 'he',
    }),
  });
  return response.ok;
}

async function persistWithRetry(input: LeadPersistenceInput): Promise<void> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const ok = await persistLeadAttempt(input);
      if (ok) return;
    } catch (error) {
      if (attempt === MAX_ATTEMPTS - 1) {
        console.error('[lead-persistence] failed after retries', error);
      }
    }
    if (attempt < MAX_ATTEMPTS - 1) {
      await sleep(BASE_DELAY_MS * 2 ** attempt);
    }
  }
}

/** Queue CRM persistence before export — never awaited by callers. */
export function queueLeadPersistenceBeforeExport(input: LeadPersistenceInput): void {
  void persistWithRetry(input);
}
