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
    const from =
      params.from ?? process.env.EMAIL_FROM ?? 'equify BY SBC <reports@valubot.app>';

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
    const from =
      params.from ?? process.env.EMAIL_FROM ?? 'reports@valubot.app';

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
        from: { email: from.replace(/.*<([^>]+)>.*/, '$1').trim() || from },
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
