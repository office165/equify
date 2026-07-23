/**
 * Transactional email — Resend or SendGrid.
 */

import { getEmailProvider, type EmailProvider } from '../config/deployment_env';

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  provider: EmailProvider;
  messageId: string | null;
  delivered: boolean;
}

/** Display name only — does not change the verified From domain. */
export const EMAIL_DISPLAY_NAME = 'Equify by SBC';

/** Reply-To for customer replies (no domain verification required). */
export const EMAIL_REPLY_TO = 'office@sbc-il.co.il';

/** Fallback mailbox until equify.co.il is verified in Resend. */
const DEFAULT_FROM_MAILBOX = 'reports@valubot.app';

/**
 * Keep the configured From mailbox (EMAIL_FROM / explicit), but always use
 * the Equify display name. Never invent an unverified sending domain.
 */
export function resolveTransactionalFrom(explicitFrom?: string): string {
  const raw = (explicitFrom ?? process.env.EMAIL_FROM ?? '').trim();
  let mailbox = DEFAULT_FROM_MAILBOX;
  if (raw) {
    const angled = raw.match(/<([^>]+)>/);
    if (angled?.[1]?.includes('@')) {
      mailbox = angled[1].trim();
    } else if (raw.includes('@') && !raw.includes(' ')) {
      mailbox = raw;
    } else if (raw.includes('@')) {
      // "Something reports@x.com" without angles — last token if email-like
      const token = raw.split(/\s+/).find((t) => t.includes('@'));
      if (token) mailbox = token.replace(/[<>]/g, '');
    }
  }
  return `${EMAIL_DISPLAY_NAME} <${mailbox}>`;
}

function parseFromParts(fromHeader: string): { name: string; email: string } {
  const angled = fromHeader.match(/^(.*)<([^>]+)>$/);
  if (angled) {
    return {
      name: angled[1].trim().replace(/^"|"$/g, '') || EMAIL_DISPLAY_NAME,
      email: angled[2].trim(),
    };
  }
  return { name: EMAIL_DISPLAY_NAME, email: fromHeader.trim() };
}

export class EmailGateway {
  private readonly provider = getEmailProvider();

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    if (this.provider === 'sendgrid') {
      return this.sendViaSendGrid(params);
    }
    return this.sendViaResend(params);
  }

  private async sendViaResend(params: SendEmailParams): Promise<SendEmailResult> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = resolveTransactionalFrom(params.from);

    if (!apiKey) {
      console.warn(
        `[EmailGateway] RESEND_API_KEY missing — email skipped: ${params.subject} → ${params.to}`,
      );
      return { provider: 'resend', messageId: null, delivered: false };
    }

    const attachments = params.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content.toString('base64'),
    }));

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        reply_to: EMAIL_REPLY_TO,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
        attachments,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Resend API failed (${response.status}): ${text}`);
    }

    const json = (await response.json()) as { id?: string };
    return { provider: 'resend', messageId: json.id ?? null, delivered: true };
  }

  private async sendViaSendGrid(params: SendEmailParams): Promise<SendEmailResult> {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromHeader = resolveTransactionalFrom(params.from);
    const fromParts = parseFromParts(fromHeader);

    if (!apiKey) {
      console.warn(
        `[EmailGateway] SENDGRID_API_KEY missing — email skipped: ${params.subject} → ${params.to}`,
      );
      return { provider: 'sendgrid', messageId: null, delivered: false };
    }

    const attachments = params.attachments?.map((a) => ({
      content: a.content.toString('base64'),
      filename: a.filename,
      type: a.contentType,
      disposition: 'attachment',
    }));

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: params.to }] }],
        from: { email: fromParts.email, name: fromParts.name },
        reply_to: { email: EMAIL_REPLY_TO },
        subject: params.subject,
        content: [
          { type: 'text/html', value: params.html },
          ...(params.text ? [{ type: 'text/plain', value: params.text }] : []),
        ],
        attachments,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`SendGrid API failed (${response.status}): ${text}`);
    }

    const messageId = response.headers.get('x-message-id');
    return { provider: 'sendgrid', messageId, delivered: true };
  }
}
