import { NextResponse } from 'next/server';
import { z } from 'zod';
import { appRouteMethodNotAllowed, jsonError } from '../../../../lib/api/http';
import {
  deliverEquifyReport,
  type ReportDeliverTrigger,
} from '../../../../lib/reports/deliver_equify_report';
import type { EquifyValuationPersistedState } from '../../../../lib/wizard/equify_valuation_persistence';
import {
  consumeUnusedPaymentTokenForEmail,
  hasValidUnusedPaymentTokenForEmail,
} from '../../../../lib/payments/valid_payment_token';
import { isFlagOn } from '../../../../lib/flags/round1_flags';
import { runDeliverPaywallV2 } from '../../../../lib/payments/paywall_v2';
import { sendOfficeAlert } from '../../../../lib/alerts/office_alert';
import { signReportAccessToken } from '../../../../lib/auth/report_access_token';
import {
  REPORT_BLOCKED_CUSTOMER_MESSAGE_EN,
  REPORT_BLOCKED_CUSTOMER_MESSAGE_HE,
  ValuationReportCoherenceError,
  alertOfficeReportBlocked,
} from '../../../../lib/pdf-template/validate-valuation-data';

export const runtime = 'nodejs';
export const maxDuration = 60;

const equifyWizardStateSchema = z.object({
  profile: z.object({
    fullName: z.string(),
    userEmail: z.string(),
    userMobilePhone: z.string(),
    companyName: z.string(),
    userNationalId: z.string(),
    userCorporateTaxId: z.string(),
    foundedYear: z.string(),
    sector: z.string(),
    subSector: z.string(),
    lifecycle: z.string(),
    customLogoDataUrl: z.string(),
    qualitativeDescription: z.string(),
    currency: z.enum(['ILS', 'USD', 'EUR']),
    fiscalYear: z.string(),
  }),
  financials: z.record(z.unknown()),
  risk: z.record(z.unknown()),
  goal: z.string(),
  agreedToTerms: z.boolean(),
}).passthrough();

const valuationStateSchema = z.object({
  version: z.literal(1),
  savedAt: z.string(),
  wizard: equifyWizardStateSchema,
  summary: z.object({
    equityK: z.number(),
    evK: z.number(),
    ebitdaK: z.number(),
    wacc: z.number(),
    qualityScore: z.number(),
  }),
  mondayItemId: z.string().nullable(),
  leadId: z.string().nullable(),
  sessionId: z.string().nullable(),
  userEmail: z.string(),
  promoCode: z.string().nullable(),
  paymentPath: z.enum(['vip', 'paypal', 'promo_free']).nullable(),
  mondayStatus: z.string().nullable(),
});

const deliverBodySchema = z.object({
  mondayItemId: z.string().optional().nullable(),
  email: z.string().email(),
  valuationState: valuationStateSchema,
  triggerType: z.enum(['PAYPAL_PAID', 'PROMO_FREE']),
  locale: z.enum(['he', 'en']).optional(),
  forecastMatrix: z.record(z.unknown()).optional().nullable(),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonError('Invalid JSON body.', 400, 'INVALID_JSON');
  }

  const parsed = deliverBodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonError('Validation failed.', 400, 'VALIDATION_ERROR');
  }

  const body = parsed.data;

  if (isFlagOn('PAYWALL_V2')) {
    // Token is consumed only after the PDF was built and the email was sent.
    const orderId =
      body.valuationState.sessionId ??
      body.valuationState.leadId ??
      body.mondayItemId ??
      body.valuationState.mondayItemId ??
      'unknown';
    const outcome = await runDeliverPaywallV2(
      { email: body.email, orderId, locale: body.locale },
      {
        hasUnusedToken: hasValidUnusedPaymentTokenForEmail,
        consumeToken: consumeUnusedPaymentTokenForEmail,
        deliver: () =>
          deliverEquifyReport({
            mondayItemId: body.mondayItemId,
            email: body.email,
            valuationState: body.valuationState as unknown as EquifyValuationPersistedState,
            triggerType: body.triggerType as ReportDeliverTrigger,
            locale: body.locale,
            forecastMatrix: body.forecastMatrix as never,
          }),
        alertOffice: (subject, lines) =>
          sendOfficeAlert({ kind: 'report_delivery_failed', subject, lines }),
        mintAccessToken: (email) => signReportAccessToken(email, 'deliver'),
      },
    );
    return NextResponse.json(outcome.body, { status: outcome.status });
  }

  if (
    body.triggerType === 'PAYPAL_PAID' ||
    body.triggerType === 'PROMO_FREE'
  ) {
    const claimed = await consumeUnusedPaymentTokenForEmail(body.email);
    if (!claimed) {
      return NextResponse.json({ status: 'awaiting_payment' }, { status: 402 });
    }
  }

  try {
    const result = await deliverEquifyReport({
      mondayItemId: body.mondayItemId,
      email: body.email,
      valuationState: body.valuationState as unknown as EquifyValuationPersistedState,
      triggerType: body.triggerType as ReportDeliverTrigger,
      locale: body.locale,
      forecastMatrix: body.forecastMatrix as never,
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (err) {
    console.error('[api/reports/deliver]', err);
    if (err instanceof ValuationReportCoherenceError) {
      alertOfficeReportBlocked(
        body.valuationState.sessionId ?? 'deliver',
        err,
        'api/reports/deliver',
      );
      return jsonError(
        body.locale === 'en' ? REPORT_BLOCKED_CUSTOMER_MESSAGE_EN : REPORT_BLOCKED_CUSTOMER_MESSAGE_HE,
        422,
        'REPORT_COHERENCE_BLOCKED',
      );
    }
    const message = err instanceof Error ? err.message : 'deliver_failed';
    return jsonError(message, 500, 'DELIVER_FAILED');
  }
}

export function GET() {
  return appRouteMethodNotAllowed(['POST']);
}
