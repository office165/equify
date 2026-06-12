/**
 * WhatsApp API gateway proxy — Twilio or Green-API.
 */

import {
  getWhatsAppProvider,
  hasProductionWhatsAppCredentials,
  isWhatsAppOtpMockMode,
  type WhatsAppProvider,
} from '../config/deployment_env';

export interface WhatsAppSendResult {
  provider: WhatsAppProvider;
  messageId: string | null;
  delivered: boolean;
}

export interface WhatsAppValuationDeliveryParams {
  toE164: string;
  companyName: string;
  fullName: string;
  locale?: 'he' | 'en';
  pdfBuffer?: Buffer | null;
  pdfDownloadUrl?: string | null;
}

export class WhatsAppGateway {
  private readonly provider = getWhatsAppProvider();

  async sendValuationReportDelivery(
    params: WhatsAppValuationDeliveryParams,
  ): Promise<WhatsAppSendResult> {
    const template = buildValuationWhatsAppTemplate({
      companyName: params.companyName,
      fullName: params.fullName,
      locale: params.locale ?? 'he',
      pdfDownloadUrl: params.pdfDownloadUrl ?? null,
    });

    const textResult = await this.sendTextMessage(params.toE164, template);
    if (!params.pdfBuffer?.byteLength) {
      return textResult;
    }

    if (this.provider === 'green-api') {
      const fileResult = await this.sendPdfViaGreenApi(
        params.toE164,
        params.pdfBuffer,
        `Valuation_Report_${Date.now()}.pdf`,
      );
      return {
        provider: fileResult.provider,
        messageId: fileResult.messageId ?? textResult.messageId,
        delivered: textResult.delivered || fileResult.delivered,
      };
    }

    if (params.pdfDownloadUrl?.trim()) {
      const mediaResult = await this.sendPdfViaTwilioMedia(
        params.toE164,
        params.pdfDownloadUrl.trim(),
        template,
      );
      return {
        provider: mediaResult.provider,
        messageId: mediaResult.messageId ?? textResult.messageId,
        delivered: textResult.delivered || mediaResult.delivered,
      };
    }

    return textResult;
  }

  async sendTextMessage(toE164: string, body: string): Promise<WhatsAppSendResult> {
    if (isWhatsAppOtpMockMode() || !hasProductionWhatsAppCredentials()) {
      console.warn(
        `[WhatsAppGateway] Mock mode — message not sent to ${toE164}`,
      );
      return { provider: this.provider, messageId: null, delivered: false };
    }
    if (this.provider === 'green-api') {
      return this.sendViaGreenApi(toE164, body);
    }
    return this.sendViaTwilio(toE164, body);
  }

  async sendOtpMessage(toE164: string, code: string): Promise<WhatsAppSendResult> {
    const body = `equify BY SBC verification code: ${code}. Valid for 10 minutes. Do not share this code.`;
    return this.sendTextMessage(toE164, body);
  }

  private async sendViaTwilio(
    toE164: string,
    body: string,
  ): Promise<WhatsAppSendResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;

    if (!accountSid || !authToken || !from) {
      console.warn('[WhatsAppGateway] Twilio not configured — message skipped.');
      console.warn(`[WhatsAppGateway] To ${toE164}: ${body}`);
      return { provider: 'twilio', messageId: null, delivered: false };
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const params = new URLSearchParams({
      To: toE164.startsWith('whatsapp:') ? toE164 : `whatsapp:${toE164}`,
      From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
      Body: body,
    });

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Twilio WhatsApp send failed (${response.status}): ${text}`);
    }

    const json = (await response.json()) as { sid?: string };
    return { provider: 'twilio', messageId: json.sid ?? null, delivered: true };
  }

  private async sendViaGreenApi(
    toE164: string,
    body: string,
  ): Promise<WhatsAppSendResult> {
    const instanceId = process.env.GREEN_API_INSTANCE_ID;
    const apiToken = process.env.GREEN_API_TOKEN;

    if (!instanceId || !apiToken) {
      console.warn('[WhatsAppGateway] Green-API not configured — message skipped.');
      console.warn(`[WhatsAppGateway] To ${toE164}: ${body}`);
      return { provider: 'green-api', messageId: null, delivered: false };
    }

    const chatId = `${toE164.replace(/\D/g, '')}@c.us`;
    const url = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${apiToken}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message: body }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Green-API send failed (${response.status}): ${text}`);
    }

    const json = (await response.json()) as { idMessage?: string };
    return {
      provider: 'green-api',
      messageId: json.idMessage ?? null,
      delivered: true,
    };
  }

  private async sendPdfViaGreenApi(
    toE164: string,
    pdfBuffer: Buffer,
    filename: string,
  ): Promise<WhatsAppSendResult> {
    const instanceId = process.env.GREEN_API_INSTANCE_ID;
    const apiToken = process.env.GREEN_API_TOKEN;

    if (!instanceId || !apiToken) {
      console.warn('[WhatsAppGateway] Green-API not configured — PDF file skipped.');
      return { provider: 'green-api', messageId: null, delivered: false };
    }

    const chatId = `${toE164.replace(/\D/g, '')}@c.us`;
    const url = `https://api.green-api.com/waInstance${instanceId}/sendFileByUpload/${apiToken}`;
    const pdfBlob = new Blob([new Uint8Array(pdfBuffer)], {
      type: 'application/pdf',
    });
    const formData = new FormData();
    formData.append('chatId', chatId);
    formData.append('file', pdfBlob, filename);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Green-API file upload failed (${response.status}): ${text}`);
    }

    const json = (await response.json()) as { idMessage?: string };
    return {
      provider: 'green-api',
      messageId: json.idMessage ?? null,
      delivered: true,
    };
  }

  private async sendPdfViaTwilioMedia(
    toE164: string,
    mediaUrl: string,
    body: string,
  ): Promise<WhatsAppSendResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;

    if (!accountSid || !authToken || !from) {
      console.warn('[WhatsAppGateway] Twilio not configured — PDF media skipped.');
      return { provider: 'twilio', messageId: null, delivered: false };
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const params = new URLSearchParams({
      To: toE164.startsWith('whatsapp:') ? toE164 : `whatsapp:${toE164}`,
      From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
      Body: body,
      MediaUrl: mediaUrl,
    });

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Twilio WhatsApp media send failed (${response.status}): ${text}`);
    }

    const json = (await response.json()) as { sid?: string };
    return { provider: 'twilio', messageId: json.sid ?? null, delivered: true };
  }
}

function buildValuationWhatsAppTemplate(options: {
  companyName: string;
  fullName: string;
  locale: 'he' | 'en';
  pdfDownloadUrl: string | null;
}): string {
  const link = options.pdfDownloadUrl ?? 'https://valubot-six.vercel.app';
  if (options.locale === 'he') {
    return [
      'equify BY SBC ✓',
      `שלום ${options.fullName},`,
      `דוח הערכת השווי עבור ${options.companyName} מוכן ומאומת.`,
      '',
      '📄 קובץ ה-PDF מצורף להודעה זו.',
      link !== 'https://valubot-six.vercel.app' ? `קישור גיבוי: ${link}` : '',
      '',
      'לשירותי ייעוץ אסטרטגי — השיבו להודעה זו.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  return [
    'equify BY SBC ✓',
    `Hello ${options.fullName},`,
    `Your verified valuation report for ${options.companyName} is ready.`,
    '',
    '📄 The PDF report is attached to this message.',
    link !== 'https://valubot-six.vercel.app' ? `Backup link: ${link}` : '',
    '',
    'Reply for strategic advisory services.',
  ]
    .filter(Boolean)
    .join('\n');
}
