import { getIndustryLabel } from '../constants/industries';
import type {
  LeadProcessStage,
  LeadUpsertBody,
  LeadUpsertEvent,
  ValubotLeadRecord,
} from './leads_types';
import { appendSyncLog } from './leads_sync_log';
import {
  getValubotLeadByEmail,
  getValubotLeadById,
  getValubotLeadBySession,
  listLeadsBySyncStatus,
  markLeadSyncState,
  upsertValubotLead,
} from './valubot_leads_repository';
import { formatMondayErrorBody } from './monday_api';
import { logEphemeralPersistenceCritical } from './leads_persistence';
import { syncLeadToMonday } from './valubot_monday_sync';

const STAGE_BY_EVENT: Partial<Record<LeadUpsertEvent, LeadProcessStage>> = {
  wizard_step1: 'התחיל אשף',
  wizard_completed: 'השלים אשף',
  pdf_downloaded: 'הוריד PDF',
  whatsapp_sent: 'הוריד PDF',
  payment: 'שילם',
};

function detectSource(): ValubotLeadRecord['source'] {
  return 'organic';
}

function estimateQualityScore(body: LeadUpsertBody): number | null {
  if (body.qualityScore != null && Number.isFinite(body.qualityScore)) {
    return Math.round(body.qualityScore);
  }
  let score = 40;
  if (body.fullName?.trim()) score += 10;
  if (body.companyName?.trim()) score += 10;
  if (body.userEmail?.trim()) score += 10;
  if (body.userPhone?.trim()) score += 10;
  if (body.nationalId?.trim() || body.corporateTaxId?.trim()) score += 10;
  if (body.sectorLabel || body.industryCode) score += 5;
  if (body.valuationMidpoint != null && body.valuationMidpoint > 0) score += 5;
  return Math.min(score, 100);
}

function resolveSectorLabel(body: LeadUpsertBody): string | null {
  if (body.sectorLabel?.trim()) return body.sectorLabel.trim();
  if (body.industryCode?.trim()) {
    return getIndustryLabel(body.industryCode, body.locale === 'en' ? 'en' : 'he');
  }
  return null;
}

function buildUpsertFromEvent(
  body: LeadUpsertBody,
  existing: ValubotLeadRecord | null,
): Parameters<typeof upsertValubotLead>[0] {
  const sessionId =
    body.sessionId?.trim() ||
    existing?.sessionId ||
    `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const processStage = STAGE_BY_EVENT[body.event] ?? existing?.processStage ?? null;

  const pick = (incoming: string | undefined, prior: string | undefined): string =>
    incoming?.trim() || prior?.trim() || '';

  return {
    sessionId,
    fullName: pick(body.fullName, existing?.fullName),
    companyName: pick(body.companyName, existing?.companyName),
    userEmail: pick(body.userEmail, existing?.userEmail)?.toLowerCase(),
    userPhone: pick(body.userPhone, existing?.userPhone),
    nationalId: pick(body.nationalId, existing?.nationalId),
    corporateTaxId: pick(body.corporateTaxId, existing?.corporateTaxId),
    sectorLabel: resolveSectorLabel(body) ?? existing?.sectorLabel ?? null,
    industryCode: body.industryCode ?? existing?.industryCode ?? null,
    valuationPurpose: body.valuationPurpose ?? existing?.valuationPurpose ?? null,
    processStage,
    package: body.package ?? existing?.package ?? null,
    valuationMidpoint:
      body.valuationMidpoint !== undefined
        ? body.valuationMidpoint
        : existing?.valuationMidpoint ?? null,
    qualityScore: estimateQualityScore(body) ?? existing?.qualityScore ?? null,
    source: body.source ?? existing?.source ?? detectSource(),
    aiNotes: body.aiNotes ?? existing?.aiNotes ?? null,
    mondayItemId: existing?.mondayItemId ?? null,
    syncStatus: 'pending_sync',
    syncError: null,
  };
}

async function resolveExistingLead(body: LeadUpsertBody): Promise<ValubotLeadRecord | null> {
  if (body.leadId) {
    const byId = await getValubotLeadById(body.leadId);
    if (byId) return byId;
  }
  if (body.sessionId) {
    const bySession = await getValubotLeadBySession(body.sessionId);
    if (bySession) return bySession;
  }
  if (body.userEmail) {
    return getValubotLeadByEmail(body.userEmail);
  }
  return null;
}

export interface LeadUpsertResult {
  lead: ValubotLeadRecord;
  mondayItemId: string | null;
  mondaySynced: boolean;
  mondayError: string | null;
}

/** Fast path — DB/file store only. Monday is a downstream consumer. */
export async function upsertLeadToDatabase(body: LeadUpsertBody): Promise<ValubotLeadRecord> {
  const existing = await resolveExistingLead(body);
  const upsertInput = buildUpsertFromEvent(body, existing);
  return upsertValubotLead(upsertInput);
}

/** In-memory lead for emergency Monday sync when DB is unavailable on Vercel. */
export function buildEphemeralLeadFromBody(body: LeadUpsertBody): ValubotLeadRecord {
  const existing = null;
  const upsertInput = buildUpsertFromEvent(body, existing);
  const ts = new Date().toISOString();
  return {
    id: body.leadId ?? `ephemeral_${Date.now()}`,
    sessionId: upsertInput.sessionId,
    fullName: upsertInput.fullName?.trim() ?? '',
    companyName: upsertInput.companyName?.trim() ?? '',
    userEmail: upsertInput.userEmail?.trim().toLowerCase() ?? '',
    userPhone: upsertInput.userPhone?.trim() ?? '',
    nationalId: upsertInput.nationalId?.trim() ?? '',
    corporateTaxId: upsertInput.corporateTaxId?.trim() ?? '',
    sectorLabel: upsertInput.sectorLabel ?? null,
    industryCode: upsertInput.industryCode ?? null,
    valuationPurpose: upsertInput.valuationPurpose ?? null,
    processStage: upsertInput.processStage ?? null,
    package: upsertInput.package ?? null,
    valuationMidpoint: upsertInput.valuationMidpoint ?? null,
    qualityScore: upsertInput.qualityScore ?? null,
    source: upsertInput.source ?? null,
    aiNotes: upsertInput.aiNotes ?? null,
    mondayItemId: null,
    syncStatus: 'pending_sync',
    syncError: null,
    createdAt: ts,
    updatedAt: ts,
  };
}

export async function performMondaySyncForLead(
  lead: ValubotLeadRecord,
  event: LeadUpsertEvent,
  options?: { pdfBuffer?: Buffer | null },
): Promise<Pick<LeadUpsertResult, 'mondayItemId' | 'mondaySynced' | 'mondayError'>> {
  let mondayItemId = lead.mondayItemId;
  let mondaySynced = false;
  let mondayError: string | null = null;

  try {
    const syncResult = await syncLeadToMonday(lead, {
      event,
      pdfBuffer: options?.pdfBuffer,
    });
    mondayItemId = syncResult.itemId;
    mondaySynced = true;
    try {
      await markLeadSyncState(lead.id, {
        mondayItemId,
        syncStatus: 'synced',
        syncError: null,
      });
    } catch (markErr) {
      console.warn('[leads] markLeadSyncState after success failed (non-blocking)', markErr);
    }
    const successLog = {
      timestamp: new Date().toISOString(),
      stage: 'monday_sync',
      ok: true,
      leadId: lead.id,
      event,
      mondayItemId,
    };
    console.log(JSON.stringify(successLog));
    appendSyncLog({
      at: successLog.timestamp,
      leadId: lead.id,
      event,
      attempt: 1,
      ok: true,
      mondayItemId,
      stage: 'monday_sync',
    });
  } catch (err) {
    mondayError = err instanceof Error ? err.message : String(err);
    const responseBody =
      err && typeof err === 'object' && 'responseBody' in err
        ? (err as { responseBody: unknown }).responseBody
        : undefined;
    const errorLog = {
      timestamp: new Date().toISOString(),
      stage: 'monday_sync',
      ok: false,
      leadId: lead.id,
      event,
      error: formatMondayErrorBody(err),
      mondayErrorBody: responseBody,
    };
    console.error(JSON.stringify(errorLog));
    try {
      await markLeadSyncState(lead.id, {
        mondayItemId,
        syncStatus: 'pending_sync',
        syncError: mondayError,
      });
    } catch (markErr) {
      console.warn('[leads] markLeadSyncState after failure failed (non-blocking)', markErr);
    }
    appendSyncLog({
      at: errorLog.timestamp,
      leadId: lead.id,
      event,
      attempt: 3,
      ok: false,
      mondayItemId,
      error: mondayError,
      responseBody,
      stage: 'monday_sync',
    });
  }

  return { mondayItemId, mondaySynced, mondayError };
}

export async function upsertLeadWithMondaySync(
  body: LeadUpsertBody,
  options?: { pdfBuffer?: Buffer | null },
): Promise<LeadUpsertResult> {
  const lead = await upsertLeadToDatabase(body);
  const sync = await performMondaySyncForLead(lead, body.event, options);
  const refreshed = (await getValubotLeadById(lead.id)) ?? {
    ...lead,
    mondayItemId: sync.mondayItemId,
    syncStatus: sync.mondaySynced ? 'synced' : 'pending_sync',
    syncError: sync.mondayError,
  };

  return {
    lead: refreshed,
    ...sync,
  };
}

export async function replayPendingLeadSync(leadId: string): Promise<LeadUpsertResult> {
  const lead = await getValubotLeadById(leadId);
  if (!lead) throw new Error('lead_not_found');
  const sync = await performMondaySyncForLead(lead, 'wizard_completed');
  const refreshed = (await getValubotLeadById(lead.id)) ?? lead;
  return { lead: refreshed, ...sync };
}

export async function replayPendingLeadSyncBatch(
  limit = 50,
): Promise<{ processed: number; synced: number; failed: number }> {
  const pending = await listLeadsBySyncStatus('pending_sync', limit);
  let synced = 0;
  let failed = 0;

  for (const lead of pending) {
    const result = await performMondaySyncForLead(lead, 'wizard_completed');
    if (result.mondaySynced) synced += 1;
    else failed += 1;
  }

  return { processed: pending.length, synced, failed };
}
