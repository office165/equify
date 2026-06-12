/**
 * WhatsApp OTP authentication — 4-digit code, passwordless login.
 */

import * as crypto from 'node:crypto';
import type { Pool } from 'pg';
import { WhatsAppGateway } from '../gateway/whatsapp_gateway';
import {
  getOtpDevBypassCode,
  getWhatsAppProvider,
  isWhatsAppOtpMockMode,
} from '../config/deployment_env';
import {
  SessionTokenService,
  type AuthSessionResponse,
} from './session_token_service';

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_LENGTH = 4;
const RESEND_COOLDOWN_MS = 60 * 1000;

export class WhatsAppOtpError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message);
    this.name = 'WhatsAppOtpError';
  }
}

export function normalizePhoneE164(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) {
    throw new WhatsAppOtpError('Phone number is required.');
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

function generateOtpCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function hashOtp(code: string, sessionId: string): string {
  const secret = process.env.OTP_HMAC_SECRET ?? process.env.JWT_SECRET ?? 'otp-dev';
  return crypto.createHmac('sha256', secret).update(`${sessionId}:${code}`).digest('hex');
}

export class WhatsAppOtpAuthService {
  private readonly sessions = new SessionTokenService();
  private readonly whatsapp = new WhatsAppGateway();

  constructor(private readonly pool: Pool) {}

  async requestOtp(rawPhone: string): Promise<{ expiresInSeconds: number }> {
    const phoneE164 = normalizePhoneE164(rawPhone);

    const recent = await this.pool.query<{ created_at: Date }>(
      `SELECT created_at FROM whatsapp_otp_sessions
       WHERE phone_e164 = $1 AND consumed_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [phoneE164],
    );
    if (recent.rows[0]) {
      const elapsed = Date.now() - recent.rows[0].created_at.getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        throw new WhatsAppOtpError('Please wait before requesting another code.', 429);
      }
    }

    const code = isWhatsAppOtpMockMode() ? getOtpDevBypassCode() : generateOtpCode();
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await this.pool.query(
      `INSERT INTO whatsapp_otp_sessions (
         id, phone_e164, otp_hash, expires_at, provider, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        sessionId,
        phoneE164,
        hashOtp(code, sessionId),
        expiresAt,
        getWhatsAppProvider(),
        JSON.stringify({ otp_length: OTP_LENGTH }),
      ],
    );

    if (!isWhatsAppOtpMockMode()) {
      await this.whatsapp.sendOtpMessage(phoneE164, code);
    }

    return { expiresInSeconds: Math.floor(OTP_TTL_MS / 1000) };
  }

  async verifyOtp(rawPhone: string, code: string): Promise<AuthSessionResponse> {
    const phoneE164 = normalizePhoneE164(rawPhone);
    const trimmed = code.replace(/\D/g, '');
    if (trimmed.length !== OTP_LENGTH) {
      throw new WhatsAppOtpError('Verification code must be 4 digits.');
    }

    const { rows } = await this.pool.query<{
      id: string;
      otp_hash: string;
      expires_at: Date;
      attempt_count: number;
      max_attempts: number;
    }>(
      `SELECT id, otp_hash, expires_at, attempt_count, max_attempts
       FROM whatsapp_otp_sessions
       WHERE phone_e164 = $1 AND consumed_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [phoneE164],
    );

    const session = rows[0];

    if (isWhatsAppOtpMockMode()) {
      if (!session) {
        const mockSessionId = crypto.randomUUID();
        await this.pool.query(
          `INSERT INTO whatsapp_otp_sessions (
             id, phone_e164, otp_hash, expires_at, provider, metadata,
             verified_at, consumed_at
           ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), NOW())`,
          [
            mockSessionId,
            phoneE164,
            hashOtp(trimmed, mockSessionId),
            new Date(Date.now() + OTP_TTL_MS),
            getWhatsAppProvider(),
            JSON.stringify({ otp_length: OTP_LENGTH, mock_bypass: true }),
          ],
        );
      } else {
        await this.pool.query(
          `UPDATE whatsapp_otp_sessions
           SET verified_at = NOW(), consumed_at = NOW()
           WHERE id = $1`,
          [session.id],
        );
      }
    } else {
      if (!session) {
        throw new WhatsAppOtpError('No active verification session. Request a new code.');
      }

      if (session.expires_at.getTime() <= Date.now()) {
        throw new WhatsAppOtpError('Verification code expired.', 401);
      }

      if (session.attempt_count >= session.max_attempts) {
        throw new WhatsAppOtpError('Too many attempts. Request a new code.', 429);
      }

      const expectedHash = hashOtp(trimmed, session.id);
      const a = Buffer.from(expectedHash);
      const b = Buffer.from(session.otp_hash);
      const valid = a.length === b.length && crypto.timingSafeEqual(a, b);

      if (!valid) {
        await this.pool.query(
          `UPDATE whatsapp_otp_sessions
           SET attempt_count = attempt_count + 1
           WHERE id = $1`,
          [session.id],
        );
        throw new WhatsAppOtpError('Invalid verification code.', 401);
      }

      await this.pool.query(
        `UPDATE whatsapp_otp_sessions
         SET verified_at = NOW(), consumed_at = NOW()
         WHERE id = $1`,
        [session.id],
      );
    }

    const workspace = await this.ensureUserForPhone(phoneE164);
    const accessToken = this.sessions.signSession({
      sub: workspace.userId,
      org: workspace.organizationId,
      email: workspace.email,
      phone: phoneE164,
    });

    return {
      accessToken,
      expiresIn: 60 * 60 * 24 * 30,
      user: {
        id: workspace.userId,
        email: workspace.email,
        organizationId: workspace.organizationId,
        phoneE164,
      },
    };
  }

  private async ensureUserForPhone(phoneE164: string): Promise<{
    userId: string;
    organizationId: string;
    email: string;
  }> {
    const existing = await this.pool.query<{
      id: string;
      email: string;
      organization_id: string;
    }>(
      `SELECT u.id, u.email::text AS email, om.organization_id
       FROM users u
       INNER JOIN organization_members om ON om.user_id = u.id
       WHERE u.phone_e164 = $1 AND u.deleted_at IS NULL
       LIMIT 1`,
      [phoneE164],
    );

    if (existing.rows[0]) {
      await this.pool.query(
        `UPDATE users SET phone_verified_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [existing.rows[0].id],
      );
      return {
        userId: existing.rows[0].id,
        organizationId: existing.rows[0].organization_id,
        email: existing.rows[0].email,
      };
    }

    const userId = crypto.randomUUID();
    const orgId = crypto.randomUUID();
    const slug = `user-${phoneE164.replace(/\D/g, '').slice(-8)}`;
    const email = `wa+${phoneE164.replace(/\D/g, '')}@users.valubot.app`;

    await this.pool.query('BEGIN');
    try {
      await this.pool.query(
        `INSERT INTO organizations (id, name, slug, billing_email)
         VALUES ($1, $2, $3, $4)`,
        [orgId, `Equify ${phoneE164}`, slug, email],
      );
      await this.pool.query(
        `INSERT INTO users (id, email, full_name, phone_e164, phone_verified_at, email_verified_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [userId, email, phoneE164, phoneE164],
      );
      await this.pool.query(
        `INSERT INTO organization_members (organization_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [orgId, userId],
      );
      await this.pool.query('COMMIT');
    } catch (err) {
      await this.pool.query('ROLLBACK');
      throw err;
    }

    return { userId, organizationId: orgId, email };
  }
}
