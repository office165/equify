/**
 * Valubot leads — PostgreSQL primary, JSON file fallback when DB unavailable.
 */

import { randomUUID } from 'crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { Pool } from 'pg';
import { getLiveDatabasePool } from '../../valuation_live';
import { isVercelRuntime, logEphemeralPersistenceCritical } from './leads_persistence';
import type {
  LeadProcessStage,
  LeadPackage,
  LeadSource,
  LeadSyncStatus,
  ValubotLeadRecord,
} from './leads_types';

export interface ValubotLeadUpsertInput {
  sessionId: string;
  fullName?: string;
  companyName?: string;
  userEmail?: string;
  userPhone?: string;
  nationalId?: string;
  corporateTaxId?: string;
  sectorLabel?: string | null;
  industryCode?: string | null;
  valuationPurpose?: ValubotLeadRecord['valuationPurpose'];
  processStage?: LeadProcessStage | null;
  package?: LeadPackage | null;
  valuationMidpoint?: number | null;
  qualityScore?: number | null;
  source?: LeadSource | null;
  aiNotes?: string | null;
  mondayItemId?: string | null;
  syncStatus?: LeadSyncStatus;
  syncError?: string | null;
}

const ENSURE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS valubot_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  company_name TEXT NOT NULL DEFAULT '',
  user_email CITEXT NOT NULL,
  user_phone TEXT NOT NULL DEFAULT '',
  national_id TEXT NOT NULL DEFAULT '',
  corporate_tax_id TEXT NOT NULL DEFAULT '',
  sector_label TEXT,
  industry_code TEXT,
  process_stage TEXT,
  package TEXT,
  valuation_midpoint NUMERIC,
  quality_score NUMERIC,
  source TEXT,
  ai_notes TEXT,
  monday_item_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending_sync',
  sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS valubot_leads_email_idx ON valubot_leads (user_email);
CREATE INDEX IF NOT EXISTS valubot_leads_session_idx ON valubot_leads (session_id);
CREATE UNIQUE INDEX IF NOT EXISTS valubot_leads_session_unique ON valubot_leads (session_id);

ALTER TABLE valubot_leads ADD COLUMN IF NOT EXISTS valuation_purpose TEXT;
`;

const FILE_STORE = join(process.cwd(), '.data', 'valubot_leads.json');

let tableReady = false;
let fileStoreCache: ValubotLeadRecord[] | null = null;

function nowIso(): string {
  return new Date().toISOString();
}

function rowToRecord(row: Record<string, unknown>): ValubotLeadRecord {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    fullName: String(row.full_name ?? ''),
    companyName: String(row.company_name ?? ''),
    userEmail: String(row.user_email ?? '').toLowerCase(),
    userPhone: String(row.user_phone ?? ''),
    nationalId: String(row.national_id ?? ''),
    corporateTaxId: String(row.corporate_tax_id ?? ''),
    sectorLabel: row.sector_label ? String(row.sector_label) : null,
    industryCode: row.industry_code ? String(row.industry_code) : null,
    valuationPurpose:
      (row.valuation_purpose as ValubotLeadRecord['valuationPurpose']) ?? null,
    processStage: (row.process_stage as LeadProcessStage | null) ?? null,
    package: (row.package as LeadPackage | null) ?? null,
    valuationMidpoint:
      row.valuation_midpoint != null ? Number(row.valuation_midpoint) : null,
    qualityScore: row.quality_score != null ? Number(row.quality_score) : null,
    source: (row.source as LeadSource | null) ?? null,
    aiNotes: row.ai_notes ? String(row.ai_notes) : null,
    mondayItemId: row.monday_item_id ? String(row.monday_item_id) : null,
    syncStatus: (row.sync_status as LeadSyncStatus) ?? 'pending_sync',
    syncError: row.sync_error ? String(row.sync_error) : null,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at ?? nowIso()),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at ?? nowIso()),
  };
}

async function ensureTable(pool: Pool): Promise<void> {
  if (tableReady) return;
  await pool.query(ENSURE_TABLE_SQL);
  tableReady = true;
}

function readFileStore(): ValubotLeadRecord[] {
  if (fileStoreCache) return fileStoreCache;
  try {
    if (existsSync(FILE_STORE)) {
      fileStoreCache = JSON.parse(readFileSync(FILE_STORE, 'utf8')) as ValubotLeadRecord[];
      return fileStoreCache;
    }
  } catch {
    // fall through
  }
  fileStoreCache = [];
  return fileStoreCache;
}

function writeFileStore(leads: ValubotLeadRecord[]): void {
  mkdirSync(join(process.cwd(), '.data'), { recursive: true });
  writeFileSync(FILE_STORE, JSON.stringify(leads, null, 2), 'utf8');
  fileStoreCache = leads;
}

function mergeLead(
  existing: ValubotLeadRecord | null,
  input: ValubotLeadUpsertInput,
): ValubotLeadRecord {
  const ts = nowIso();
  if (!existing) {
    return {
      id: randomUUID(),
      sessionId: input.sessionId,
      fullName: input.fullName?.trim() ?? '',
      companyName: input.companyName?.trim() ?? '',
      userEmail: input.userEmail?.trim().toLowerCase() ?? '',
      userPhone: input.userPhone?.trim() ?? '',
      nationalId: input.nationalId?.trim() ?? '',
      corporateTaxId: input.corporateTaxId?.trim() ?? '',
      sectorLabel: input.sectorLabel ?? null,
      industryCode: input.industryCode ?? null,
      valuationPurpose: input.valuationPurpose ?? null,
      processStage: input.processStage ?? null,
      package: input.package ?? null,
      valuationMidpoint: input.valuationMidpoint ?? null,
      qualityScore: input.qualityScore ?? null,
      source: input.source ?? null,
      aiNotes: input.aiNotes ?? null,
      mondayItemId: input.mondayItemId ?? null,
      syncStatus: input.syncStatus ?? 'pending_sync',
      syncError: input.syncError ?? null,
      createdAt: ts,
      updatedAt: ts,
    };
  }

  return {
    ...existing,
    fullName: input.fullName?.trim() || existing.fullName,
    companyName: input.companyName?.trim() || existing.companyName,
    userEmail: input.userEmail?.trim().toLowerCase() || existing.userEmail,
    userPhone: input.userPhone?.trim() || existing.userPhone,
    nationalId: input.nationalId?.trim() || existing.nationalId,
    corporateTaxId: input.corporateTaxId?.trim() || existing.corporateTaxId,
    sectorLabel:
      input.sectorLabel !== undefined ? input.sectorLabel : existing.sectorLabel,
    industryCode:
      input.industryCode !== undefined ? input.industryCode : existing.industryCode,
    valuationPurpose:
      input.valuationPurpose !== undefined
        ? input.valuationPurpose
        : existing.valuationPurpose,
    processStage:
      input.processStage !== undefined ? input.processStage : existing.processStage,
    package: input.package !== undefined ? input.package : existing.package,
    valuationMidpoint:
      input.valuationMidpoint !== undefined
        ? input.valuationMidpoint
        : existing.valuationMidpoint,
    qualityScore:
      input.qualityScore !== undefined ? input.qualityScore : existing.qualityScore,
    source: input.source !== undefined ? input.source : existing.source,
    aiNotes: input.aiNotes !== undefined ? input.aiNotes : existing.aiNotes,
    mondayItemId:
      input.mondayItemId !== undefined ? input.mondayItemId : existing.mondayItemId,
    syncStatus: input.syncStatus ?? existing.syncStatus,
    syncError: input.syncError !== undefined ? input.syncError : existing.syncError,
    updatedAt: ts,
  };
}

async function upsertFileLead(input: ValubotLeadUpsertInput): Promise<ValubotLeadRecord> {
  const leads = readFileStore();
  const idx = leads.findIndex((l) => l.sessionId === input.sessionId);
  const merged = mergeLead(idx >= 0 ? leads[idx] : null, input);
  if (idx >= 0) leads[idx] = merged;
  else leads.push(merged);
  writeFileStore(leads);
  return merged;
}

async function getFileLeadBySession(sessionId: string): Promise<ValubotLeadRecord | null> {
  return readFileStore().find((l) => l.sessionId === sessionId) ?? null;
}

async function getFileLeadById(id: string): Promise<ValubotLeadRecord | null> {
  return readFileStore().find((l) => l.id === id) ?? null;
}

async function getFileLeadByEmail(email: string): Promise<ValubotLeadRecord | null> {
  const normalized = email.trim().toLowerCase();
  const matches = readFileStore().filter((l) => l.userEmail === normalized);
  return matches.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
}

async function upsertDbLead(
  input: ValubotLeadUpsertInput,
  pool: Pool,
): Promise<ValubotLeadRecord> {
  await ensureTable(pool);
  const existing = await getDbLeadBySession(input.sessionId, pool);
  const merged = mergeLead(existing, input);

  const { rows } = await pool.query<Record<string, unknown>>(
    `INSERT INTO valubot_leads (
       id, session_id, full_name, company_name, user_email, user_phone,
       national_id, corporate_tax_id, sector_label, industry_code, valuation_purpose,
       process_stage, package, valuation_midpoint, quality_score,
       source, ai_notes, monday_item_id, sync_status, sync_error,
       created_at, updated_at
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
     )
     ON CONFLICT (session_id) DO UPDATE SET
       full_name = EXCLUDED.full_name,
       company_name = EXCLUDED.company_name,
       user_email = EXCLUDED.user_email,
       user_phone = EXCLUDED.user_phone,
       national_id = EXCLUDED.national_id,
       corporate_tax_id = EXCLUDED.corporate_tax_id,
       sector_label = COALESCE(EXCLUDED.sector_label, valubot_leads.sector_label),
       industry_code = COALESCE(EXCLUDED.industry_code, valubot_leads.industry_code),
       valuation_purpose = COALESCE(EXCLUDED.valuation_purpose, valubot_leads.valuation_purpose),
       process_stage = COALESCE(EXCLUDED.process_stage, valubot_leads.process_stage),
       package = COALESCE(EXCLUDED.package, valubot_leads.package),
       valuation_midpoint = COALESCE(EXCLUDED.valuation_midpoint, valubot_leads.valuation_midpoint),
       quality_score = COALESCE(EXCLUDED.quality_score, valubot_leads.quality_score),
       source = COALESCE(EXCLUDED.source, valubot_leads.source),
       ai_notes = COALESCE(EXCLUDED.ai_notes, valubot_leads.ai_notes),
       monday_item_id = COALESCE(EXCLUDED.monday_item_id, valubot_leads.monday_item_id),
       sync_status = EXCLUDED.sync_status,
       sync_error = EXCLUDED.sync_error,
       updated_at = EXCLUDED.updated_at
     RETURNING *`,
    [
      merged.id,
      merged.sessionId,
      merged.fullName,
      merged.companyName,
      merged.userEmail,
      merged.userPhone,
      merged.nationalId,
      merged.corporateTaxId,
      merged.sectorLabel,
      merged.industryCode,
      merged.valuationPurpose,
      merged.processStage,
      merged.package,
      merged.valuationMidpoint,
      merged.qualityScore,
      merged.source,
      merged.aiNotes,
      merged.mondayItemId,
      merged.syncStatus,
      merged.syncError,
      merged.createdAt,
      merged.updatedAt,
    ],
  );

  return rowToRecord(rows[0]);
}

async function getDbLeadBySession(
  sessionId: string,
  pool: Pool,
): Promise<ValubotLeadRecord | null> {
  await ensureTable(pool);
  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT * FROM valubot_leads WHERE session_id = $1 LIMIT 1`,
    [sessionId],
  );
  return rows[0] ? rowToRecord(rows[0]) : null;
}

function dbAvailable(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function upsertValubotLead(
  input: ValubotLeadUpsertInput,
): Promise<ValubotLeadRecord> {
  if (dbAvailable()) {
    try {
      return await upsertDbLead(input, getLiveDatabasePool());
    } catch (err) {
      if (isVercelRuntime()) {
        logEphemeralPersistenceCritical('upsertValubotLead_db_failed', err);
        throw err instanceof Error ? err : new Error(String(err));
      }
      console.error('[leads] DB upsert failed, falling back to file store', err);
    }
  }

  if (isVercelRuntime()) {
    logEphemeralPersistenceCritical('upsertValubotLead_no_db_on_vercel', {
      sessionId: input.sessionId,
    });
    throw new Error('lead_persistence_unavailable: DATABASE_URL required on Vercel');
  }

  return upsertFileLead(input);
}

export async function probeLeadDatabaseReachable(): Promise<{
  reachable: boolean;
  error?: string;
}> {
  if (!dbAvailable()) {
    return { reachable: false, error: 'DATABASE_URL not configured' };
  }
  try {
    const pool = getLiveDatabasePool();
    await pool.query('SELECT 1');
    return { reachable: true };
  } catch (err) {
    return {
      reachable: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function getValubotLeadBySession(
  sessionId: string,
): Promise<ValubotLeadRecord | null> {
  if (dbAvailable()) {
    try {
      return await getDbLeadBySession(sessionId, getLiveDatabasePool());
    } catch {
      // fall through
    }
  }
  return getFileLeadBySession(sessionId);
}

export async function getValubotLeadById(id: string): Promise<ValubotLeadRecord | null> {
  if (dbAvailable()) {
    try {
      await ensureTable(getLiveDatabasePool());
      const { rows } = await getLiveDatabasePool().query<Record<string, unknown>>(
        `SELECT * FROM valubot_leads WHERE id = $1 LIMIT 1`,
        [id],
      );
      return rows[0] ? rowToRecord(rows[0]) : null;
    } catch {
      // fall through
    }
  }
  return getFileLeadById(id);
}

export async function getValubotLeadByEmail(
  email: string,
): Promise<ValubotLeadRecord | null> {
  if (dbAvailable()) {
    try {
      await ensureTable(getLiveDatabasePool());
      const { rows } = await getLiveDatabasePool().query<Record<string, unknown>>(
        `SELECT * FROM valubot_leads WHERE user_email = $1 ORDER BY updated_at DESC LIMIT 1`,
        [email.trim().toLowerCase()],
      );
      return rows[0] ? rowToRecord(rows[0]) : null;
    } catch {
      // fall through
    }
  }
  return getFileLeadByEmail(email);
}

export async function markLeadSyncState(
  leadId: string,
  update: {
    mondayItemId?: string | null;
    syncStatus: LeadSyncStatus;
    syncError?: string | null;
  },
): Promise<ValubotLeadRecord | null> {
  const lead = await getValubotLeadById(leadId);
  if (!lead) return null;
  return upsertValubotLead({
    sessionId: lead.sessionId,
    mondayItemId: update.mondayItemId,
    syncStatus: update.syncStatus,
    syncError: update.syncError ?? null,
  });
}

export async function getLastSuccessfulLeadSyncAt(): Promise<string | null> {
  if (!dbAvailable()) return null;
  try {
    await ensureTable(getLiveDatabasePool());
    const { rows } = await getLiveDatabasePool().query<{ last_sync: Date | string | null }>(
      `SELECT MAX(updated_at) AS last_sync FROM valubot_leads WHERE sync_status = 'synced'`,
    );
    const raw = rows[0]?.last_sync;
    if (!raw) return null;
    return raw instanceof Date ? raw.toISOString() : String(raw);
  } catch {
    return null;
  }
}

export async function listLeadsBySyncStatus(
  status: LeadSyncStatus,
  limit = 50,
): Promise<ValubotLeadRecord[]> {
  const capped = Math.max(1, Math.min(limit, 200));

  if (dbAvailable()) {
    try {
      await ensureTable(getLiveDatabasePool());
      const { rows } = await getLiveDatabasePool().query<Record<string, unknown>>(
        `SELECT * FROM valubot_leads
         WHERE sync_status = $1
         ORDER BY updated_at ASC
         LIMIT $2`,
        [status, capped],
      );
      return rows.map(rowToRecord);
    } catch (err) {
      console.error('[leads] listLeadsBySyncStatus DB failed, falling back to file', err);
    }
  }

  return readFileStore()
    .filter((lead) => lead.syncStatus === status)
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
    .slice(0, capped);
}
