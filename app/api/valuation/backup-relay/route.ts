import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import {
  executeSupabaseArchiveTask,
  executeSupabaseInsertTask,
  executeWhatsAppRelayTask,
} from '../../../../lib/backup/backup_relay_shippers';
import { executeMondayLeadRelaySync } from '../../../../lib/backup/monday_relay_transport';
import type { LeadUpsertEvent } from '../../../../lib/crm/leads_types';
import type {
  BackupRelayPayload,
  BackupRelayRequestBody,
  BackupRelayResponse,
  RelayServiceResult,
} from '../../../../lib/backup/backup_relay_types';
import { sanitizePdfBase64 } from '../../../../lib/backup/sanitize_pdf_base64';
import { parseBackupRelayBody } from '../../../../lib/backup/parse_backup_relay_body';
import { runSupabaseStartupCheck } from '../../../../lib/db/supabase';
import { appRouteMethodNotAllowed } from '../../../../lib/api/http';
import {
  buildMondayLeadUpsertFromRelay,
  mondayWireFieldManifest,
  snapshotMondayFiveFields,
} from '../../../../lib/crm/monday_lead_wire';
import { formatILS } from '../../../../lib/utils/formatCurrency';

export const runtime = 'nodejs';
export const maxDuration = 60;

const RESEND_ADMIN_TO = 'smallbizclub.il@gmail.com';
const DEFAULT_RESEND_FROM = 'equify BY SBC <system@valubot.co.il>';

function providerErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function decodeRelayPdfBuffer(rawPdfBase64: string | undefined | null): Buffer | null {
  const sanitized = sanitizePdfBase64(String(rawPdfBase64 ?? ''));
  if (!sanitized) {
    return null;
  }
  const pdfBuffer = Buffer.from(sanitized, 'base64');
  if (!pdfBuffer.byteLength) {
    return null;
  }
  console.log('DEBUG: PDF binary buffer ready. Byte size:', pdfBuffer.byteLength);
  return pdfBuffer;
}

/** Resend-specific binary decode — strips data-URI headers before base64 decode. */
function decodeResendPdfAttachmentBuffer(
  rawPdfBase64: string | undefined | null,
): Buffer | null {
  const trimmed = String(rawPdfBase64 ?? '').trim();
  if (!trimmed) {
    console.log('DEBUG: Resend relay — pdfBase64 empty, sending text-only email body');
    return null;
  }

  const sanitized = sanitizePdfBase64(trimmed);
  if (!sanitized) {
    console.log('DEBUG: Resend relay — pdfBase64 empty after sanitize, text-only email');
    return null;
  }

  const pdfAttachmentBuffer = Buffer.from(sanitized, 'base64');
  if (!pdfAttachmentBuffer.byteLength) {
    console.log('DEBUG: Resend relay — decoded PDF buffer is empty, text-only email');
    return null;
  }

  console.log(
    'DEBUG: Resend PDF attachment buffer ready. Byte size:',
    pdfAttachmentBuffer.byteLength,
  );
  return pdfAttachmentBuffer;
}

function escapeRelayHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatRelayMidpoint(value: number): string {
  return formatILS(value, { short: true });
}

function buildResendRelayHtml(payload: BackupRelayPayload): string {
  const midpoint = formatRelayMidpoint(payload.valuationMidpoint);
  return `
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.5;color:#0f172a;">
        <h2 style="margin:0 0 12px;font-size:18px;">equify BY SBC — New valuation relay</h2>
        <p style="margin:0 0 16px;color:#475569;">Lead capture and PDF archive shipped from the backup relay.</p>
        <table style="border-collapse:collapse;width:100%;max-width:560px;">
          <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">Full name</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${escapeRelayHtml(payload.fullName)}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">Company name</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${escapeRelayHtml(payload.companyName)}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">Email</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${escapeRelayHtml(payload.userEmail)}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">Phone</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${escapeRelayHtml(payload.userPhone)}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">National ID</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${escapeRelayHtml(payload.nationalId)}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">Corporate tax ID</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${escapeRelayHtml(payload.corporateTaxId || '—')}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">Sector</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${escapeRelayHtml(payload.sectorLabel || payload.industry || '—')}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">Valuation midpoint</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${escapeRelayHtml(midpoint)}</td></tr>
        </table>
      </div>
    `.trim();
}

function isOptionalRelaySkip(reason: string | undefined): boolean {
  return (
    reason === 'resend_not_configured' ||
    reason === 'whatsapp_not_configured' ||
    reason === 'whatsapp_phone_missing'
  );
}

async function runIsolatedResendRelay(
  body: BackupRelayRequestBody,
  payload: BackupRelayPayload,
): Promise<RelayServiceResult> {
  const resendDetail: Record<string, unknown> = {};
  let resendOk = false;
  let resendSkipped = false;
  let resendError: string | undefined;

  try {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('resend_not_configured');
    }

    const resend = new Resend(apiKey);
    const from =
      process.env.VALUBOT_BACKUP_EMAIL_FROM?.trim() ||
      process.env.EMAIL_FROM?.trim() ||
      DEFAULT_RESEND_FROM;
    const to = process.env.ADMIN_BACKUP_EMAIL?.trim() || RESEND_ADMIN_TO;

    const pdfAttachmentBuffer = decodeResendPdfAttachmentBuffer(body.pdfBase64);

    const sendParams: Parameters<Resend['emails']['send']>[0] = {
      from,
      to: [to],
      subject: `equify BY SBC Relay — ${payload.fullName} (${payload.userEmail})`,
      html: buildResendRelayHtml(payload),
    };

    if (pdfAttachmentBuffer) {
      sendParams.attachments = [
        {
          filename: `Valuation_Report_${Date.now()}.pdf`,
          content: pdfAttachmentBuffer,
          contentType: 'application/pdf',
        },
      ];
      resendDetail.attachmentBytes = pdfAttachmentBuffer.byteLength;
    } else {
      resendDetail.attachmentSkipped = true;
      resendDetail.attachmentReason = 'pdf_not_provided';
    }

    const { data, error } = await resend.emails.send(sendParams);

    if (error) {
      throw new Error(error.message || 'resend_send_failed');
    }

    resendOk = true;
    resendDetail.messageId = data?.id ?? null;
    resendDetail.delivered = true;
  } catch (err) {
    resendError = providerErrorMessage(err);
    resendDetail.error = resendError;
    if (resendError === 'resend_not_configured') {
      resendSkipped = true;
      console.warn('[backup-relay] Resend skipped — not configured');
    } else {
      console.error('DEBUG: RESEND_EXECUTION ERROR:', err);
    }
  }

  return {
    service: 'resend',
    ok: resendOk,
    skipped: resendSkipped && !resendOk,
    reason: resendSkipped ? 'resend_not_configured' : undefined,
    error: resendOk ? undefined : resendError ?? 'resend_send_failed',
    detail: resendDetail,
  };
}

async function runIsolatedWhatsAppRelay(
  payload: BackupRelayPayload,
  pdfBuffer: Buffer | null,
  supabasePdfUrl: string | null,
): Promise<RelayServiceResult> {
  const whatsappDetail: Record<string, unknown> = {};
  let whatsappOk = false;
  let whatsappSkipped = false;
  let whatsappError: string | undefined;

  try {
    const waResult = await executeWhatsAppRelayTask(
      payload,
      pdfBuffer,
      supabasePdfUrl,
    );
    whatsappOk = waResult.delivered;
    whatsappDetail.delivery = {
      ok: waResult.delivered,
      messageId: waResult.messageId,
      phoneE164: waResult.phoneE164,
      attachmentBytes: waResult.attachmentBytes,
    };
  } catch (err) {
    whatsappError = providerErrorMessage(err);
    whatsappDetail.delivery = { ok: false, error: whatsappError };
    if (isOptionalRelaySkip(whatsappError)) {
      whatsappSkipped = true;
      console.warn(`[backup-relay] WhatsApp skipped — ${whatsappError}`);
    } else {
      console.error('DEBUG: WHATSAPP_EXECUTION ERROR:', err);
    }
  }

  return {
    service: 'whatsapp',
    ok: whatsappOk,
    skipped: whatsappSkipped && !whatsappOk,
    reason: whatsappSkipped ? whatsappError : undefined,
    error: whatsappOk ? undefined : whatsappError ?? 'whatsapp_delivery_failed',
    detail: whatsappDetail,
  };
}

/**
 * Monday-first single-shot relay: one POST → Monday item → optional file → Supabase → Resend.
 */
export async function POST(request: Request) {
  console.log('DEBUG: backup-relay Monday-primary POST entered');
  runSupabaseStartupCheck();

  let body: BackupRelayRequestBody;
  try {
    body = (await request.json()) as BackupRelayRequestBody;
  } catch (parseError) {
    console.error('DEBUG: RELAY_JSON EXECUTION ERROR:', parseError);
    return NextResponse.json(
      {
        ok: true,
        receivedAt: new Date().toISOString(),
        results: buildEmptyFailureResults('invalid_json'),
        warning: 'invalid_json',
      } satisfies BackupRelayResponse & { warning: string },
      { status: 200 },
    );
  }

  if (!body.pdfBase64) {
    console.log('DEBUG: Processing text-only asynchronous lead capture step.');
  }

  const pdfBuffer = decodeRelayPdfBuffer(body.pdfBase64);
  const sanitizedBase64 = sanitizePdfBase64(String(body.pdfBase64 ?? ''));

  console.log('DEBUG: backup-relay 5-field camelCase bundle', {
    fullName: body.fullName ?? '',
    companyName: body.companyName ?? '',
    nationalId: body.nationalId ?? body.corporateTaxId ?? '',
    userPhone: body.userPhone ?? '',
    userEmail: body.userEmail ?? '',
    valuationMidpoint: body.valuationMidpoint ?? 0,
    pdfBase64Length: sanitizedBase64.length,
    pdfBufferBytes: pdfBuffer?.byteLength ?? 0,
  });

  const payload = parseBackupRelayBody(body);
  if (!payload) {
    console.error('DEBUG: RELAY_PAYLOAD EXECUTION ERROR: validation failed', body);
    return NextResponse.json(
      {
        ok: true,
        receivedAt: new Date().toISOString(),
        results: buildEmptyFailureResults('invalid_payload'),
        warning: 'invalid_payload',
      } satisfies BackupRelayResponse & { warning: string },
      { status: 200 },
    );
  }

  payload.pdfBase64 = sanitizedBase64;
  payload.pdfBuffer = pdfBuffer;
  const fiveFieldWire = snapshotMondayFiveFields(payload);

  const mondayDetail: Record<string, unknown> = {};
  let mondayItemOk = false;
  let mondayFileOk = false;
  let mondaySkipped = false;
  let mondayError: string | undefined;
  let mondayItemId: string | undefined;

  try {
    const mondayEvent: LeadUpsertEvent = pdfBuffer
      ? 'pdf_downloaded'
      : 'wizard_completed';

    const mondayLeadBody = buildMondayLeadUpsertFromRelay(payload, mondayEvent);

    console.log('🚀 MONDAY INTEGRATION INGESTION INITIATED. PAYLOAD:', {
      event: mondayEvent,
      fullName: mondayLeadBody.fullName,
      companyName: mondayLeadBody.companyName,
      userPhone: mondayLeadBody.userPhone,
      nationalId: mondayLeadBody.nationalId,
      userEmail: mondayLeadBody.userEmail,
      valuationMidpoint: mondayLeadBody.valuationMidpoint,
    });

    console.log('DEBUG: Monday five-field wire (frontend → board)', {
      wire: mondayWireFieldManifest(),
      fields: fiveFieldWire,
      sectorLabel: mondayLeadBody.sectorLabel ?? '',
      valuationMidpoint: mondayLeadBody.valuationMidpoint,
    });

    const { leadResult, metrics } = await executeMondayLeadRelaySync(mondayLeadBody, {
      pdfBuffer,
    });
    mondayItemId = leadResult.mondayItemId ?? undefined;
    mondayItemOk = leadResult.mondaySynced;
    mondayError = leadResult.mondayError ?? undefined;
    mondayFileOk = Boolean(pdfBuffer && leadResult.mondaySynced);
    mondayDetail.item = {
      ok: leadResult.mondaySynced,
      itemId: mondayItemId,
      itemTitle: payload.fullName,
      leadId: leadResult.lead.id,
      syncStatus: leadResult.lead.syncStatus,
      mappedFields: mondayWireFieldManifest().map(
        (entry) =>
          `${entry.field}→${entry.target === 'item_name' ? 'item_name' : entry.columnId ?? 'column'}`,
      ),
      fiveFieldWire,
      transportMetrics: metrics,
    };
    mondayDetail.fileUpload = {
      ok: mondayFileOk,
      skipped: !pdfBuffer,
      reason: pdfBuffer ? undefined : 'pdf_not_provided',
    };
    if (mondayError === 'MONDAY_API_KEY is not configured.') {
      mondaySkipped = true;
    }
  } catch (err) {
    const errMeta =
      err && typeof err === 'object'
        ? (err as { metrics?: Record<string, unknown>; lead?: { id: string; syncStatus: string } })
        : undefined;
    const transportMetrics = errMeta?.metrics;
    const persistedLead = errMeta?.lead;
    console.error('❌ MONDAY ROUTING FAILURE:', err, { transportMetrics, persistedLead });
    mondayError = providerErrorMessage(err);
    mondayDetail.item = {
      ok: false,
      error: mondayError,
      fiveFieldWire,
      transportMetrics,
      leadId: persistedLead?.id,
      syncStatus: persistedLead?.syncStatus ?? 'pending_sync',
    };
    mondayDetail.fileUpload = {
      ok: false,
      skipped: true,
      reason: pdfBuffer ? 'sync_failed' : 'pdf_not_provided',
    };
  }

  const mondayResult: RelayServiceResult = {
    service: 'monday',
    ok: mondayItemOk,
    skipped: mondaySkipped,
    reason: mondaySkipped ? 'monday_not_configured' : undefined,
    error: mondayItemOk ? undefined : mondayError,
    detail: mondayDetail,
  };

  const supabaseDetail: Record<string, unknown> = {};
  let supabaseOk = false;
  let supabaseSkipped = false;
  let supabaseError: string | undefined;
  let supabasePdfUrl: string | undefined;

  try {
    if (pdfBuffer) {
      const archiveResult = await executeSupabaseArchiveTask(payload, pdfBuffer);
      supabasePdfUrl = archiveResult.pdfUrl;
      supabaseOk = true;
      supabaseDetail.archive = {
        ok: true,
        ...archiveResult,
        mappedColumns: [
          'full_name',
          'user_email',
          'user_phone',
          'national_id',
          'corporate_tax_id',
          'pdf_url',
        ],
      };
    } else {
      const insertResult = await executeSupabaseInsertTask(payload, '');
      supabaseOk = true;
      supabaseDetail.archive = {
        ok: true,
        ...insertResult,
        textOnly: true,
        mappedColumns: [
          'full_name',
          'user_email',
          'user_phone',
          'national_id',
          'corporate_tax_id',
        ],
      };
    }
  } catch (err) {
    console.error('DEBUG: SUPABASE_ARCHIVE EXECUTION ERROR:', err);
    supabaseError = providerErrorMessage(err);
    supabaseDetail.archive = { ok: false, error: supabaseError };
    if (supabaseError === 'supabase_service_role_not_configured') {
      supabaseSkipped = true;
    }
  }

  const supabaseResult: RelayServiceResult = {
    service: 'supabase',
    ok: supabaseOk,
    skipped: supabaseSkipped && !supabaseOk,
    reason: supabaseSkipped ? 'supabase_service_role_not_configured' : undefined,
    error: supabaseOk ? undefined : supabaseError ?? 'supabase_archive_failed',
    detail: supabaseDetail,
  };

  const resendResult = await runIsolatedResendRelay(body, payload);

  const whatsappResult = await runIsolatedWhatsAppRelay(
    payload,
    pdfBuffer,
    supabasePdfUrl ?? null,
  );

  const results: BackupRelayResponse['results'] = {
    monday: mondayResult,
    supabase: supabaseResult,
    resend: resendResult,
    whatsapp: whatsappResult,
  };

  console.log('DEBUG: backup-relay Monday-primary complete', {
    mondayItemOk,
    mondayFileOk,
    supabaseOk,
    resendOk: resendResult.ok,
    whatsappOk: whatsappResult.ok,
  });

  const mondayLeadRegistered = mondayItemOk;

  return NextResponse.json(
    {
      ok: true,
      mondayLeadRegistered,
      receivedAt: new Date().toISOString(),
      results,
      fiveFieldWire,
      mondayFieldManifest: mondayWireFieldManifest(),
      pdfReceived: Boolean(pdfBuffer),
      pdfBufferBytes: pdfBuffer?.byteLength ?? 0,
    } satisfies BackupRelayResponse & {
      mondayLeadRegistered: boolean;
      fiveFieldWire: ReturnType<typeof snapshotMondayFiveFields>;
      mondayFieldManifest: ReturnType<typeof mondayWireFieldManifest>;
      pdfReceived: boolean;
      pdfBufferBytes: number;
    },
    { status: 200 },
  );
}

function buildEmptyFailureResults(reason: string): BackupRelayResponse['results'] {
  return {
    monday: { service: 'monday', ok: false, skipped: true, reason },
    supabase: { service: 'supabase', ok: false, skipped: true, reason },
    resend: { service: 'resend', ok: false, skipped: true, reason },
    whatsapp: { service: 'whatsapp', ok: false, skipped: true, reason },
  };
}

export function GET() {
  return appRouteMethodNotAllowed(['POST']);
}
