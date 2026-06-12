/**
 * Single-shot Monday leads relay — POST /api/valuation/backup-relay once per session.
 * No step-transition autosave. Primary path: PDF report confirmation on dashboard.
 */

import { normalizePhoneE164 } from '../phone/normalize_e164';

const RELAY_LEAD_SESSION_KEY = 'valubot.backup-relay.lead.dispatched';
const RELAY_PDF_SESSION_KEY = 'valubot.backup-relay.pdf.dispatched';

/** Exact unified wire contract for the Monday leads board relay */
export interface UnifiedBackupRelayWireBody {
  fullName: string;
  companyName: string;
  nationalId: string;
  corporateTaxId: string;
  userPhone: string;
  userEmail: string;
  valuationMidpoint: number;
  industry?: string;
  sectorLabel?: string;
  locale?: 'he' | 'en';
  pdfBase64: string;
}

export interface UnifiedBackupRelayInput {
  fullName: string;
  companyName: string;
  nationalId: string;
  corporateTaxId?: string;
  userPhone: string;
  userEmail: string;
  valuationMidpoint: number;
  industry?: string;
  sectorLabel?: string;
  locale?: 'he' | 'en';
  pdfBase64?: string;
}

export interface UnifiedBackupRelayResult {
  response: Response;
  mondayOk: boolean;
  mondayItemId?: string;
  mondayError?: string;
}

/** @deprecated Use `UnifiedBackupRelayInput` */
export type BackupRelayClientPayload = UnifiedBackupRelayInput;

export function packUnifiedBackupRelayBody(
  input: UnifiedBackupRelayInput,
): UnifiedBackupRelayWireBody {
  return {
    fullName: input.fullName?.trim() ?? '',
    companyName: input.companyName?.trim() ?? '',
    nationalId: input.nationalId?.trim() ?? '',
    corporateTaxId: input.corporateTaxId?.trim() ?? '',
    userPhone: normalizePhoneE164(input.userPhone?.trim() ?? ''),
    userEmail: input.userEmail?.trim().toLowerCase() ?? '',
    valuationMidpoint: Number.isFinite(input.valuationMidpoint)
      ? input.valuationMidpoint
      : 0,
    industry: input.industry?.trim() ?? '',
    sectorLabel: input.sectorLabel?.trim() ?? '',
    locale: input.locale === 'en' ? 'en' : 'he',
    pdfBase64: input.pdfBase64?.trim() ?? '',
  };
}

function markRelayDispatched(kind: 'lead' | 'pdf'): void {
  if (typeof window === 'undefined') return;
  const key = kind === 'pdf' ? RELAY_PDF_SESSION_KEY : RELAY_LEAD_SESSION_KEY;
  try {
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    // ignore quota / privacy mode
  }
}

function hasRelayDispatched(kind: 'lead' | 'pdf'): boolean {
  if (typeof window === 'undefined') return false;
  const key = kind === 'pdf' ? RELAY_PDF_SESSION_KEY : RELAY_LEAD_SESSION_KEY;
  try {
    return Boolean(sessionStorage.getItem(key));
  } catch {
    return false;
  }
}

export function clearBackupRelaySession(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(RELAY_LEAD_SESSION_KEY);
    sessionStorage.removeItem(RELAY_PDF_SESSION_KEY);
  } catch {
    // ignore
  }
}

export interface DashboardLeadRelayInput {
  fullName: string;
  companyName: string;
  nationalId: string;
  corporateTaxId?: string;
  userPhone: string;
  userEmail: string;
  valuationMidpoint: number;
  locale?: 'he' | 'en';
  pdfBase64?: string;
}

/**
 * Fire the single-shot backup relay from dashboard context.
 * Always passes pdfBase64 (empty string when PDF capture failed).
 */
export function dispatchDashboardLeadRelay(input: DashboardLeadRelayInput): void {
  dispatchUnifiedBackupRelay({
    fullName: input.fullName,
    companyName: input.companyName,
    nationalId: input.nationalId,
    corporateTaxId: input.corporateTaxId,
    userPhone: input.userPhone,
    userEmail: input.userEmail,
    valuationMidpoint: input.valuationMidpoint,
    locale: input.locale,
    pdfBase64: input.pdfBase64?.trim() ?? '',
  });
}

/**
 * Single consolidated POST to /api/valuation/backup-relay (awaitable).
 * Marks session dispatched before fetch so duplicate clicks are ignored.
 */
export async function postUnifiedBackupRelay(
  input: UnifiedBackupRelayInput,
): Promise<UnifiedBackupRelayResult | null> {
  if (typeof window === 'undefined') return null;

  const wireBody = packUnifiedBackupRelayBody(input);
  const relayKind: 'lead' | 'pdf' = wireBody.pdfBase64.length > 0 ? 'pdf' : 'lead';

  if (hasRelayDispatched(relayKind)) {
    console.warn(`DEBUG: backup-relay skipped — ${relayKind} already dispatched this session`);
    return null;
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[backup-relay] dispatch', {
      hasIdentity: Boolean(wireBody.fullName && wireBody.userEmail),
      valuationMidpoint: wireBody.valuationMidpoint,
      pdfAttached: wireBody.pdfBase64.length > 0,
    });
  }

  try {
    const response = await fetch('/api/valuation/backup-relay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wireBody),
    });

    let mondayOk = false;
    let mondayItemId: string | undefined;
    let mondayError: string | undefined;

    try {
      const payload = (await response.json()) as {
        results?: {
          monday?: {
            ok?: boolean;
            detail?: { item?: { itemId?: string; error?: string } };
            error?: string;
          };
        };
      };
      mondayOk = Boolean(payload.results?.monday?.ok);
      mondayItemId = payload.results?.monday?.detail?.item?.itemId;
      mondayError =
        payload.results?.monday?.error ??
        payload.results?.monday?.detail?.item?.error;
    } catch {
      mondayOk = false;
      mondayError = 'invalid_relay_response';
    }

    if (response.ok) {
      markRelayDispatched(relayKind);
    }

    return { response, mondayOk, mondayItemId, mondayError };
  } catch (err) {
    console.error('[backup-relay] unified dispatch failed', err);
    return null;
  }
}

/**
 * Fire-and-forget wrapper — prefer `postUnifiedBackupRelay` for download flows.
 */
export function dispatchUnifiedBackupRelay(input: UnifiedBackupRelayInput): void {
  void postUnifiedBackupRelay(input);
}

/** @deprecated Use `dispatchUnifiedBackupRelay` */
export function queueValuationBackupRelay(payload: UnifiedBackupRelayInput): void {
  dispatchUnifiedBackupRelay(payload);
}

/** @deprecated Removed — no step-transition autosave */
export function queueWizardLeadCaptureRelay(): void {
  console.warn('queueWizardLeadCaptureRelay is deprecated and performs no network I/O');
}

const RELAY_MAX_ATTEMPTS = 3;
const RELAY_BASE_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Backup-relay with retry — never throws to callers. */
export async function postUnifiedBackupRelayWithRetry(
  input: UnifiedBackupRelayInput,
): Promise<UnifiedBackupRelayResult | null> {
  for (let attempt = 0; attempt < RELAY_MAX_ATTEMPTS; attempt += 1) {
    const result = await postUnifiedBackupRelay(input);
    if (result?.response.ok) return result;
    if (attempt < RELAY_MAX_ATTEMPTS - 1) {
      await sleep(RELAY_BASE_DELAY_MS * 2 ** attempt);
    }
  }
  return null;
}
