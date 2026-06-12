import type { NextApiRequest, NextApiResponse } from 'next';
import * as crypto from 'node:crypto';
import {
  AUTH_SESSION_TTL_SECONDS,
  SessionTokenService,
  type AuthSessionResponse,
} from '../../../lib/auth/session_token_service';
import { runPagesApi, sendPagesJsonError } from '../../../lib/api/http';

const MOCK_OTP_TTL_SECONDS = 600;

type WhatsAppBody = {
  phone?: string;
  code?: string;
  action?: string;
};

function normalizePhoneE164(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) {
    return '';
  }
  if (input.trim().startsWith('+')) {
    return `+${digits}`;
  }
  if (digits.startsWith('972')) {
    return `+${digits}`;
  }
  if (digits.startsWith('0') && digits.length >= 9) {
    return `+972${digits.slice(1)}`;
  }
  return `+${digits}`;
}

function resolveAction(
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

function mockWorkspaceFromPhone(phoneE164: string): {
  userId: string;
  organizationId: string;
  email: string;
} {
  const digits = phoneE164.replace(/\D/g, '');
  const digest = crypto.createHash('sha256').update(phoneE164).digest('hex');
  const userId = [
    digest.slice(0, 8),
    digest.slice(8, 12),
    `4${digest.slice(13, 16)}`,
    `8${digest.slice(17, 20)}`,
    digest.slice(20, 32),
  ].join('-');
  const orgDigest = crypto.createHash('sha256').update(`org:${phoneE164}`).digest('hex');
  const organizationId = [
    orgDigest.slice(0, 8),
    orgDigest.slice(8, 12),
    `4${orgDigest.slice(13, 16)}`,
    `8${orgDigest.slice(17, 20)}`,
    orgDigest.slice(20, 32),
  ].join('-');
  const email = `wa+${digits}@users.valubot.app`;
  return { userId, organizationId, email };
}

function handleMockRequestOtp(phone: string, res: NextApiResponse): void {
  const phoneE164 = normalizePhoneE164(phone);
  if (!phoneE164) {
    sendPagesJsonError(res, 400, 'Phone number is required.', 'VALIDATION_ERROR');
    return;
  }
  res.status(200).json({ expiresInSeconds: MOCK_OTP_TTL_SECONDS });
}

function handleMockVerifyOtp(
  phone: string,
  code: string,
  res: NextApiResponse,
): void {
  const phoneE164 = normalizePhoneE164(phone);
  if (!phoneE164) {
    sendPagesJsonError(res, 400, 'Phone number is required.', 'VALIDATION_ERROR');
    return;
  }

  const digits = code.replace(/\D/g, '');
  if (digits.length !== 4) {
    sendPagesJsonError(
      res,
      400,
      'Verification code must be 4 digits.',
      'VALIDATION_ERROR',
    );
    return;
  }

  const workspace = mockWorkspaceFromPhone(phoneE164);
  const tokenService = new SessionTokenService();
  const accessToken = tokenService.signSession({
    sub: workspace.userId,
    org: workspace.organizationId,
    email: workspace.email,
    phone: phoneE164,
  });

  const session: AuthSessionResponse = {
    accessToken,
    expiresIn: AUTH_SESSION_TTL_SECONDS,
    user: {
      id: workspace.userId,
      email: workspace.email,
      organizationId: workspace.organizationId,
      phoneE164,
    },
  };

  res.status(200).json(session);
}

/**
 * Isolated mock WhatsApp OTP — no database or connection-string parsing.
 * POST { phone } → 200 { expiresInSeconds }
 * POST { phone, code } → 200 { accessToken, user, ... } for any 4-digit code
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  await runPagesApi(req, res, ['POST'], async () => {
    const body = (req.body ?? {}) as WhatsAppBody;
    const action = resolveAction(body, req.query.action);

    if (action === 'verify') {
      if (!body.phone?.trim() || !body.code?.trim()) {
        sendPagesJsonError(res, 400, 'phone and code are required', 'VALIDATION_ERROR');
        return;
      }
      handleMockVerifyOtp(body.phone.trim(), body.code.trim(), res);
      return;
    }

    if (!body.phone?.trim()) {
      sendPagesJsonError(res, 400, 'phone is required', 'VALIDATION_ERROR');
      return;
    }
    handleMockRequestOtp(body.phone.trim(), res);
  });
}
