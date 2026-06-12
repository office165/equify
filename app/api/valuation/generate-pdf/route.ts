import { NextResponse } from 'next/server';
import type { ValuationLocale } from '../../../../api_client';
import type { ForecastMatrixWithDiagnostics } from '../../../../valuation_forecast';
import { archiveValuationReport } from '../../../../lib/backup/archive_valuation_report';
import { getValuationDualBackupAvailability } from '../../../../lib/backup/run_valuation_dual_backup';
import {
  parseValuationBackupBody,
  type ValuationBackupRequestBody,
} from '../../../../lib/backup/parse_valuation_backup_body';
import { sanitizePdfBase64 } from '../../../../lib/backup/sanitize_pdf_base64';
import { runSupabaseStartupCheck } from '../../../../lib/db/supabase';
import { CLIENT_PDF_REQUIRED_MESSAGE } from '../../../../lib/pdf/valuation_report_pdf';
import { sendValuationPdfBackupEmail } from '../../../../lib/pdf/valuation_pdf_backup_email';
import { appRouteMethodNotAllowed, jsonError } from '../../../../lib/api/http';

export const runtime = 'nodejs';
export const maxDuration = 60;

type BackupTaskResult =
  | { provider: 'supabase'; result: Awaited<ReturnType<typeof archiveValuationReport>> }
  | { provider: 'resend'; result: Awaited<ReturnType<typeof sendValuationPdfBackupEmail>> };

type GeneratePdfRequestBody = ValuationBackupRequestBody & {
  forecastMatrix?: ForecastMatrixWithDiagnostics;
  locale?: ValuationLocale;
};

function resolvePdfBuffer(body: GeneratePdfRequestBody): Buffer {
  const normalizedBase64 = body.pdfBase64?.trim()
    ? sanitizePdfBase64(String(body.pdfBase64))
    : '';

  if (!normalizedBase64) {
    throw new Error(
      `pdfBase64 is required. ${CLIENT_PDF_REQUIRED_MESSAGE}`,
    );
  }

  const pdfBuffer = Buffer.from(normalizedBase64, 'base64');
  if (!pdfBuffer.length) {
    throw new Error('Decoded PDF buffer is empty.');
  }
  return pdfBuffer;
}

/**
 * Client-side PDF is generated in the browser; this route decodes the payload buffer,
 * then persists dual backup (Supabase Storage/DB + optional Resend email).
 */
export async function POST(request: Request) {
  console.log('DEBUG: POST /api/valuation/generate-pdf — handler entered');

  try {
    runSupabaseStartupCheck();

    let body: GeneratePdfRequestBody;
    try {
      body = (await request.json()) as GeneratePdfRequestBody;
      console.log('DEBUG: API Route Triggered. Payload received:', body);
    } catch (parseError) {
      console.error('DEBUG: JSON PARSE ERROR:', parseError);
      return jsonError('Invalid JSON body.', 400, 'INVALID_JSON');
    }

    console.log('DEBUG: Initiating PDF Generation Engine...');
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = resolvePdfBuffer(body);
      console.log(
        'DEBUG: PDF Generation Finished successfully. Buffer length:',
        pdfBuffer.length,
      );
    } catch (pdfError) {
      console.error('DEBUG: PDF BUFFER PREPARATION ERROR:', pdfError);
      return NextResponse.json(
        {
          ok: false,
          error: 'pdf_buffer_failed',
          message:
            pdfError instanceof Error
              ? pdfError.message
              : 'PDF buffer preparation failed.',
        },
        { status: 400 },
      );
    }

    const backupBody: ValuationBackupRequestBody = {
      ...body,
      pdfBase64: pdfBuffer.toString('base64'),
    };
    const payload = parseValuationBackupBody(backupBody);
    if (!payload) {
      console.error('DEBUG: Payload validation failed', {
        hasUserEmail: Boolean(body.userEmail?.trim()),
        hasUserPhone: Boolean(body.userPhone?.trim()),
        hasUserId: Boolean(body.userId?.trim()),
        pdfBufferLength: pdfBuffer.length,
      });
      return jsonError('Backup payload failed validation.', 400, 'INVALID_BACKUP');
    }

    const availability = getValuationDualBackupAvailability();
    console.log('DEBUG: Backup provider availability', availability);

    if (!availability.email && !availability.supabase) {
      console.warn(
        'DEBUG: No backup providers configured — aborting before parallel launch',
        availability,
      );
      return NextResponse.json({
        ok: true,
        queued: false,
        reason: 'backup_not_configured',
        availability,
        pdfBufferLength: pdfBuffer.length,
      });
    }

    console.log('DEBUG: Launching Supabase and Resend parallel promises...');

    const backupTasks: Promise<BackupTaskResult>[] = [];

    if (availability.supabase) {
      backupTasks.push(
        archiveValuationReport(
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
        )
          .then((result) => {
            console.log('DEBUG: Supabase promise resolved', {
              storagePath: result.storagePath,
              historyRowId: result.historyRowId,
            });
            return { provider: 'supabase' as const, result };
          })
          .catch((error) => {
            console.error('SUPABASE BACKUP FAILED DIRECT ERROR:', error);
            throw error;
          }),
      );
    }

    if (availability.email) {
      backupTasks.push(
        (async (): Promise<BackupTaskResult> => {
          try {
            const result = await sendValuationPdfBackupEmail(payload);
            console.log('DEBUG: Resend promise resolved', result);
            return { provider: 'resend', result };
          } catch (mailError) {
            console.error('DEBUG: RESEND SPECIFIC ERROR:', mailError);
            throw mailError;
          }
        })(),
      );
    }

    const settled = await Promise.allSettled(backupTasks);

    settled.forEach((outcome, index) => {
      if (outcome.status === 'fulfilled') {
        console.log(`DEBUG: Backup task ${index} fulfilled`, outcome.value);
      } else {
        console.error(`DEBUG: Backup task ${index} rejected`, outcome.reason);
      }
    });

    const failures = settled.filter((r) => r.status === 'rejected');
    const successes = settled.filter(
      (r): r is PromiseFulfilledResult<BackupTaskResult> => r.status === 'fulfilled',
    );

    const supabaseOutcome = successes.find((s) => s.value.provider === 'supabase');
    const resendOutcome = successes.find((s) => s.value.provider === 'resend');

    if (failures.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'backup_partial_or_total_failure',
          pdfBufferLength: pdfBuffer.length,
          availability,
          failures: failures.map((f) =>
            f.status === 'rejected'
              ? f.reason instanceof Error
                ? f.reason.message
                : String(f.reason)
              : 'unknown',
          ),
          supabase: supabaseOutcome?.value.result ?? null,
          resend: resendOutcome?.value.result ?? null,
        },
        { status: 500 },
      );
    }

    console.log('DEBUG: All backup tasks completed successfully');

    return NextResponse.json(
      {
        ok: true,
        pdfBufferLength: pdfBuffer.length,
        availability,
        supabaseSaved: Boolean(supabaseOutcome),
        resendDelivered: Boolean(resendOutcome),
        supabase: supabaseOutcome?.value.result ?? null,
        resend: resendOutcome?.value.result ?? null,
      },
      { status: 200 },
    );
  } catch (fatalError) {
    console.error('DEBUG: UNHANDLED ROUTE FATAL ERROR:', fatalError);
    return NextResponse.json(
      {
        ok: false,
        error: 'route_fatal_error',
        message:
          fatalError instanceof Error ? fatalError.message : 'Unhandled route error.',
      },
      { status: 500 },
    );
  }
}

export function GET() {
  return appRouteMethodNotAllowed(['POST']);
}
