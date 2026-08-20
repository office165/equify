/**
 * Post-payment valuation report dispatch — premium email + WhatsApp automation.
 */

import type { Pool } from 'pg';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import type { ValuationLocale } from '../../api_client';
import { WhatsAppGateway } from '../gateway/whatsapp_gateway';
import type { ValuationData } from '../pdf-template/types';
import type { EquifyWizardState } from '../wizard/map_equify_wizard';
import { packageAndSendCustomerReport } from '../reports/send_customer_report';
import { refreshFxRates } from '../utils/fxService';
import { buildExportValuationDataFromLiveSession } from '../results/build-export-valuation-data';
import { getIndustryLabel } from '../constants/industries';

export interface ValuationDispatchParams {
  valuationId: string;
  companyName: string;
  locale: ValuationLocale;
  forecastMatrix: ForecastMatrixWithDiagnostics;
  email?: string | null;
  phoneE164?: string | null;
  paymentVerified?: boolean;
  recipientName?: string | null;
  /** Equify wizard snapshot — required to render the 8-page PDF. */
  wizard?: EquifyWizardState | null;
  /** Pre-built layout data; when set, skips wizard mapping. */
  valuationData?: ValuationData | null;
}

export class ValuationDispatchService {
  private readonly whatsapp = new WhatsAppGateway();

  constructor(private readonly pool: Pool | null) {}

  async dispatchAfterPaymentResolution(
    params: ValuationDispatchParams,
  ): Promise<{ pdfBytes: number; emailSent: boolean; whatsappSent: boolean }> {
    if (!params.paymentVerified) {
      return { pdfBytes: 0, emailSent: false, whatsappSent: false };
    }

    const email = params.email?.trim() || '';
    const valuationData = await resolveDispatchValuationData(params);

    let pdfBytes = 0;
    let emailSent = false;

    if (valuationData && email) {
      try {
        const packaged = await packageAndSendCustomerReport({
          valuationData,
          to: email,
          locale: params.locale,
          recipientName:
            params.recipientName ??
            params.wizard?.profile.fullName ??
            undefined,
          archive: {
            userEmail: email,
            userPhone:
              params.phoneE164?.trim() ||
              params.wizard?.profile.userMobilePhone ||
              '',
            valuationMidpoint: Math.round(valuationData.equity || 0),
            displayName:
              params.wizard?.profile.fullName ||
              valuationData.companyName ||
              params.companyName,
            nationalId: params.wizard?.profile.userNationalId,
            corporateTaxId: params.wizard?.profile.userCorporateTaxId,
            sectorLabel:
              valuationData.sectorLabel ||
              (params.wizard
                ? getIndustryLabel(params.wizard.profile.sector, params.locale)
                : undefined),
            currency: valuationData.currency,
            valuationId: params.valuationId,
          },
          indicativeEnterpriseValue: valuationData.enterpriseValue,
          currency: valuationData.currency,
        });
        pdfBytes = packaged.pdfBytes;
        emailSent = packaged.email.delivered;
      } catch (err) {
        console.warn(
          '[ValuationDispatch] email package failed:',
          err instanceof Error ? err.message : err,
        );
        await this.safeLogDispatch(
          params.valuationId,
          'email',
          email,
          {},
          'failed',
          err instanceof Error ? err.message : 'email_failed',
        );
      }
    } else if (!valuationData) {
      console.info(
        '[ValuationDispatch] No valuation data — cannot render Equify PDF.',
      );
    }

    await this.safeLogDispatch(params.valuationId, 'pdf_generated', 'internal', {
      bytes: pdfBytes,
      locale: params.locale,
      archived: pdfBytes > 0,
    });

    if (email) {
      await this.safeLogDispatch(
        params.valuationId,
        'email',
        email,
        {
          skipped: !emailSent,
        },
        emailSent ? 'delivered' : 'skipped',
      );
    }

    let whatsappSent = false;
    if (params.phoneE164?.trim()) {
      try {
        const msg = buildWhatsAppOutboundTemplate({
          companyName: params.companyName,
          locale: params.locale,
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
          {},
          'failed',
          err instanceof Error ? err.message : 'whatsapp_failed',
        );
      }
    }

    return { pdfBytes, emailSent, whatsappSent };
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

async function resolveDispatchValuationData(
  params: ValuationDispatchParams,
): Promise<ValuationData | null> {
  if (params.valuationData) return params.valuationData;
  if (!params.wizard) return null;
  await refreshFxRates();
  return buildExportValuationDataFromLiveSession(
    params.forecastMatrix,
    params.wizard,
    params.locale,
    params.valuationId,
  );
}

function buildWhatsAppOutboundTemplate(options: {
  companyName: string;
  locale: ValuationLocale;
}): string {
  if (options.locale === 'he') {
    return [
      `Equify ✓`,
      `דוח הערכת השווי עבור ${options.companyName} מוכן.`,
      ``,
      `הדוח המלא נשלח לאימייל שלך (קובץ מצורף).`,
      `לשירותי ייעוץ אסטרטגי, השיבו להודעה זו.`,
    ].join('\n');
  }

  return [
    `Equify ✓`,
    `Your valuation report for ${options.companyName} is ready.`,
    ``,
    `The full report was emailed to you as an attachment.`,
    `Reply for strategic advisory services.`,
  ].join('\n');
}
