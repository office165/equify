/**
 * Post-payment valuation report dispatch — premium email + WhatsApp automation.
 */

import type { Pool } from 'pg';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import type { ValuationLocale } from '../../api_client';
import { EmailGateway } from '../gateway/email_gateway';
import { WhatsAppGateway } from '../gateway/whatsapp_gateway';
import { VALUATION_PDF_FILENAME } from '../api/handlers/valuation_generate';
import {
  buildMarketingReportEmailHtml,
  buildMarketingReportEmailSubject,
  buildMarketingReportEmailText,
} from '../email/templates/marketingReport';

export interface ValuationDispatchParams {
  valuationId: string;
  companyName: string;
  locale: ValuationLocale;
  forecastMatrix: ForecastMatrixWithDiagnostics;
  email?: string | null;
  phoneE164?: string | null;
  paymentVerified?: boolean;
  pdfDownloadUrl?: string | null;
  pdfBuffer?: Buffer | null;
  recipientName?: string | null;
}

export class ValuationDispatchService {
  private readonly email = new EmailGateway();
  private readonly whatsapp = new WhatsAppGateway();

  constructor(private readonly pool: Pool | null) {}

  async dispatchAfterPaymentResolution(
    params: ValuationDispatchParams,
  ): Promise<{ pdfBytes: number; emailSent: boolean; whatsappSent: boolean }> {
    if (!params.paymentVerified) {
      return { pdfBytes: 0, emailSent: false, whatsappSent: false };
    }

    const pdfBuffer = params.pdfBuffer ?? null;
    if (!pdfBuffer?.length) {
      console.info(
        '[ValuationDispatch] No server PDF — client dashboard capture required.',
      );
    }

    await this.safeLogDispatch(params.valuationId, 'pdf_generated', 'internal', {
      bytes: pdfBuffer?.length ?? 0,
      locale: params.locale,
      downloadUrl: params.pdfDownloadUrl ?? null,
    });

    let emailSent = false;
    let whatsappSent = false;
    const downloadLink = params.pdfDownloadUrl?.trim() ?? null;
    const indicativeEv =
      params.forecastMatrix.scenarios?.base?.enterprise_value ??
      params.forecastMatrix.enterprise_value ??
      null;
    const currency = params.forecastMatrix.meta?.currency ?? 'ILS';

    if (params.email?.trim()) {
      try {
        const emailParams = {
          companyName: params.companyName,
          recipientName: params.recipientName ?? undefined,
          metricsAccessUrl: downloadLink ?? '#',
          locale: params.locale,
          indicativeEnterpriseValue: indicativeEv,
          currency,
        };
        const result = await this.email.send({
          to: params.email.trim(),
          subject: buildMarketingReportEmailSubject(emailParams),
          html: buildMarketingReportEmailHtml(emailParams),
          text: buildMarketingReportEmailText(emailParams),
          attachments: pdfBuffer?.length
            ? [
                {
                  filename: VALUATION_PDF_FILENAME,
                  content: pdfBuffer,
                  contentType: 'application/pdf',
                },
              ]
            : undefined,
        });
        emailSent = result.delivered;
        await this.safeLogDispatch(
          params.valuationId,
          'email',
          params.email.trim(),
          {
            provider: result.provider,
            messageId: result.messageId,
            downloadLink,
            skipped: !result.delivered,
          },
          emailSent ? 'delivered' : 'skipped',
        );
      } catch (err) {
        console.warn(
          '[ValuationDispatch] email failed:',
          err instanceof Error ? err.message : err,
        );
        await this.safeLogDispatch(
          params.valuationId,
          'email',
          params.email.trim(),
          { downloadLink },
          'failed',
          err instanceof Error ? err.message : 'email_failed',
        );
      }
    }

    if (params.phoneE164?.trim()) {
      try {
        const msg = buildWhatsAppOutboundTemplate({
          companyName: params.companyName,
          locale: params.locale,
          pdfDownloadUrl: downloadLink,
        });
        const result = await this.whatsapp.sendTextMessage(
          params.phoneE164.trim(),
          msg,
        );
        whatsappSent = result.delivered;
        await this.safeLogDispatch(
          params.valuationId,
          'whatsapp',
          params.phoneE164.trim(),
          {
            provider: result.provider,
            messageId: result.messageId,
            downloadLink,
            skipped: !result.delivered,
          },
          whatsappSent ? 'delivered' : 'skipped',
        );
      } catch (err) {
        console.warn(
          '[ValuationDispatch] WhatsApp failed:',
          err instanceof Error ? err.message : err,
        );
        await this.safeLogDispatch(
          params.valuationId,
          'whatsapp',
          params.phoneE164.trim(),
          { downloadLink },
          'failed',
          err instanceof Error ? err.message : 'whatsapp_failed',
        );
      }
    }

    return { pdfBytes: pdfBuffer?.length ?? 0, emailSent, whatsappSent };
  }

  private async safeLogDispatch(
    valuationId: string,
    channel: 'email' | 'whatsapp' | 'pdf_generated',
    destination: string,
    metadata: Record<string, unknown>,
    status = 'delivered',
    errorMessage?: string,
  ): Promise<void> {
    if (!this.pool) {
      return;
    }
    try {
      await this.pool.query(
        `INSERT INTO valuation_dispatch_log (
           valuation_id, channel, destination, status, metadata, error_message, completed_at
         ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, CASE WHEN $4 IN ('delivered','skipped') THEN NOW() ELSE NULL END)`,
        [
          valuationId,
          channel,
          destination,
          status,
          JSON.stringify(metadata),
          errorMessage ?? null,
        ],
      );
    } catch (err) {
      console.warn(
        '[ValuationDispatch] audit log skipped:',
        err instanceof Error ? err.message : err,
      );
    }
  }
}

function buildWhatsAppOutboundTemplate(options: {
  companyName: string;
  locale: ValuationLocale;
  pdfDownloadUrl: string | null;
}): string {
  const link = options.pdfDownloadUrl ?? 'https://valubot.app';
  if (options.locale === 'he') {
    return [
      `Equify ✓`,
      `דוח הערכת השווי עבור ${options.companyName} מוכן.`,
      ``,
      `📄 להורדה ישירה של הדוח (PDF):`,
      link,
      ``,
      `הדוח נשלח גם לאימייל שלך עם ניתוח DCF, WACC ומכפילי ענף.`,
      `לשירותי ייעוץ אסטרטגי — השיבו להודעה זו.`,
    ].join('\n');
  }

  return [
    `Equify ✓`,
    `Your valuation report for ${options.companyName} is ready.`,
    ``,
    `📄 Direct PDF download:`,
    link,
    ``,
    `The report was also emailed with DCF, WACC, and sector multiple analysis.`,
    `Reply for strategic advisory services.`,
  ].join('\n');
}
