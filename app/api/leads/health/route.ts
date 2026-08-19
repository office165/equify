import { NextResponse } from 'next/server';
import {
  inferProbableDbCause,
  isSyncStale,
  resolveLastSuccessfulSyncAt,
} from '../../../../lib/crm/leads_health';
import { getLeadsHealthConfig } from '../../../../lib/crm/leads_persistence';
import { getRecentSyncLog } from '../../../../lib/crm/leads_sync_log';
import { probeLeadDatabaseReachable } from '../../../../lib/crm/valubot_leads_repository';
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

  const schemaOk = schemaProbe.ok;
  const schemaMissing = schemaProbe.results
    .filter((r) => !r.ok)
    .map((r) => ({ table: r.table, missing: r.missing }));

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
      mondayConfigured: config.mondayKeyPresent && config.boardIdPresent,
      boardId: config.boardId,
      lastSuccessfulSyncAt,
      stale,
      recentSyncs: getRecentSyncLog(),
      db_schema: schemaOk
        ? 'ok'
        : { status: 'missing_columns', missing: schemaMissing },
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}
