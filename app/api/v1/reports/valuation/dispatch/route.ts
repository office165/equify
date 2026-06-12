import { NextResponse } from 'next/server';
import { ValuationDispatchService } from '../../../../../../lib/dispatch/valuation_dispatch';
import { SessionTokenService } from '../../../../../../lib/auth/session_token_service';
import type { ForecastMatrixWithDiagnostics } from '../../../../../../valuation_forecast';
import type { ValuationLocale } from '../../../../../../api_client';
import {
  appRouteMethodNotAllowed,
  jsonError,
  mapThrownError,
} from '../../../../../../lib/api/http';
import { getInMemoryValuation } from '../../../../../../lib/valuation/in_memory_store';

export async function POST(request: Request) {
  let body: {
    valuationId?: string;
    locale?: ValuationLocale;
    email?: string;
    phone?: string;
    forecast_matrix_json?: ForecastMatrixWithDiagnostics;
  };

  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400, 'INVALID_JSON');
  }

  if (!body.valuationId) {
    return jsonError('valuationId is required', 400, 'VALIDATION_ERROR');
  }

  try {
    const cached = getInMemoryValuation(body.valuationId);
    const forecastMatrix =
      body.forecast_matrix_json ?? cached?.forecast_matrix_json;

    if (!forecastMatrix) {
      return jsonError('Valuation forecast matrix not found', 404, 'NOT_FOUND');
    }

    const locale: ValuationLocale = body.locale === 'he' ? 'he' : 'en';
    let email = body.email?.trim() ?? null;
    let phone = body.phone?.trim() ?? null;

    const authHeader = request.headers.get('authorization');
    const bearer = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;
    if (bearer) {
      try {
        const session = new SessionTokenService().verifySession(bearer);
        email = email ?? session.email;
        phone = phone ?? session.phone;
      } catch {
        /* optional auth */
      }
    }

    const dispatcher = new ValuationDispatchService(null);
    const result = await dispatcher.dispatchAfterPaymentResolution({
      valuationId: body.valuationId,
      companyName:
        forecastMatrix.meta.company_name ?? cached?.companyName ?? body.valuationId,
      locale,
      forecastMatrix,
      email,
      phoneE164: phone,
      paymentVerified: true,
    });

    return NextResponse.json(result, { status: 202 });
  } catch (err) {
    console.error('[dispatch]', err);
    const { status, message } = mapThrownError(err);
    return jsonError(message, status);
  }
}

export function GET() {
  return appRouteMethodNotAllowed(['POST']);
}
