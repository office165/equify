import { NextResponse } from 'next/server';
import { ValuationDispatchService } from '../../../../../../lib/dispatch/valuation_dispatch';
import { PaymentDispatchTokenService } from '../../../../../../lib/auth/payment_dispatch_token_service';
import type { ForecastMatrixWithDiagnostics } from '../../../../../../valuation_forecast';
import type { ValuationLocale } from '../../../../../../api_client';
import {
  appRouteMethodNotAllowed,
  jsonError,
  mapThrownError,
} from '../../../../../../lib/api/http';
import { getInMemoryValuation } from '../../../../../../lib/valuation/in_memory_store';
import {
  getSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from '../../../../../../lib/db/supabase';

/**
 * Client-triggered report dispatch.
 * Requires a single-use JWT minted only by paypal-webhook after CAPTURE.COMPLETED.
 * Open `paymentVerified: true` without that proof has been removed.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;

  if (!bearer) {
    return jsonError('Payment dispatch token required', 403, 'FORBIDDEN');
  }

  let dispatchClaims;
  try {
    dispatchClaims = new PaymentDispatchTokenService().verifyDispatch(bearer);
  } catch {
    return jsonError('Invalid or expired payment dispatch token', 403, 'FORBIDDEN');
  }

  if (!isSupabaseAdminConfigured()) {
    return jsonError('Payment verification store unavailable', 403, 'FORBIDDEN');
  }

  const supabase = getSupabaseAdminClient();

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

  const valuationId = body.valuationId ?? dispatchClaims.valuationId;
  if (!valuationId || valuationId !== dispatchClaims.valuationId) {
    return jsonError('valuationId mismatch', 403, 'FORBIDDEN');
  }

  try {
    const cached = getInMemoryValuation(valuationId);
    const forecastMatrix =
      body.forecast_matrix_json ?? cached?.forecast_matrix_json;

    if (!forecastMatrix) {
      return jsonError('Valuation forecast matrix not found', 404, 'NOT_FOUND');
    }

    const locale: ValuationLocale = body.locale === 'he' ? 'he' : 'en';
    const email = body.email?.trim() || dispatchClaims.email || null;

    const usedAt = new Date().toISOString();
    // Atomic claim: one UPDATE … WHERE is_used = false … .select() (= RETURNING).
    // Empty result / error ⇒ already used (rowCount = 0).
    const { data: claimed, error: claimError } = await supabase
      .from('stripe_transactions')
      .update({
        is_used: true,
        used_at: usedAt,
      })
      .eq('id', dispatchClaims.sub)
      .eq('token_jti', dispatchClaims.jti)
      .eq('is_used', false)
      .in('gateway_provider', ['paypal', 'promo_free'])
      .select('id, metadata')
      .maybeSingle();

    if (claimError || !claimed?.id) {
      return jsonError('Payment dispatch token already used', 403, 'FORBIDDEN');
    }

    const priorMeta = (claimed.metadata ?? {}) as Record<string, unknown>;
    await supabase
      .from('stripe_transactions')
      .update({
        metadata: {
          ...priorMeta,
          dispatch_token_used_at: usedAt,
        },
      })
      .eq('id', claimed.id);

    /**
     * paymentVerified may be true here only because paypal-webhook or promo/validate
     * minted this JWT after server-side entitlement. Not an open client bypass.
     */
    const dispatcher = new ValuationDispatchService(null);
    const result = await dispatcher.dispatchAfterPaymentResolution({
      valuationId,
      companyName:
        forecastMatrix.meta?.company_name ?? cached?.companyName ?? valuationId,
      locale,
      forecastMatrix,
      email,
      phoneE164: body.phone?.trim() ?? null,
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
