/**
 * Server-side admin backup — emails generated valuation PDFs via Resend/SendGrid.
 */

import { EmailGateway } from '../gateway/email_gateway';
import { formatCurrencyShort } from '../utils/formatCurrency';

export interface ValuationPdfBackupPayload {
  userEmail: string;
  userPhone: string;
  userId: string;
  userCorporateTaxId?: string;
  valuationMidPoint: number;
  currency?: string;
  valuationId?: string;
  pdfBase64: string;
  filename?: string;
}

const DEFAULT_ADMIN_BACKUP_EMAIL = 'smallbizclub.il@gmail.com';
const DEFAULT_BACKUP_FROM = 'equify BY SBC <system@valubot.co.il>';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatValuationMidPoint(value: number, currency: string): string {
  return formatCurrencyShort(value, currency);
}

function buildBackupEmailContent(payload: ValuationPdfBackupPayload) {
  const currency = payload.currency?.trim() || 'ILS';
  const midPoint = formatValuationMidPoint(payload.valuationMidPoint, currency);
  const corpId = payload.userCorporateTaxId?.trim();

  const textLines = [
    'New Equify valuation report generated.',
    '',
    `User email: ${payload.userEmail}`,
    `User phone: ${payload.userPhone}`,
    `User ID: ${payload.userId}`,
    ...(corpId ? [`Corporate tax ID (ח.פ): ${corpId}`] : []),
    `Valuation mid-point: ${midPoint}`,
    ...(payload.valuationId ? [`Valuation ID: ${payload.valuationId}`] : []),
    '',
    'The PDF report is attached to this email.',
  ];

  const htmlRows = [
    ['User email', payload.userEmail],
    ['User phone', payload.userPhone],
    ['User ID', payload.userId],
    ...(corpId ? [['Corporate tax ID (ח.פ)', corpId] as const] : []),
    ['Valuation mid-point', midPoint],
    ...(payload.valuationId
      ? [['Valuation ID', payload.valuationId] as const]
      : []),
  ];

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.5;color:#0f172a;">
      <h2 style="margin:0 0 12px;font-size:18px;">New Equify valuation report</h2>
      <p style="margin:0 0 16px;color:#475569;">A client downloaded a valuation PDF. Summary below; full report attached.</p>
      <table style="border-collapse:collapse;width:100%;max-width:560px;">
        ${htmlRows
          .map(
            ([label, value]) => `
          <tr>
            <td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;width:38%;">${escapeHtml(label)}</td>
            <td style="padding:8px 12px;border:1px solid #e2e8f0;">${escapeHtml(value)}</td>
          </tr>`,
          )
          .join('')}
      </table>
    </div>
  `.trim();

  return {
    subject: `New Valuation Generated: ${payload.userEmail}`,
    text: textLines.join('\n'),
    html,
  };
}

export async function sendValuationPdfBackupEmail(
  payload: ValuationPdfBackupPayload,
): Promise<{ delivered: boolean; messageId: string | null }> {
  const adminTo =
    process.env.ADMIN_BACKUP_EMAIL?.trim() || DEFAULT_ADMIN_BACKUP_EMAIL;
  const from =
    process.env.VALUBOT_BACKUP_EMAIL_FROM?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    DEFAULT_BACKUP_FROM;

  const pdfBuffer = Buffer.from(payload.pdfBase64, 'base64');
  if (!pdfBuffer.length) {
    throw new Error('PDF backup payload is empty.');
  }

  const content = buildBackupEmailContent(payload);
  const gateway = new EmailGateway();

  const result = await gateway.send({
    from,
    to: adminTo,
    subject: content.subject,
    html: content.html,
    text: content.text,
    attachments: [
      {
        filename: payload.filename?.trim() || 'Equify_Valuation_Report.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });

  return { delivered: result.delivered, messageId: result.messageId };
}
