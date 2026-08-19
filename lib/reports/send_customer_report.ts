/**
 * Unified customer-report delivery: render PDF → archive (optional) → email.
 * Signed download URLs stay inside the customer email only — never logs, Monday, or events.
 */

import { EmailGateway } from '../gateway/email_gateway';
import { VALUATION_PDF_FILENAME } from '../api/handlers/valuation_generate';
import {
  archiveValuationReport,
  type ArchiveValuationReportOptions,
} from '../backup/archive_valuation_report';
import {
  buildMarketingReportEmailHtml,
  buildMarketingReportEmailSubject,
  buildMarketingReportEmailText,
  hasUsableReportDownloadUrl,
} from '../email/templates/marketingReport';
import type { ValuationLocale } from '../../api_client';
import type { ValuationData } from '../pdf-template/types';
import { renderEquifyReportPdfBuffer } from './render_equify_report_pdf';

export interface CustomerReportArchiveContact {
  userEmail: string;
  userPhone: string;
  valuationMidpoint: number;
  displayName?: string;
  nationalId?: string;
  corporateTaxId?: string;
  sectorLabel?: string;
  currency?: string;
  valuationId?: string;
}

export interface PackageAndSendCustomerReportInput {
  valuationData: ValuationData;
  to: string;
  locale: ValuationLocale;
  recipientName?: string;
  archive: CustomerReportArchiveContact;
  indicativeEnterpriseValue?: number | null;
  currency?: string;
}

export interface PackageAndSendCustomerReportResult {
  pdfBuffer: Buffer;
  filename: string;
  pdfBytes: number;
  archived: boolean;
  email: {
    delivered: boolean;
    messageId: string | null;
    error?: string;
  };
}

function archiveOptionsFromContact(
  contact: CustomerReportArchiveContact,
): ArchiveValuationReportOptions {
  return {
    displayName: contact.displayName,
    userId: contact.nationalId,
    userCorporateTaxId: contact.corporateTaxId,
    sectorLabel: contact.sectorLabel,
    currency: contact.currency,
    valuationId: contact.valuationId,
  };
}

/**
 * Upload + signed URL. Returns the URL only to the caller (email builder).
 * Never logs the URL. Failure is non-fatal.
 */
async function tryArchiveCustomerReportPdf(
  pdfBuffer: Buffer,
  contact: CustomerReportArchiveContact,
): Promise<string | null> {
  if (!pdfBuffer.length) return null;
  if (!contact.userEmail.trim()) return null;
  try {
    const result = await archiveValuationReport(
      contact.userEmail,
      contact.userPhone,
      contact.valuationMidpoint,
      pdfBuffer.toString('base64'),
      archiveOptionsFromContact(contact),
    );
    const url = result.pdfUrl?.trim() ?? '';
    return hasUsableReportDownloadUrl(url) ? url : null;
  } catch (err) {
    console.error(
      '[customer-report] storage archive failed',
      err instanceof Error ? err.message : 'archive_failed',
    );
    return null;
  }
}

async function sendCustomerReportEmail(params: {
  to: string;
  locale: ValuationLocale;
  companyName: string;
  recipientName?: string;
  pdfBuffer: Buffer;
  filename: string;
  pdfDownloadUrl: string | null;
  indicativeEnterpriseValue?: number | null;
  currency?: string;
}): Promise<{ delivered: boolean; messageId: string | null; error?: string }> {
  const gateway = new EmailGateway();
  const emailParams = {
    companyName: params.companyName,
    recipientName: params.recipientName,
    metricsAccessUrl: params.pdfDownloadUrl,
    locale: params.locale,
    indicativeEnterpriseValue: params.indicativeEnterpriseValue,
    currency: params.currency,
  };

  try {
    const result = await gateway.send({
      to: params.to,
      subject: buildMarketingReportEmailSubject(emailParams),
      html: buildMarketingReportEmailHtml(emailParams),
      text: buildMarketingReportEmailText(emailParams),
      attachments: [
        {
          filename: params.filename,
          content: params.pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
    return {
      delivered: result.delivered,
      messageId: result.messageId,
      error: result.delivered ? undefined : 'email_not_delivered',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'email_send_failed';
    console.error('[customer-report] email send failed', message);
    return { delivered: false, messageId: null, error: message };
  }
}

export async function packageAndSendCustomerReport(
  input: PackageAndSendCustomerReportInput,
): Promise<PackageAndSendCustomerReportResult> {
  const filename = VALUATION_PDF_FILENAME;
  const tag = '[customer-report]';

  console.log(`${tag} pdf_render_start`, {
    to: input.to,
    company: input.valuationData.companyName,
    locale: input.locale,
  });

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderEquifyReportPdfBuffer(input.valuationData);
    console.log(`${tag} pdf_render_ok`, { bytes: pdfBuffer.byteLength });
  } catch (err) {
    console.error(`${tag} pdf_render_failed`, err instanceof Error ? err.message : err);
    throw err;
  }

  console.log(`${tag} upload_start`, { email: input.archive.userEmail });
  const pdfDownloadUrl = await tryArchiveCustomerReportPdf(pdfBuffer, input.archive);
  if (pdfDownloadUrl) {
    console.log(`${tag} upload_ok signed_url_ok`);
  } else {
    console.warn(`${tag} upload_skipped_or_failed — email will send without CTA link`);
  }

  const emailTarget = input.to.trim();
  console.log(`${tag} email_send_start`, { to: emailTarget, hasLink: Boolean(pdfDownloadUrl) });

  const email = emailTarget
    ? await sendCustomerReportEmail({
        to: emailTarget,
        locale: input.locale,
        companyName: input.valuationData.companyName,
        recipientName: input.recipientName,
        pdfBuffer,
        filename,
        pdfDownloadUrl,
        indicativeEnterpriseValue: input.indicativeEnterpriseValue,
        currency: input.currency ?? input.valuationData.currency,
      })
    : { delivered: false, messageId: null, error: 'email_missing' };

  if (email.delivered) {
    console.log(`${tag} email_sent`, { messageId: email.messageId });
  } else {
    console.error(`${tag} email_failed`, { error: email.error });
  }

  return {
    pdfBuffer,
    filename,
    pdfBytes: pdfBuffer.byteLength,
    archived: Boolean(pdfDownloadUrl),
    email,
  };
}
