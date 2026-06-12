import { waitUntil } from '@vercel/functions';
import {
  runValuationDualBackup,
  runValuationEmailBackup,
  type ValuationDualBackupInput,
} from './run_valuation_dual_backup';

/**
 * Schedule dual backup on Vercel without blocking the HTTP response.
 * Uses waitUntil so the serverless function stays alive until work completes.
 */
export function scheduleValuationDualBackup(input: ValuationDualBackupInput): void {
  const task = runValuationDualBackup(input).catch((err) => {
    console.error('SUPABASE BACKUP FAILED DIRECT ERROR:', err);
    console.error('[dual-backup] background task failed', err);
  });

  try {
    waitUntil(task);
  } catch {
    void task;
  }
}

/** Schedule email-only backup in the background. */
export function scheduleValuationEmailBackup(input: ValuationDualBackupInput): void {
  const task = runValuationEmailBackup(input).catch((err) => {
    console.error('[dual-backup] email background task failed', err);
  });

  try {
    waitUntil(task);
  } catch {
    void task;
  }
}
