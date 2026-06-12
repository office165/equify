import type { NextApiRequest, NextApiResponse } from 'next';
import {
  buildCalculateRequestPayload,
  type ValuationCalculateRequest,
} from '../../../api_client';
import type { ValuationWizardFormValues } from '../../../ValuationWizard';
import { mapThrownError, runPagesApi, sendPagesJsonError } from '../../../lib/api/http';
import {
  resolveContactFromAuthHeader,
  VALUATION_PDF_FILENAME,
  wantsValuationPdfResponse,
} from '../../../lib/api/handlers/valuation_generate';
import {
  resolvePublicAppBaseUrl,
  runValuationExecutionPipeline,
} from '../../../lib/api/valuation_execution';
import { LiveValuationError } from '../../../valuation_live';

type GenerateBody = ValuationCalculateRequest & {
  locale?: string;
  returnPdf?: boolean;
  email?: string;
  phone?: string;
};

function parseGenerateBody(
  req: NextApiRequest,
):
  | { ok: true; payload: GenerateBody }
  | { ok: false; message: string } {
  const body = (req.body ?? {}) as GenerateBody;

  if (body?.wizard) {
    if (!body.wizard.companyName) {
      return { ok: false, message: 'wizard.companyName is required' };
    }
    return { ok: true, payload: body };
  }

  if (body && typeof body === 'object' && 'companyName' in body) {
    const wizard = body as unknown as ValuationWizardFormValues;
    const payload: GenerateBody = {
      ...buildCalculateRequestPayload(wizard),
      wizard,
      locale: body.locale,
      email: body.email,
      phone: body.phone,
      returnPdf: body.returnPdf,
    };
    if (!payload.wizard?.companyName) {
      return { ok: false, message: 'wizard.companyName is required' };
    }
    return { ok: true, payload };
  }

  return { ok: false, message: 'Invalid valuation payload' };
}

/**
 * Valuation generate — instant browser PDF + non-blocking marketing dispatch.
 *
 * 1. Persist inputs & compile valuation (Supabase)
 * 2. Stream PDF to client immediately
 * 3. Background: premium HTML email (Resend/SendGrid) + WhatsApp with PDF link
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  await runPagesApi(req, res, ['POST'], async () => {
    const parsed = parseGenerateBody(req);
    if (!parsed.ok) {
      sendPagesJsonError(res, 400, parsed.message, 'VALIDATION_ERROR');
      return;
    }

    const authHeader =
      typeof req.headers.authorization === 'string'
        ? req.headers.authorization
        : null;
    const sessionContact = resolveContactFromAuthHeader(authHeader);
    const contact = {
      email: sessionContact.email ?? parsed.payload.email ?? null,
      phoneE164: sessionContact.phoneE164 ?? parsed.payload.phone ?? null,
    };

    const returnPdf = wantsValuationPdfResponse({
      acceptHeader: typeof req.headers.accept === 'string' ? req.headers.accept : null,
      formatParam:
        typeof req.query.format === 'string' ? req.query.format : null,
      bodyFlag: parsed.payload.returnPdf === true,
      defaultPdf: false,
    });

    let execution;
    try {
      execution = await runValuationExecutionPipeline({
        body: parsed.payload,
        contact,
        baseUrl: resolvePublicAppBaseUrl(),
      });
    } catch (err) {
      const status =
        err instanceof LiveValuationError ? err.statusCode : mapThrownError(err).status;
      const message =
        err instanceof Error ? err.message : mapThrownError(err).message;
      sendPagesJsonError(res, status, message);
      return;
    }

    if (returnPdf) {
      sendPagesJsonError(
        res,
        410,
        'Valuation PDFs must be downloaded from the live dashboard. Server-side PDF generation is disabled.',
        'CLIENT_PDF_REQUIRED',
      );
      return;
    }

    res.status(200).json({
      status: 'completed',
      valuationId: execution.valuationId,
      entitlement: 'on_demand_token',
      forecast_matrix_json: execution.forecast_matrix_json,
      pdfDownloadUrl: execution.pdfDownloadUrl,
      payment: {
        verified: true,
        gatewayTransactionId: `txn_mvp_${execution.valuationId.slice(0, 8)}`,
        gatewaySaleId: `sale_mvp_${execution.valuationId.slice(0, 8)}`,
        amount: 99,
        currency: 'ILS',
        status: 'success',
      },
    });
  });
}
