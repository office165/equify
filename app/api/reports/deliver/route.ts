import { NextResponse } from 'next/server';
import { z } from 'zod';
import { appRouteMethodNotAllowed, jsonError } from '../../../../lib/api/http';
import {
  deliverEquifyReport,
  type ReportDeliverTrigger,
} from '../../../../lib/reports/deliver_equify_report';
import type { EquifyValuationPersistedState } from '../../../../lib/wizard/equify_valuation_persistence';

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
  paymentPath: z.enum(['vip', 'paypal']).nullable(),
  mondayStatus: z.string().nullable(),
});

const deliverBodySchema = z.object({
  mondayItemId: z.string().optional().nullable(),
  email: z.string().email(),
  valuationState: valuationStateSchema,
  triggerType: z.enum(['PAYPAL_PAID', 'VIP_BYPASS']),
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
    const message = err instanceof Error ? err.message : 'deliver_failed';
    return jsonError(message, 500, 'DELIVER_FAILED');
  }
}

export function GET() {
  return appRouteMethodNotAllowed(['POST']);
}
