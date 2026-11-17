/**
 * Signed report access token (JWT, JWT_SECRET). Minted after a paid or promo delivery and
 * required by /api/generate-pdf and /api/generate-html when PAYWALL_V2=on.
 */
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/deployment_env';

export const REPORT_ACCESS_AUDIENCE = 'equify-report-access';
export const REPORT_ACCESS_ISSUER = 'equify';
export const REPORT_ACCESS_TTL_SECONDS = 60 * 60 * 24 * 30;

export interface ReportAccessPayload {
  email: string;
  source: 'deliver' | 'promo';
  typ: 'report_access';
}

export function signReportAccessToken(email: string, source: ReportAccessPayload['source']): string {
  return jwt.sign(
    { email: email.trim().toLowerCase(), source, typ: 'report_access' as const },
    getJwtSecret(),
    { expiresIn: REPORT_ACCESS_TTL_SECONDS, issuer: REPORT_ACCESS_ISSUER, audience: REPORT_ACCESS_AUDIENCE },
  );
}

export function verifyReportAccessToken(token: string): ReportAccessPayload | null {
  // Outside the try: a missing JWT_SECRET in production must surface as a clear error.
  const secret = getJwtSecret();
  try {
    const p = jwt.verify(token, secret, {
      issuer: REPORT_ACCESS_ISSUER,
      audience: REPORT_ACCESS_AUDIENCE,
    }) as ReportAccessPayload;
    return p.typ === 'report_access' && p.email ? p : null;
  } catch {
    return null;
  }
}

/** Reads the token from "Authorization: Bearer" or from body.reportAccessToken. */
export function readReportAccessToken(request: Request, body?: { reportAccessToken?: unknown }): string | null {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim() || null;
  const fromBody = body?.reportAccessToken;
  return typeof fromBody === 'string' && fromBody.trim() ? fromBody.trim() : null;
}
