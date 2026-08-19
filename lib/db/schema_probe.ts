/**
 * Runtime schema probe: verifies that every column the application writes
 * actually exists in the live database.
 *
 * Each entry lists the columns that INSERT statements send — not every column
 * the table has (id / created_at / DEFAULT columns are omitted intentionally).
 *
 * Called from /api/leads/health to surface missing columns before they cause
 * silent data loss in production.
 */

import { getSupabaseAdminClient, isSupabaseAdminConfigured } from './supabase';

export interface TableProbeExpectation {
  table: string;
  /** Columns the app writes; must all exist in the live DB. */
  requiredColumns: string[];
}

/**
 * Columns derived from the actual INSERT payloads in the codebase:
 *
 * valuations_history  — archiveValuationReport / buildValuationsHistoryInsertRow
 * stripe_transactions — claim_paypal_capture_and_mint RPC + promo mint RPCs (SQL)
 * promo_codes         — admin-inserted; app reads times_used, code, is_active, expires_at
 * promo_redemptions   — redeem_promo_code RPC (SQL)
 * feature_requests    — /api/v1/feedback route
 * events              — lib/analytics/track_event.ts
 */
export const TABLE_EXPECTATIONS: TableProbeExpectation[] = [
  {
    table: 'valuations_history',
    requiredColumns: [
      'user_email',
      'user_phone',
      'full_name',
      'national_id',
      'corporate_tax_id',
      'sector',
      'valuation_midpoint',
      'pdf_url',
    ],
  },
  {
    table: 'stripe_transactions',
    requiredColumns: [
      'stripe_payment_intent_id',
      'stripe_checkout_session_id',
      'stripe_customer_id',
      'purchaser_user_id',
      'amount',
      'currency',
      'is_used',
      'token_jwt',
      'token_jti',
      'expires_at',
      'gateway_provider',
      'valuation_id',
      'metadata',
    ],
  },
  {
    table: 'promo_codes',
    requiredColumns: ['code', 'is_active', 'times_used', 'expires_at', 'max_uses'],
  },
  {
    table: 'promo_redemptions',
    requiredColumns: ['promo_code_id', 'user_email', 'payment_matched'],
  },
  {
    table: 'feature_requests',
    requiredColumns: ['message', 'contact_email', 'user_agent'],
  },
  {
    table: 'events',
    requiredColumns: ['user_id', 'event_type', 'metadata'],
  },
];

export interface TableProbeResult {
  table: string;
  ok: boolean;
  missing: string[];
}

export interface SchemaProbeResult {
  ok: boolean;
  configured: boolean;
  results: TableProbeResult[];
}

/**
 * Queries information_schema.columns once per table and compares against
 * TABLE_EXPECTATIONS. Returns per-table results and a top-level ok flag.
 *
 * Never throws — failures are surfaced as ok:false so the health endpoint
 * can always respond.
 */
export async function probeSupabaseSchema(): Promise<SchemaProbeResult> {
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, configured: false, results: [] };
  }

  const supabase = getSupabaseAdminClient();
  const tableNames = TABLE_EXPECTATIONS.map((e) => e.table);

  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('table_name, column_name')
    .eq('table_schema', 'public')
    .in('table_name', tableNames);

  if (error || !data) {
    return {
      ok: false,
      configured: true,
      results: TABLE_EXPECTATIONS.map((e) => ({
        table: e.table,
        ok: false,
        missing: [`probe_error: ${error?.message ?? 'no data'}`],
      })),
    };
  }

  const existing = new Map<string, Set<string>>();
  for (const row of data) {
    const tbl = row.table_name as string;
    const col = row.column_name as string;
    if (!existing.has(tbl)) existing.set(tbl, new Set());
    existing.get(tbl)!.add(col);
  }

  const results: TableProbeResult[] = TABLE_EXPECTATIONS.map((exp) => {
    const cols = existing.get(exp.table) ?? new Set<string>();
    const missing = exp.requiredColumns.filter((c) => !cols.has(c));
    return { table: exp.table, ok: missing.length === 0, missing };
  });

  return {
    ok: results.every((r) => r.ok),
    configured: true,
    results,
  };
}
