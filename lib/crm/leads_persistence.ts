/**
 * Lead persistence diagnostics — safe for /api/leads/health (no secrets).
 */

export type LeadPersistenceMode = 'postgres' | 'file_store';

export function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL);
}

export function isDatabaseUrlConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getLeadPersistenceMode(): LeadPersistenceMode {
  return isDatabaseUrlConfigured() ? 'postgres' : 'file_store';
}

export function isFileStoreOnVercel(): boolean {
  return isVercelRuntime() && !isDatabaseUrlConfigured();
}

export function logEphemeralPersistenceCritical(context: string, detail?: unknown): void {
  if (!isVercelRuntime()) return;
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'CRITICAL',
      stage: 'lead_persistence',
      context,
      persistenceMode: getLeadPersistenceMode(),
      message:
        'Lead written to ephemeral file-store on Vercel — configure DATABASE_URL or Monday sync must complete in this invocation',
      detail: detail instanceof Error ? detail.message : detail,
    }),
  );
}

export interface LeadsHealthConfig {
  mondayKeyPresent: boolean;
  mondayKeyLength: number;
  boardIdPresent: boolean;
  boardId: string;
  dbConfigured: boolean;
  persistenceMode: LeadPersistenceMode;
  vercel: boolean;
  fileStoreOnVercel: boolean;
  waitUntilEnabled: boolean;
}

export function getLeadsHealthConfig(): LeadsHealthConfig {
  const mondayKey = process.env.MONDAY_API_KEY?.trim() ?? '';
  const boardId = process.env.MONDAY_BOARD_ID?.trim() || '18393484200';
  const dbConfigured = isDatabaseUrlConfigured();
  const vercel = isVercelRuntime();

  return {
    mondayKeyPresent: mondayKey.length > 0,
    mondayKeyLength: mondayKey.length,
    boardIdPresent: Boolean(process.env.MONDAY_BOARD_ID?.trim()),
    boardId,
    dbConfigured,
    persistenceMode: dbConfigured ? 'postgres' : 'file_store',
    vercel,
    fileStoreOnVercel: vercel && !dbConfigured,
    waitUntilEnabled: vercel,
  };
}
