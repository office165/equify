/**
 * Isolated provider tasks for /api/valuation/backup-relay.
 * Each function throws on failure — the route wraps every call in its own try/catch.
 */

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import {
  hasProductionWhatsAppCredentials,
  isWhatsAppOtpMockMode,
} from '../config/deployment_env';
import { WhatsAppGateway } from '../gateway/whatsapp_gateway';
import { normalizePhoneE164 } from '../phone/normalize_e164';
import { formatILS } from '../utils/formatCurrency';
import {
  createMondayRelayItem,
  uploadMondayColumnFile,
  type MondayRelayPayload,
} from '../crm/monday_client';
import { buildMondayRelayPayload } from './monday_relay_payload';
import type { BackupRelayPayload } from './backup_relay_types';
import { buildValuationsHistoryInsertRow } from './valuations_history_row';

const STORAGE_BUCKET = 'valuation_reports';
const RESEND_ADMIN_TO = 'smallbizclub.il@gmail.com';
const DEFAULT_RESEND_FROM = 'equify BY SBC <system@valubot.co.il>';

function resolveSupabaseUrl(): string | null {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    null
  );
}

function resolveSupabaseServiceRoleKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;
}

function sanitizeEmailForPath(email: string): string {
  return email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, '_')
    .replace(/@/g, '_at_');
}

function buildReportObjectPath(userEmail: string): string {
  return `report_${sanitizeEmailForPath(userEmail)}_${Date.now()}.pdf`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMidpoint(value: number): string {
  return formatILS(value, { short: true });
}

function requireSupabaseAdmin() {
  const url = resolveSupabaseUrl();
  const serviceRoleKey = resolveSupabaseServiceRoleKey();
  if (!url || !serviceRoleKey) {
    throw new Error('supabase_service_role_not_configured');
  }
  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabase;
}

export interface MondayItemTaskResult {
  itemId: string;
  columnMap: Awaited<ReturnType<typeof createMondayRelayItem>>['columnMap'];
}

export async function executeMondayItemTask(
  mondayPayload: MondayRelayPayload,
): Promise<MondayItemTaskResult> {
  if (!process.env.MONDAY_API_KEY?.trim() || !process.env.MONDAY_BOARD_ID?.trim()) {
    throw new Error('monday_not_configured');
  }
  return createMondayRelayItem(mondayPayload);
}

export interface MondayFileTaskResult {
  assetId: string;
  filename: string;
  columnId: string;
  bytes: number;
}

export async function executeMondayFileTask(
  itemId: string,
  pdfBuffer: Buffer,
  columnId = 'files',
): Promise<MondayFileTaskResult> {
  const filename = `Valuation_${Date.now()}.pdf`;
  const fileResult = await uploadMondayColumnFile({
    itemId,
    columnId,
    fileBuffer: pdfBuffer,
    filename,
  });
  return {
    assetId: fileResult.assetId,
    filename,
    columnId,
    bytes: pdfBuffer.byteLength,
  };
}

export interface SupabaseStorageTaskResult {
  storagePath: string;
  pdfUrl: string;
  bytes: number;
}

export async function executeSupabaseStorageTask(
  payload: BackupRelayPayload,
  pdfBuffer: Buffer,
): Promise<SupabaseStorageTaskResult> {
  const supabase = requireSupabaseAdmin();
  const storagePath = buildReportObjectPath(payload.userEmail);

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

  const { data: publicUrlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  let pdfUrl = publicUrlData.publicUrl;

  if (!pdfUrl) {
    const { data: signed, error: signedError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

    if (signedError || !signed?.signedUrl) {
      throw signedError ?? new Error('Unable to resolve PDF URL after upload.');
    }
    pdfUrl = signed.signedUrl;
  }

  return {
    storagePath,
    pdfUrl,
    bytes: pdfBuffer.byteLength,
  };
}

export interface SupabaseInsertTaskResult {
  historyRowId: string | null;
  pdfUrl: string;
}

export interface SupabaseArchiveTaskResult extends SupabaseInsertTaskResult {
  storagePath?: string;
  bytes?: number;
}

/** Single sequence: storage upload → valuations_history insert. */
export async function executeSupabaseArchiveTask(
  payload: BackupRelayPayload,
  pdfBuffer: Buffer,
): Promise<SupabaseArchiveTaskResult> {
  const storageResult = await executeSupabaseStorageTask(payload, pdfBuffer);
  const insertResult = await executeSupabaseInsertTask(payload, storageResult.pdfUrl);
  return {
    ...insertResult,
    storagePath: storageResult.storagePath,
    bytes: storageResult.bytes,
  };
}

export async function executeSupabaseInsertTask(
  payload: BackupRelayPayload,
  pdfUrl = '',
): Promise<SupabaseInsertTaskResult> {
  const supabase = requireSupabaseAdmin();
  const insertRow = buildValuationsHistoryInsertRow(payload, pdfUrl);

  console.log('DEBUG: Supabase valuations_history insert', {
    columns: Object.keys(insertRow),
    user_email: insertRow.user_email,
    full_name: insertRow.full_name,
    national_id: insertRow.national_id ? '[present]' : '[missing]',
    corporate_tax_id: insertRow.corporate_tax_id ? '[present]' : '[missing]',
    sector: insertRow.sector || '[missing]',
    pdf_url: pdfUrl ? '[present]' : '[text_only]',
  });

  const { data: inserted, error: insertError } = await supabase
    .from('valuations_history')
    .insert(insertRow)
    .select('id')
    .single();

  if (insertError) {
    throw insertError;
  }

  return {
    historyRowId: inserted?.id ?? null,
    pdfUrl,
  };
}

export interface ResendTaskResult {
  messageId: string | null;
  attachmentBytes: number;
}

export async function executeResendTask(
  payload: BackupRelayPayload,
  pdfBuffer: Buffer | null,
): Promise<ResendTaskResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('resend_not_configured');
  }

  const from =
    process.env.VALUBOT_BACKUP_EMAIL_FROM?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    DEFAULT_RESEND_FROM;

  const midpoint = formatMidpoint(payload.valuationMidpoint);

  const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.5;color:#0f172a;">
        <h2 style="margin:0 0 12px;font-size:18px;">Equify — New valuation relay</h2>
        <p style="margin:0 0 16px;color:#475569;">Lead capture and PDF archive shipped from the backup relay.</p>
        <table style="border-collapse:collapse;width:100%;max-width:560px;">
          <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">Full name</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${escapeHtml(payload.fullName)}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">Company name</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${escapeHtml(payload.companyName)}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">Email</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${escapeHtml(payload.userEmail)}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">Phone</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${escapeHtml(payload.userPhone)}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">National ID</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${escapeHtml(payload.nationalId)}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">Corporate tax ID</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${escapeHtml(payload.corporateTaxId || '—')}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">Sector</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${escapeHtml(payload.sectorLabel || payload.industry || '—')}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">Valuation midpoint</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${escapeHtml(midpoint)}</td></tr>
        </table>
      </div>
    `.trim();

  const resend = new Resend(apiKey);
  const sendParams: Parameters<Resend['emails']['send']>[0] = {
    from,
    to: [process.env.ADMIN_BACKUP_EMAIL?.trim() || RESEND_ADMIN_TO],
    subject: `Equify Relay — ${payload.fullName} (${payload.userEmail})`,
    html,
  };

  let attachmentBytes = 0;
  if (pdfBuffer?.byteLength) {
    attachmentBytes = pdfBuffer.byteLength;
    sendParams.attachments = [
      {
        filename: `Valuation_Report_${Date.now()}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ];
  }

  const { data, error } = await resend.emails.send(sendParams);

  if (error) {
    throw new Error(error.message || 'resend_send_failed');
  }

  return {
    messageId: data?.id ?? null,
    attachmentBytes,
  };
}

export interface WhatsAppRelayTaskResult {
  messageId: string | null;
  delivered: boolean;
  phoneE164: string;
  attachmentBytes: number;
}

export async function executeWhatsAppRelayTask(
  payload: BackupRelayPayload,
  pdfBuffer: Buffer | null,
  pdfDownloadUrl?: string | null,
): Promise<WhatsAppRelayTaskResult> {
  if (isWhatsAppOtpMockMode() || !hasProductionWhatsAppCredentials()) {
    throw new Error('whatsapp_not_configured');
  }

  const phoneE164 = normalizePhoneE164(payload.userPhone);
  if (!phoneE164) {
    throw new Error('whatsapp_phone_missing');
  }

  const gateway = new WhatsAppGateway();
  const result = await gateway.sendValuationReportDelivery({
    toE164: phoneE164,
    companyName: payload.companyName,
    fullName: payload.fullName,
    locale: payload.locale,
    pdfBuffer,
    pdfDownloadUrl: pdfDownloadUrl ?? null,
  });

  return {
    messageId: result.messageId,
    delivered: result.delivered,
    phoneE164,
    attachmentBytes: pdfBuffer?.byteLength ?? 0,
  };
}

export function buildMondayRelayPayloadFromBackup(
  payload: BackupRelayPayload,
): MondayRelayPayload {
  return buildMondayRelayPayload(payload);
}
