import { NextResponse } from 'next/server';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getLiveDatabasePool } from '../../../valuation_live';
import {
  WhatsAppOtpAuthService,
  WhatsAppOtpError,
} from '../../auth/whatsapp_otp_service';
import {
  jsonError,
  mapThrownError,
  sendPagesJsonError,
} from '../http';

function getService(): WhatsAppOtpAuthService {
  return new WhatsAppOtpAuthService(getLiveDatabasePool());
}

function mapWhatsAppError(err: unknown): { status: number; message: string } {
  if (err instanceof WhatsAppOtpError) {
    return { status: err.statusCode, message: err.message };
  }
  return mapThrownError(err);
}

export async function handleWhatsAppRequestOtp(
  phone: string | undefined,
): Promise<NextResponse> {
  if (!phone?.trim()) {
    return jsonError('phone is required', 400, 'VALIDATION_ERROR');
  }
  try {
    const result = await getService().requestOtp(phone.trim());
    return NextResponse.json(result);
  } catch (err) {
    const { status, message } = mapWhatsAppError(err);
    return jsonError(message, status);
  }
}

export async function handleWhatsAppVerifyOtp(
  phone: string | undefined,
  code: string | undefined,
): Promise<NextResponse> {
  if (!phone?.trim() || !code?.trim()) {
    return jsonError('phone and code are required', 400, 'VALIDATION_ERROR');
  }
  try {
    const session = await getService().verifyOtp(phone.trim(), code.trim());
    return NextResponse.json(session);
  } catch (err) {
    const { status, message } = mapWhatsAppError(err);
    return jsonError(message, status);
  }
}

type WhatsAppBody = {
  phone?: string;
  code?: string;
  action?: string;
};

function resolveWhatsAppAction(
  body: WhatsAppBody,
  queryAction?: string | string[],
): 'request' | 'verify' {
  const raw =
    (typeof queryAction === 'string' ? queryAction : queryAction?.[0]) ??
    body.action ??
    '';
  const action = raw.toLowerCase();
  if (action === 'verify' || action === 'verify-otp') {
    return 'verify';
  }
  if (action === 'request' || action === 'request-otp') {
    return 'request';
  }
  if (body.code?.trim()) {
    return 'verify';
  }
  return 'request';
}

/** App Router: unified WhatsApp auth POST (legacy-compatible). */
export async function handleWhatsAppAuthPost(
  request: Request,
): Promise<NextResponse> {
  let body: WhatsAppBody;
  try {
    body = (await request.json()) as WhatsAppBody;
  } catch {
    return jsonError('Invalid JSON body', 400, 'INVALID_JSON');
  }

  const url = new URL(request.url);
  const action = resolveWhatsAppAction(body, url.searchParams.get('action') ?? undefined);

  if (action === 'verify') {
    return handleWhatsAppVerifyOtp(body.phone, body.code);
  }
  return handleWhatsAppRequestOtp(body.phone);
}

/** Pages Router: `/api/auth/whatsapp` */
export async function handlePagesWhatsAppAuth(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  const body = (req.body ?? {}) as WhatsAppBody;
  const action = resolveWhatsAppAction(body, req.query.action);

  try {
    if (action === 'verify') {
      if (!body.phone?.trim() || !body.code?.trim()) {
        sendPagesJsonError(res, 400, 'phone and code are required', 'VALIDATION_ERROR');
        return;
      }
      const session = await getService().verifyOtp(
        body.phone.trim(),
        body.code.trim(),
      );
      res.status(200).json(session);
      return;
    }
    if (!body.phone?.trim()) {
      sendPagesJsonError(res, 400, 'phone is required', 'VALIDATION_ERROR');
      return;
    }
    const result = await getService().requestOtp(body.phone.trim());
    res.status(200).json(result);
  } catch (err) {
    const { status, message } = mapWhatsAppError(err);
    sendPagesJsonError(res, status, message);
  }
}
