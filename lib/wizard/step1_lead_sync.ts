'use client';

import type { ValuationLocale } from '../../api_client';

export interface WizardStep1LeadPayload {
  fullName: string;
  companyName: string;
  userEmail: string;
  userPhone: string;
  nationalId: string;
  corporateTaxId: string;
  industryCode: string;
  locale: ValuationLocale;
}

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildStep1LeadBody(payload: WizardStep1LeadPayload, sectorLabel?: string) {
  return {
    event: 'wizard_step1' as const,
    fullName: payload.fullName.trim(),
    companyName: payload.companyName.trim(),
    userEmail: payload.userEmail.trim(),
    userPhone: payload.userPhone.trim(),
    nationalId: payload.nationalId.trim(),
    corporateTaxId: payload.corporateTaxId.trim(),
    industryCode: payload.industryCode,
    sectorLabel,
    locale: payload.locale,
  };
}

/** Legacy awaitable CRM relay — prefer `scheduleWizardProgressSave` (non-blocking). */
export async function awaitWizardStep1LeadSync(
  payload: WizardStep1LeadPayload,
): Promise<boolean> {
  const [{ postLeadEvent }, { getIndustryLabel }] = await Promise.all([
    import('../crm/leads_client'),
    import('../constants/industries'),
  ]);

  const sectorLabel = payload.industryCode
    ? getIndustryLabel(payload.industryCode, payload.locale)
    : undefined;

  const body = buildStep1LeadBody(payload, sectorLabel);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await postLeadEvent(body);
      if (result) return true;
    } catch (err) {
      if (attempt === MAX_ATTEMPTS - 1) {
        console.error('[wizard-lead-sync] failed after retries', err);
      }
    }
    if (attempt < MAX_ATTEMPTS - 1) {
      await sleep(BASE_DELAY_MS * 2 ** attempt);
    }
  }

  return false;
}

/** Non-blocking wrapper — prefer `awaitWizardStep1LeadSync` when step transition must wait. */
export function queueWizardStep1LeadSync(
  payload: WizardStep1LeadPayload,
  hooks: {
    onStart?: () => void;
    onSettled?: (ok: boolean) => void;
  } = {},
): void {
  hooks.onStart?.();
  void (async () => {
    const ok = await awaitWizardStep1LeadSync(payload);
    hooks.onSettled?.(ok);
  })();
}
