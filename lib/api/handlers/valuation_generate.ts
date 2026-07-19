import { NextResponse } from 'next/server';
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  buildCalculateRequestPayload,
  type ValuationCalculateRequest,
  type ValuationLocale,
} from '../../../api_client';
import type { ValuationWizardFormValues } from '../../../ValuationWizard';
import { LiveValuationError } from '../../../valuation_live';
import { SessionTokenService } from '../../auth/session_token_service';
import { jsonError, mapThrownError, sendPagesJsonError } from '../http';
import {
  resolvePublicAppBaseUrl,
  runValuationExecutionPipeline,
  type ValuationExecutionContact,
} from '../valuation_execution';

import { VALUATION_REPORT_FILENAME } from '../../pdf/theme';
import { CLIENT_PDF_REQUIRED_MESSAGE } from '../../pdf/valuation_report_pdf';
import { scheduleProductEvent } from '../../analytics/track_event';

export const VALUATION_PDF_FILENAME = VALUATION_REPORT_FILENAME;

export function wantsValuationPdfResponse(options: {
  acceptHeader: string | null;
  formatParam: string | null;
  bodyFlag?: boolean;
  defaultPdf?: boolean;
}): boolean {
  if (options.bodyFlag === true) {
    return true;
  }
  if (options.formatParam?.toLowerCase() === 'pdf') {
    return true;
  }
  if (options.formatParam?.toLowerCase() === 'json') {
    return false;
  }
  const accept = options.acceptHeader?.toLowerCase() ?? '';
  if (accept.includes('application/json') && !accept.includes('application/pdf')) {
    return false;
  }
  if (accept.includes('application/pdf')) {
    return true;
  }
  return options.defaultPdf ?? false;
}

export function pdfAttachmentHeaders(
  filename = VALUATION_PDF_FILENAME,
): HeadersInit {
  return {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'private, no-cache',
  };
}

function mapValuationError(err: unknown): { status: number; message: string } {
  if (err instanceof LiveValuationError) {
    return { status: err.statusCode, message: err.message };
  }
  return mapThrownError(err);
}

export function resolveContactFromAuthHeader(
  authorization: string | null,
): ValuationExecutionContact {
  const bearer = authorization?.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : null;
  if (!bearer) {
    return {};
  }
  try {
    const session = new SessionTokenService().verifySession(bearer);
    return {
      email: session.email,
      phoneE164: session.phone,
    };
  } catch {
    return {};
  }
}

export async function parseValuationCalculateBody(
  request: Request,
): Promise<
  | {
      ok: true;
      body: ValuationCalculateRequest & {
        locale?: string;
        returnPdf?: boolean;
        email?: string;
        phone?: string;
      };
    }
  | { ok: false; response: NextResponse }
> {
  let body: ValuationCalculateRequest & {
    locale?: string;
    returnPdf?: boolean;
    email?: string;
    phone?: string;
  };

  try {
    const json = await request.json();
    if (json?.wizard) {
      body = json as ValuationCalculateRequest & {
        locale?: string;
        returnPdf?: boolean;
        email?: string;
        phone?: string;
      };
    } else {
      body = {
        ...buildCalculateRequestPayload(json),
        wizard: json,
      };
    }
  } catch {
    return {
      ok: false,
      response: jsonError('Invalid JSON body', 400, 'INVALID_JSON'),
    };
  }

  if (!body.wizard?.companyName) {
    return {
      ok: false,
      response: jsonError('wizard.companyName is required', 400, 'VALIDATION_ERROR'),
    };
  }

  return { ok: true, body };
}

export async function executeValuationGenerate(
  body: ValuationCalculateRequest & {
    locale?: string;
    email?: string;
    phone?: string;
  },
  returnPdf: boolean,
  options?: { request?: Request; contact?: ValuationExecutionContact },
): Promise<NextResponse> {
  try {
    const contact: ValuationExecutionContact = {
      email: options?.contact?.email ?? body.email ?? null,
      phoneE164: options?.contact?.phoneE164 ?? body.phone ?? null,
    };
    const baseUrl = resolvePublicAppBaseUrl(options?.request);
    const execution = await runValuationExecutionPipeline({
      body,
      contact,
      baseUrl,
    });

    if (returnPdf) {
      return jsonError(CLIENT_PDF_REQUIRED_MESSAGE, 410, 'CLIENT_PDF_REQUIRED');
    }

    const analysis = execution.forecast_matrix_json.multiples_analysis;

    scheduleProductEvent({
      eventType: 'report_created',
      metadata: {
        valuationId: execution.valuationId,
        companyName: execution.companyName,
        locale: execution.locale,
        source: 'valuation/calculate',
      },
    });

    return NextResponse.json(
      {
        status: 'completed',
        valuationId: execution.valuationId,
        entitlement: 'on_demand_token',
        forecast_matrix_json: execution.forecast_matrix_json,
        pdfDownloadUrl: execution.pdfDownloadUrl,
        stage: analysis?.lifecycleStage ?? null,
        valuationRange: analysis?.valuationRange ?? null,
        selectedMultiple: analysis?.selectedMultiple ?? null,
        multiplesUsed: analysis?.multiplesUsed ?? null,
        payment: {
          verified: true,
          gatewayTransactionId: `txn_mvp_${execution.valuationId.slice(0, 8)}`,
          gatewaySaleId: `sale_mvp_${execution.valuationId.slice(0, 8)}`,
          amount: 99,
          currency: 'ILS',
          status: 'success',
        },
      },
      { status: 200 },
    );
  } catch (err) {
    const { status, message } = mapValuationError(err);
    return jsonError(message, status);
  }
}

/** App Router POST `/api/v1/valuation/calculate` */
export async function handleValuationCalculatePost(
  request: Request,
): Promise<NextResponse> {
  const parsed = await parseValuationCalculateBody(request);
  if (!parsed.ok) {
    return parsed.response;
  }

  const url = new URL(request.url);
  const returnPdf = wantsValuationPdfResponse({
    acceptHeader: request.headers.get('accept'),
    formatParam: url.searchParams.get('format'),
    bodyFlag: parsed.body.returnPdf === true,
    defaultPdf: false,
  });

  const contact = resolveContactFromAuthHeader(request.headers.get('authorization'));

  return executeValuationGenerate(parsed.body, returnPdf, { request, contact });
}

type PagesValuationBody = ValuationCalculateRequest & {
  locale?: string;
  returnPdf?: boolean;
  email?: string;
  phone?: string;
};

/** Pages Router: `/api/valuation/generate` */
export async function handlePagesValuationGenerate(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  const body = (req.body ?? {}) as PagesValuationBody;
  let payload: ValuationCalculateRequest & {
    locale?: string;
    email?: string;
    phone?: string;
  };

  if (body?.wizard) {
    payload = body;
  } else if (body && typeof body === 'object' && 'companyName' in body) {
    const wizard = body as unknown as ValuationWizardFormValues;
    payload = {
      ...buildCalculateRequestPayload(wizard),
      wizard,
      locale: body.locale,
      email: body.email,
      phone: body.phone,
    };
  } else {
    sendPagesJsonError(res, 400, 'Invalid valuation payload', 'VALIDATION_ERROR');
    return;
  }

  if (!payload.wizard?.companyName) {
    sendPagesJsonError(res, 400, 'wizard.companyName is required', 'VALIDATION_ERROR');
    return;
  }

  const returnPdf = wantsValuationPdfResponse({
    acceptHeader: typeof req.headers.accept === 'string' ? req.headers.accept : null,
    formatParam:
      typeof req.query.format === 'string' ? req.query.format : null,
    bodyFlag: body.returnPdf === true,
    defaultPdf: false,
  });

  const authHeader =
    typeof req.headers.authorization === 'string'
      ? req.headers.authorization
      : null;
  const contact = resolveContactFromAuthHeader(authHeader);

  try {
    const baseUrl = resolvePublicAppBaseUrl();
    const execution = await runValuationExecutionPipeline({
      body: payload,
      contact: {
        email: contact.email ?? payload.email ?? null,
        phoneE164: contact.phoneE164 ?? payload.phone ?? null,
      },
      baseUrl,
    });

    if (returnPdf) {
      sendPagesJsonError(
        res,
        410,
        CLIENT_PDF_REQUIRED_MESSAGE,
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
    });
  } catch (err) {
    const { status, message } = mapValuationError(err);
    sendPagesJsonError(res, status, message);
  }
}
