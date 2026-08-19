import { NextResponse } from 'next/server';
import {
  inferProbableDbCause,
  isSyncStale,
  resolveLastSuccessfulSyncAt,
} from '../../../../lib/crm/leads_health';
import { getLeadsHealthConfig } from '../../../../lib/crm/leads_persistence';
import { getRecentSyncLog } from '../../../../lib/crm/leads_sync_log';
import { probeLeadDatabaseReachable } from '../../../../lib/crm/valubot_leads_repository';
import { isSupabaseAdminConfigured } from '../../../../lib/db/supabase';
import { probeSupabaseSchema } from '../../../../lib/db/schema_probe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const config = getLeadsHealthConfig();
  const [dbProbe, schemaProbe] = await Promise.all([
    config.dbConfigured
      ? probeLeadDatabaseReachable()
      : Promise.resolve({ reachable: false, error: 'not_configured' }),
    probeSupabaseSchema(),
  ]);

  const dbError = dbProbe.reachable ? undefined : dbProbe.error;
  const probableCause = dbProbe.reachable ? undefined : inferProbableDbCause(dbError);
  const lastSuccessfulSyncAt = await resolveLastSuccessfulSyncAt();
  const stale = isSyncStale(lastSuccessfulSyncAt);

  // dbConfigured = DATABASE_URL (Postgres direct, used for valubot_leads / CRM sync)
  // supabaseConfigured = SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (used for archive, storage, events)
  const supabaseConfigured = isSupabaseAdminConfigured();

  const schemaOk = schemaProbe.ok;

  let db_schema: unknown;
  if (schemaProbe.status === 'ok') {
    db_schema = 'ok';
  } else if (schemaProbe.status === 'missing_columns') {
    db_schema = {
      status: 'missing_columns',
      missing: schemaProbe.results
        .filter((r) => r.missing.length > 0)
        .map((r) => ({ table: r.table, missing: r.missing })),
    };
  } else {
    // 'unavailable' — Supabase not configured or probe failed for non-schema reasons
    db_schema = {
      status: 'unavailable',
      reason: schemaProbe.supabaseConfigured
        ? (schemaProbe.results.find((r) => r.error)?.error ?? 'probe_failed')
        : 'supabase_not_configured',
    };
  }

  const status = schemaOk ? 200 : 503;

  return NextResponse.json(
    {
      ok: schemaOk,
      at: new Date().toISOString(),
      config: {
        ...config,
        dbReachable: dbProbe.reachable,
        dbError,
        probableCause,
      },
      // dbConfigured = DATABASE_URL (CRM / leads Postgres)
      // supabaseConfigured = SUPABASE_URL + service role key (archive, storage, events)
      supabaseConfigured,
      mondayConfigured: config.mondayKeyPresent && config.boardIdPresent,
      boardId: config.boardId,
      lastSuccessfulSyncAt,
      stale,
      recentSyncs: getRecentSyncLog(),
      db_schema,
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}
