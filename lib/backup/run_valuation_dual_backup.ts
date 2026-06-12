/**
 * Dual backup: Resend email + Supabase archive (tracked for Vercel waitUntil).
 */

import { archiveValuationReport } from './archive_valuation_report';
import {
  sendValuationPdfBackupEmail,
  type ValuationPdfBackupPayload,
} from '../pdf/valuation_pdf_backup_email';
import {
  getSupabaseEnvDiagnostics,
  isSupabaseAdminConfigured,
} from '../db/supabase';

export type ValuationDualBackupInput = ValuationPdfBackupPayload;

function hasEmailCredentials(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() || process.env.SENDGRID_API_KEY?.trim(),
  );
}

export async function runSupabaseArchive(
  input: ValuationDualBackupInput,
): Promise<void> {
  console.log('[dual-backup] Supabase backup initiated...');
  try {
    const result = await archiveValuationReport(
      input.userEmail,
      input.userPhone,
      input.valuationMidPoint,
      input.pdfBase64,
      {
        userId: input.userId,
        userCorporateTaxId: input.userCorporateTaxId,
        currency: input.currency,
        valuationId: input.valuationId,
      },
    );
    console.log('[dual-backup] Supabase backup complete', {
      storagePath: result.storagePath,
      historyRowId: result.historyRowId,
    });
  } catch (error) {
    console.error('SUPABASE BACKUP FAILED DIRECT ERROR:', error);
    throw error;
  }
}

export async function runValuationEmailBackup(
  input: ValuationDualBackupInput,
): Promise<void> {
  console.log('[dual-backup] Resend email backup initiated...');
  const result = await sendValuationPdfBackupEmail(input);
  console.log('[dual-backup] Resend email backup complete', result);
}

/**
 * Run email + Supabase backups concurrently. Await this inside Vercel waitUntil.
 */
export async function runValuationDualBackup(
  input: ValuationDualBackupInput,
): Promise<void> {
  const tasks: Promise<void>[] = [];

  if (hasEmailCredentials()) {
    tasks.push(
      runValuationEmailBackup(input).catch((err) => {
        console.error('[dual-backup] email task failed', err);
        throw err;
      }),
    );
  }

  if (isSupabaseAdminConfigured()) {
    tasks.push(runSupabaseArchive(input));
  }

  if (tasks.length === 0) {
    console.warn('[dual-backup] no backup providers configured — skipping');
    return;
  }

  const results = await Promise.allSettled(tasks);
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`[dual-backup] task ${index} rejected`, result.reason);
    }
  });
}

/** @deprecated Use runValuationDualBackup inside waitUntil instead. */
export function runValuationDualBackupAsync(
  input: ValuationDualBackupInput,
): void {
  void runValuationDualBackup(input);
}

export function getValuationDualBackupAvailability(): {
  email: boolean;
  supabase: boolean;
  supabaseDiagnostics: ReturnType<typeof getSupabaseEnvDiagnostics>;
} {
  return {
    email: hasEmailCredentials(),
    supabase: isSupabaseAdminConfigured(),
    supabaseDiagnostics: getSupabaseEnvDiagnostics(),
  };
}
