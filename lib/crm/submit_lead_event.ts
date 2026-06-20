'use client';

import {
  enqueueFailedLeadPayload,
  readFailedLeadQueue,
  removeFailedLeadPayload,
} from './lead_retry_queue';
import {
  getOrCreateLeadSessionId,
  readLeadSession,
} from './lead_session';
import type { LeadUpsertBody } from './leads_types';

const LEAD_API_PATH = '/api/leads';
const DEFAULT_TIMEOUT_MS = 15_000;

interface LeadApiResponseShape {
  ok?: boolean;
  error?: string;
  lead?: { id: string; sessionId: string; mondayItemId?: string | null };
  mondayItemId?: string | null;
}

export interface SubmitLeadEventOptions {
  timeoutMs?: number;
  /** Store payload in localStorage when the API call fails (network/timeout/5xx). */
  queueOnFailure?: boolean;
}

export interface SubmitLeadEventResult {
  ok: boolean;
  status?: number;
  data?: LeadApiResponseShape | null;
  error?: string;
  queuedForRetry?: boolean;
}

/** Normalize CRM JSON body — trims strings, coerces valuation, attaches session. */
export function normalizeLeadUpsertBody(body: LeadUpsertBody): LeadUpsertBody {
  const session = readLeadSession();
  const valuationMidpoint = Number(body.valuationMidpoint);
  return {
    ...body,
    sessionId: body.sessionId ?? session.sessionId ?? getOrCreateLeadSessionId(),
    leadId: body.leadId ?? session.leadId ?? undefined,
    fullName: body.fullName?.trim() ?? '',
    companyName: body.companyName?.trim() ?? '',
    userEmail: body.userEmail?.trim().toLowerCase() ?? '',
    userPhone: body.userPhone?.trim() ?? '',
    nationalId: body.nationalId?.trim() ?? '',
    corporateTaxId: body.corporateTaxId?.trim() ?? '',
    sectorLabel: body.sectorLabel?.trim() || undefined,
    industryCode: body.industryCode?.trim() || undefined,
    valuationMidpoint: Number.isFinite(valuationMidpoint) ? valuationMidpoint : 0,
    locale: body.locale === 'en' ? 'en' : 'he',
  };
}

/** Warn when critical CRM metadata is missing (submission still attempted). */
export function warnMissingLeadCriticalFields(body: LeadUpsertBody): void {
  const missing: string[] = [];
  if (!body.fullName) missing.push('fullName');
  if (!body.userEmail) missing.push('userEmail');
  if (!body.sectorLabel && !body.industryCode) missing.push('sector');
  if (!body.valuationMidpoint || body.valuationMidpoint <= 0) {
    missing.push('valuationMidpoint');
  }
  if (missing.length === 0) return;

  console.warn('[lead-submit] payload missing recommended CRM fields', {
    missing,
    event: body.event,
    fullName: body.fullName,
    userEmail: body.userEmail,
    sector: body.sectorLabel ?? body.industryCode,
    valuationMidpoint: body.valuationMidpoint,
  });
}

function logSubmitPayload(payload: LeadUpsertBody): void {
  console.log('[lead-submit] POST /api/leads', {
    event: payload.event,
    fullName: payload.fullName,
    userEmail: payload.userEmail,
    sector: payload.sectorLabel ?? payload.industryCode,
    valuationMidpoint: payload.valuationMidpoint,
    sessionId: payload.sessionId,
    leadId: payload.leadId,
  });
}

function logSubmitFailure(
  payload: LeadUpsertBody,
  detail: Record<string, unknown>,
): void {
  console.error('[lead-submit] CRM submission failed', {
    ...detail,
    payload: {
      event: payload.event,
      fullName: payload.fullName,
      userEmail: payload.userEmail,
      sector: payload.sectorLabel ?? payload.industryCode,
      valuationMidpoint: payload.valuationMidpoint,
      sessionId: payload.sessionId,
    },
  });
}

/**
 * Outbound CRM POST — JSON body, timeout, structured logging, never throws.
 */
export async function submitLeadEventToApi(
  body: LeadUpsertBody,
  options: SubmitLeadEventOptions = {},
): Promise<SubmitLeadEventResult> {
  if (typeof window === 'undefined') {
    return { ok: false, error: 'not_browser' };
  }

  const payload = normalizeLeadUpsertBody(body);
  warnMissingLeadCriticalFields(payload);
  logSubmitPayload(payload);

  let jsonBody: string;
  try {
    jsonBody = JSON.stringify(payload);
  } catch (serializeErr) {
    logSubmitFailure(payload, {
      stage: 'json_serialize',
      error: serializeErr instanceof Error ? serializeErr.message : String(serializeErr),
    });
    return { ok: false, error: 'json_serialize_failed' };
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(LEAD_API_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonBody,
      keepalive: true,
      signal: controller.signal,
    });

    const responseText = await response.text();
    let parsed: LeadApiResponseShape | null = null;
    try {
      parsed = responseText ? (JSON.parse(responseText) as LeadApiResponseShape) : null;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      logSubmitFailure(payload, {
        stage: 'http_error',
        status: response.status,
        statusText: response.statusText,
        bodyPreview: responseText.slice(0, 500),
        apiError: parsed?.error,
      });
      if (options.queueOnFailure) {
        enqueueFailedLeadPayload(payload);
      }
      return {
        ok: false,
        status: response.status,
        error:
          parsed?.error ||
          responseText ||
          'http_error',
        queuedForRetry: Boolean(options.queueOnFailure),
      };
    }

    return { ok: true, status: response.status, data: parsed };
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    logSubmitFailure(payload, {
      stage: isTimeout ? 'timeout' : 'network',
      timeoutMs,
      error: err instanceof Error ? err.message : String(err),
    });
    if (options.queueOnFailure) {
      enqueueFailedLeadPayload(payload);
    }
    return {
      ok: false,
      error: isTimeout ? 'timeout' : 'network_error',
      queuedForRetry: Boolean(options.queueOnFailure),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Retry any payloads stored after prior CRM failures. Never throws. */
export async function flushFailedLeadQueue(
  options: SubmitLeadEventOptions = {},
): Promise<void> {
  const pending = readFailedLeadQueue();
  if (pending.length === 0) return;

  for (const body of pending) {
    const result = await submitLeadEventToApi(body, {
      ...options,
      queueOnFailure: false,
    });
    if (result.ok) {
      removeFailedLeadPayload(body);
    }
  }
}
