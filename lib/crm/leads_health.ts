import { getLastSuccessfulSyncAtFromLog } from './leads_sync_log';
import { getLastSuccessfulLeadSyncAt } from './valubot_leads_repository';

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/** Supavisor pooler host/shard mismatch (tenant-not-found on wrong aws-N shard). */
export function inferProbableDbCause(dbError?: string): string | undefined {
  if (!dbError) return undefined;
  const lower = dbError.toLowerCase();
  if (
    lower.includes('enotfound') &&
    (lower.includes('tenant') || lower.includes('not found'))
  ) {
    return 'pooler_tenant_mismatch';
  }
  if (lower.includes('tenant') && lower.includes('not found')) {
    return 'pooler_tenant_mismatch';
  }
  return undefined;
}

export async function resolveLastSuccessfulSyncAt(): Promise<string | null> {
  const fromDb = await getLastSuccessfulLeadSyncAt();
  const fromLog = getLastSuccessfulSyncAtFromLog();

  if (!fromDb) return fromLog;
  if (!fromLog) return fromDb;

  return fromDb.localeCompare(fromLog) >= 0 ? fromDb : fromLog;
}

export function isSyncStale(lastSuccessfulSyncAt: string | null, now = Date.now()): boolean {
  if (!lastSuccessfulSyncAt) return true;
  const ts = Date.parse(lastSuccessfulSyncAt);
  if (!Number.isFinite(ts)) return true;
  return now - ts > STALE_THRESHOLD_MS;
}
