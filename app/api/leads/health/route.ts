import { NextResponse } from 'next/server';
import {
  inferProbableDbCause,
  isSyncStale,
  resolveLastSuccessfulSyncAt,
} from '../../../../lib/crm/leads_health';
import { getLeadsHealthConfig } from '../../../../lib/crm/leads_persistence';
import { getRecentSyncLog } from '../../../../lib/crm/leads_sync_log';
import { probeLeadDatabaseReachable } from '../../../../lib/crm/valubot_leads_repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const config = getLeadsHealthConfig();
  const dbProbe = config.dbConfigured
    ? await probeLeadDatabaseReachable()
    : { reachable: false, error: 'not_configured' };

  const dbError = dbProbe.reachable ? undefined : dbProbe.error;
  const probableCause = dbProbe.reachable ? undefined : inferProbableDbCause(dbError);
  const lastSuccessfulSyncAt = await resolveLastSuccessfulSyncAt();
  const stale = isSyncStale(lastSuccessfulSyncAt);

  return NextResponse.json(
    {
      ok: true,
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
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}
