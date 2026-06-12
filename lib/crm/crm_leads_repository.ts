/**
 * Local PostgreSQL persistence for CRM leads (Monday.com sync companion).
 */

import type { Pool } from 'pg';
import { getLiveDatabasePool } from '../../valuation_live';

export interface CrmLeadInsert {
  userPhone: string;
  userId: string;
  userCorporateTaxId?: string;
  userEmail: string;
  status?: 'STARTED' | 'CONVERTED' | 'LOST';
  mondayItemId?: string | null;
  mondaySyncError?: string | null;
}

export interface CrmLeadRow {
  id: string;
  user_phone: string;
  user_national_id: string;
  user_corporate_tax_id: string;
  user_email: string;
  status: string;
  monday_item_id: string | null;
  monday_sync_error: string | null;
  created_at: Date;
  updated_at: Date;
}

const ENSURE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_phone TEXT NOT NULL,
  user_national_id TEXT NOT NULL,
  user_corporate_tax_id TEXT NOT NULL,
  user_email CITEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'STARTED',
  monday_item_id TEXT,
  monday_sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT crm_leads_status_check CHECK (status IN ('STARTED', 'CONVERTED', 'LOST'))
);

CREATE INDEX IF NOT EXISTS crm_leads_email_created_idx
  ON crm_leads (user_email, created_at DESC);
`;

let tableReady = false;

async function ensureCrmLeadsTable(pool: Pool): Promise<void> {
  if (tableReady) return;
  await pool.query(ENSURE_TABLE_SQL);
  tableReady = true;
}

export async function insertCrmLead(
  lead: CrmLeadInsert,
  pool: Pool = getLiveDatabasePool(),
): Promise<CrmLeadRow> {
  await ensureCrmLeadsTable(pool);

  const { rows } = await pool.query<CrmLeadRow>(
    `INSERT INTO crm_leads (
       user_phone,
       user_national_id,
       user_corporate_tax_id,
       user_email,
       status,
       monday_item_id,
       monday_sync_error
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      lead.userPhone.trim(),
      lead.userId.trim(),
      (lead.userCorporateTaxId ?? '').trim(),
      lead.userEmail.trim().toLowerCase(),
      lead.status ?? 'STARTED',
      lead.mondayItemId ?? null,
      lead.mondaySyncError ?? null,
    ],
  );

  return rows[0];
}

export async function updateCrmLeadMondaySync(
  leadId: string,
  update: { mondayItemId?: string | null; mondaySyncError?: string | null },
  pool: Pool = getLiveDatabasePool(),
): Promise<void> {
  await pool.query(
    `UPDATE crm_leads
     SET monday_item_id = COALESCE($2, monday_item_id),
         monday_sync_error = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [leadId, update.mondayItemId ?? null, update.mondaySyncError ?? null],
  );
}
