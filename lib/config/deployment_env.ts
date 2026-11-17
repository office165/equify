/**
 * Centralized deployment environment accessors (server-only).
 */

export type WhatsAppProvider = 'twilio' | 'green-api';
export type EmailProvider = 'resend' | 'sendgrid';

/** Dev-only fallback. Never used when NODE_ENV is production (finding 24). */
const DEV_JWT_SECRET = 'valubot-dev-jwt-secret';

export class MissingJwtSecretError extends Error {
  constructor() {
    super('JWT_SECRET is not set. Tokens cannot be signed or verified in production without it.');
    this.name = 'MissingJwtSecretError';
  }
}

/**
 * JWT signing secret. In production a missing or empty JWT_SECRET throws: a known default
 * would let anyone forge dispatch and report-access tokens. Outside production a dev default is used.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') throw new MissingJwtSecretError();
  return DEV_JWT_SECRET;
}

export function getWhatsAppProvider(): WhatsAppProvider {
  const raw = (process.env.WHATSAPP_PROVIDER ?? 'twilio').toLowerCase();
  return raw === 'green-api' ? 'green-api' : 'twilio';
}

export function getEmailProvider(): EmailProvider {
  const raw = (process.env.EMAIL_PROVIDER ?? 'resend').toLowerCase();
  return raw === 'sendgrid' ? 'sendgrid' : 'resend';
}

export function isOtpDevBypassEnabled(): boolean {
  return process.env.OTP_DEV_BYPASS === 'true';
}

export function getOtpDevBypassCode(): string {
  return process.env.OTP_DEV_BYPASS_CODE ?? '4242';
}

/** Twilio WhatsApp credentials present and non-empty. */
export function hasTwilioWhatsAppCredentials(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_WHATSAPP_FROM?.trim(),
  );
}

/** Green-API credentials present and non-empty. */
export function hasGreenApiWhatsAppCredentials(): boolean {
  return Boolean(
    process.env.GREEN_API_INSTANCE_ID?.trim() &&
      process.env.GREEN_API_TOKEN?.trim(),
  );
}

/** Infobip WhatsApp credentials present and non-empty. */
export function hasInfobipWhatsAppCredentials(): boolean {
  return Boolean(
    process.env.INFOBIP_API_KEY?.trim() &&
      (process.env.INFOBIP_WHATSAPP_SENDER?.trim() ||
        process.env.INFOBIP_BASE_URL?.trim()),
  );
}

/** Production-grade WhatsApp provider credentials configured. */
export function hasProductionWhatsAppCredentials(): boolean {
  return (
    hasTwilioWhatsAppCredentials() ||
    hasGreenApiWhatsAppCredentials() ||
    hasInfobipWhatsAppCredentials()
  );
}

/**
 * Mock OTP path: no external WhatsApp provider, or explicit dev bypass flag.
 * Any 4-digit code is accepted on verify; OTP SMS is not sent.
 */
export function isWhatsAppOtpMockMode(): boolean {
  if (isOtpDevBypassEnabled()) {
    return true;
  }
  return !hasProductionWhatsAppCredentials();
}
