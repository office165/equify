/**
 * Supabase dual-write: Storage bucket + valuations_history table.
 */

import { getSupabaseAdminClient, isSupabaseAdminConfigured } from '../db/supabase';
import { sanitizePdfBase64 } from './sanitize_pdf_base64';

const STORAGE_BUCKET = 'valuation_reports';
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365;

export interface ArchiveValuationReportOptions {
  userId?: string;
  userCorporateTaxId?: string;
  displayName?: string;
  sectorLabel?: string;
  currency?: string;
  valuationId?: string;
}

export interface ArchiveValuationReportResult {
  storagePath: string;
  pdfUrl: string;
  historyRowId: string | null;
}

export interface ValuationsHistoryInsertRow {
  user_email: string;
  user_phone: string;
  full_name: string;
  national_id: string;
  corporate_tax_id: string;
  sector: string;
  valuation_midpoint: number;
  pdf_url: string;
}

function sanitizeEmailForFilename(email: string): string {
  return email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, '_')
    .replace(/@/g, '_at_');
}

function buildStorageObjectPath(userEmail: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `report_${sanitizeEmailForFilename(userEmail)}_${stamp}.pdf`;
}

function buildCoreHistoryRow(
  userEmail: string,
  userPhone: string,
  fullName: string,
  nationalId: string,
  corporateTaxId: string,
  sector: string,
  valuationMidpoint: number,
  pdfUrl: string,
): ValuationsHistoryInsertRow {
  return {
    user_email: userEmail.trim().toLowerCase(),
    user_phone: userPhone.trim(),
    full_name: fullName.trim() || userEmail.trim().toLowerCase(),
    national_id: nationalId.trim(),
    corporate_tax_id: corporateTaxId.trim(),
    sector: sector.trim(),
    valuation_midpoint: valuationMidpoint,
    pdf_url: pdfUrl,
  };
}

/**
 * Upload PDF to Supabase Storage and persist metadata in valuations_history.
 */
export async function archiveValuationReport(
  userEmail: string,
  userPhone: string,
  valuationMidpoint: number,
  pdfBase64Buffer: string,
  options: ArchiveValuationReportOptions = {},
): Promise<ArchiveValuationReportResult> {
  console.log('[supabase-backup] Supabase backup initiated...', {
    email: userEmail,
    phone: userPhone,
    valuationMidpoint,
    bucket: STORAGE_BUCKET,
    table: 'valuations_history',
  });

  if (!isSupabaseAdminConfigured()) {
    const error = new Error('Supabase admin credentials are not configured.');
    console.error('SUPABASE BACKUP FAILED DIRECT ERROR:', error);
    throw error;
  }

  const normalizedBase64 = sanitizePdfBase64(pdfBase64Buffer);
  const pdfBuffer = Buffer.from(normalizedBase64, 'base64');
  if (!pdfBuffer.length) {
    const error = new Error('PDF archive payload is empty after base64 decode.');
    console.error('SUPABASE BACKUP FAILED DIRECT ERROR:', error);
    throw error;
  }

  const supabase = getSupabaseAdminClient();
  const storagePath = buildStorageObjectPath(userEmail);

  let pdfUrl: string;

  try {
    console.log('[supabase-backup] uploading to storage bucket', {
      bucket: STORAGE_BUCKET,
      path: storagePath,
      bytes: pdfBuffer.length,
    });

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
        cacheControl: '3600',
      });

    if (uploadError) {
      throw uploadError;
    }

    console.log('[supabase-backup] storage upload complete', { storagePath });

    const { data: signed, error: signedError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

    if (signedError || !signed?.signedUrl) {
      throw signedError ?? new Error('Signed URL missing from Supabase response.');
    }

    pdfUrl = signed.signedUrl;
  } catch (error) {
    console.error('SUPABASE BACKUP FAILED DIRECT ERROR:', error);
    throw error;
  }

  const insertRow = buildCoreHistoryRow(
    userEmail,
    userPhone,
    options.displayName ?? userEmail,
    options.userId ?? '',
    options.userCorporateTaxId ?? '',
    options.sectorLabel ?? '',
    valuationMidpoint,
    pdfUrl,
  );

  try {
    console.log('[supabase-backup] inserting valuations_history row', insertRow);

    const { data: inserted, error: insertError } = await supabase
      .from('valuations_history')
      .insert(insertRow)
      .select('id')
      .single();

    if (insertError) {
      throw insertError;
    }

    console.log('[supabase-backup] valuations_history row saved', {
      id: inserted?.id,
      columns: Object.keys(insertRow),
    });

    return {
      storagePath,
      pdfUrl,
      historyRowId: inserted?.id ?? null,
    };
  } catch (error) {
    console.error('SUPABASE BACKUP FAILED DIRECT ERROR:', error);
    throw error;
  }
}
