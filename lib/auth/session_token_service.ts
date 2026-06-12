/**
 * Passwordless session JWT after WhatsApp OTP verification.
 */

import * as crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/deployment_env';

export const AUTH_SESSION_AUDIENCE = 'valubot-auth';
export const AUTH_SESSION_ISSUER = 'valubot';
export const AUTH_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export interface AuthSessionPayload {
  sub: string;
  org: string;
  email: string;
  phone: string;
  typ: 'whatsapp_otp_session';
}

export interface AuthSessionResponse {
  accessToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    organizationId: string;
    phoneE164: string;
  };
}

export class SessionTokenService {
  signSession(payload: Omit<AuthSessionPayload, 'typ'>): string {
    const full: AuthSessionPayload = { ...payload, typ: 'whatsapp_otp_session' };
    return jwt.sign(full, getJwtSecret(), {
      expiresIn: AUTH_SESSION_TTL_SECONDS,
      issuer: AUTH_SESSION_ISSUER,
      audience: AUTH_SESSION_AUDIENCE,
    });
  }

  verifySession(token: string): AuthSessionPayload {
    const payload = jwt.verify(token, getJwtSecret(), {
      issuer: AUTH_SESSION_ISSUER,
      audience: AUTH_SESSION_AUDIENCE,
    }) as AuthSessionPayload;

    if (payload.typ !== 'whatsapp_otp_session' || !payload.sub || !payload.org) {
      throw new Error('Invalid session token.');
    }
    return payload;
  }

  /** Deterministic anonymized key for ML rows — irreversible without server pepper. */
  anonymizeRunId(valuationId: string): string {
    const pepper = process.env.ML_ANONYMIZATION_PEPPER ?? getJwtSecret();
    return crypto
      .createHmac('sha256', pepper)
      .update(valuationId)
      .digest('hex');
  }
}
