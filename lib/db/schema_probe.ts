/**
 * Runtime schema probe: verifies that every column the application writes
 * actually exists in the live database.
 *
 * Method: SELECT <columns> FROM <table> LIMIT 0.
 * PostgREST rejects the query with a clear error if any column is absent.
 * No migration required — works against any live Supabase project.
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
  /** Column names confirmed missing, or a single 'unavailable' reason string. */
  missing: string[];
  error?: string;
}

export type SchemaProbeStatus = 'ok' | 'missing_columns' | 'unavailable';

export interface SchemaProbeResult {
  ok: boolean;
  /** false when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are absent. */
  supabaseConfigured: boolean;
  status: SchemaProbeStatus;
  results: TableProbeResult[];
}

/**
 * Probes each table by issuing SELECT <columns> LIMIT 0.
 * PostgREST surfaces a column-level error when any column is absent,
 * so we binary-search: retry each missing column individually to build
 * the exact list.
 *
 * Never throws — all failures are surfaced as status:'unavailable' or
 * status:'missing_columns' so the health endpoint can always respond.
 */
export async function probeSupabaseSchema(): Promise<SchemaProbeResult> {
  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      supabaseConfigured: false,
      status: 'unavailable',
      results: [],
    };
  }

  const supabase = getSupabaseAdminClient();
  const results: TableProbeResult[] = [];

  for (const exp of TABLE_EXPECTATIONS) {
    // Attempt to select all required columns with LIMIT 0.
    // If PostgREST rejects the query, at least one column is missing.
    const { error: bulkError } = await supabase
      .from(exp.table)
      .select(exp.requiredColumns.join(', '))
      .limit(0);

    if (!bulkError) {
      results.push({ table: exp.table, ok: true, missing: [] });
      continue;
    }

    // The bulk select failed. Probe each column individually to identify
    // which ones are missing vs. a connectivity / permission error.
    const missing: string[] = [];
    let probeError: string | undefined;

    for (const col of exp.requiredColumns) {
      const { error: colError } = await supabase
        .from(exp.table)
        .select(col)
        .limit(0);

      if (colError) {
        const msg = colError.message ?? '';
        // PostgREST error for missing column contains the column name.
        // Distinguish genuine missing-column errors from other failures.
        if (
          msg.includes('does not exist') ||
          msg.includes('column') ||
          msg.includes(col)
        ) {
          missing.push(col);
        } else {
          // Could be RLS / network / permission — treat as unavailable.
          probeError = msg;
        }
      }
    }

    if (probeError && missing.length === 0) {
      // Every individual probe failed for non-schema reasons.
      results.push({
        table: exp.table,
        ok: false,
        missing: [],
        error: probeError,
      });
    } else {
      results.push({
        table: exp.table,
        ok: missing.length === 0,
        missing,
        error: probeError,
      });
    }
  }

  const anyUnavailable = results.some((r) => !r.ok && r.missing.length === 0 && r.error);
  const anyMissing = results.some((r) => r.missing.length > 0);
  const allOk = results.every((r) => r.ok);

  const status: SchemaProbeStatus = allOk
    ? 'ok'
    : anyMissing
      ? 'missing_columns'
      : 'unavailable';

  return {
    ok: allOk,
    supabaseConfigured: true,
    status,
    results,
  };
}
