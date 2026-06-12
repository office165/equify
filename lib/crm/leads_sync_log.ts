import type { LeadSyncLogEntry } from './leads_types';

const MAX_LOG = 10;
const syncLog: LeadSyncLogEntry[] = [];

export function appendSyncLog(entry: LeadSyncLogEntry): void {
  syncLog.unshift(entry);
  if (syncLog.length > MAX_LOG) {
    syncLog.length = MAX_LOG;
  }
}

export function getRecentSyncLog(): LeadSyncLogEntry[] {
  return [...syncLog];
}

/** Most recent successful Monday sync in this serverless instance (may be empty after cold start). */
export function getLastSuccessfulSyncAtFromLog(): string | null {
  const hit = syncLog.find((entry) => entry.ok);
  return hit?.at ?? null;
}
