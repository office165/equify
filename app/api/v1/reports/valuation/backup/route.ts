import { NextResponse } from 'next/server';
import { archiveValuationReport } from '../../../../../../lib/backup/archive_valuation_report';
import { scheduleValuationEmailBackup } from '../../../../../../lib/backup/schedule_valuation_dual_backup';
import { getValuationDualBackupAvailability } from '../../../../../../lib/backup/run_valuation_dual_backup';
import {
  parseValuationBackupBody,
  type ValuationBackupRequestBody,
} from '../../../../../../lib/backup/parse_valuation_backup_body';
import { runSupabaseStartupCheck } from '../../../../../../lib/db/supabase';
import { appRouteMethodNotAllowed, jsonError } from '../../../../../../lib/api/http';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** @deprecated Prefer POST /api/valuation/generate-pdf */
export async function POST(request: Request) {
  runSupabaseStartupCheck();

  let body: ValuationBackupRequestBody;
  try {
    body = (await request.json()) as ValuationBackupRequestBody;
  } catch {
    return jsonError('Invalid JSON body.', 400, 'INVALID_JSON');
  }

  const payload = parseValuationBackupBody(body);
  if (!payload) {
    return jsonError('Backup payload failed validation.', 400, 'INVALID_BACKUP');
  }

  const availability = getValuationDualBackupAvailability();
  if (!availability.email && !availability.supabase) {
    return NextResponse.json({
      ok: true,
      queued: false,
      reason: 'backup_not_configured',
      availability,
    });
  }

  let supabaseResult: Awaited<ReturnType<typeof archiveValuationReport>> | null = null;

  if (availability.supabase) {
    try {
      console.log('Supabase backup initiated...');
      supabaseResult = await archiveValuationReport(
        payload.userEmail,
        payload.userPhone,
        payload.valuationMidPoint,
        payload.pdfBase64,
        {
          userId: payload.userId,
          userCorporateTaxId: payload.userCorporateTaxId,
          currency: payload.currency,
          valuationId: payload.valuationId,
        },
      );
    } catch (error) {
      console.error('SUPABASE BACKUP FAILED DIRECT ERROR:', error);
      return NextResponse.json(
        {
          ok: false,
          error: 'supabase_backup_failed',
          message:
            error instanceof Error ? error.message : 'Supabase backup failed.',
          availability,
        },
        { status: 500 },
      );
    }
  }

  if (availability.email) {
    scheduleValuationEmailBackup(payload);
  }

  return NextResponse.json(
    {
      ok: true,
      queued: Boolean(availability.email),
      supabaseSaved: Boolean(supabaseResult),
      supabase: supabaseResult,
      availability,
    },
    { status: availability.supabase ? 200 : 202 },
  );
}

export function GET() {
  return appRouteMethodNotAllowed(['POST']);
}
