import * as crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  PayPalGateway,
  verifyPayPalWebhookSignature,
} from '../../../../../lib/gateway/paypal_gateway';
import {
  getSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from '../../../../../lib/db/supabase';
import { PaymentDispatchTokenService } from '../../../../../lib/auth/payment_dispatch_token_service';
import { ValuationDispatchService } from '../../../../../lib/dispatch/valuation_dispatch';
import { getInMemoryValuation } from '../../../../../lib/valuation/in_memory_store';
import { appRouteMethodNotAllowed } from '../../../../../lib/api/http';

/** On-demand Pro price — must match stripe_transactions CHECK (999.00 ILS). */
const ON_DEMAND_AMOUNT = 999;
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 90;
const PROMO_MATCH_WINDOW_MS = 48 * 60 * 60 * 1000;

function resolvePaypalMinAmountIls(): number {
  const raw = process.env.PAYPAL_MIN_AMOUNT_ILS?.trim();
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : ON_DEMAND_AMOUNT;
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  // TEMP DIAG — remove after PAYPAL_WEBHOOK_ID production verification
  const rawWebhookId = process.env.PAYPAL_WEBHOOK_ID;
  const webhookIdTrimmed = rawWebhookId?.trim() ?? '';
  const envDiag = {
    defined: webhookIdTrimmed.length > 0,
    length: webhookIdTrimmed.length,
    prefix4: webhookIdTrimmed.length > 0 ? webhookIdTrimmed.slice(0, 4) : null,
    suffix4: webhookIdTrimmed.length > 0 ? webhookIdTrimmed.slice(-4) : null,
  };
  console.log('[paypal-webhook] TEMP_ENV_DIAG PAYPAL_WEBHOOK_ID', envDiag);

  let valid = false;
  try {
    valid = await verifyPayPalWebhookSignature(request.headers, rawBody);
  } catch (err) {
    console.error('[paypal-webhook] signature verify error', err);
    return NextResponse.json(
      { error: 'unauthorized', TEMP_ENV_DIAG: envDiag },
      { status: 401 },
    );
  }
  if (!valid) {
    return NextResponse.json(
      { error: 'unauthorized', TEMP_ENV_DIAG: envDiag },
      { status: 401 },
    );
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  if (event.event_type !== 'PAYMENT.CAPTURE.COMPLETED') {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  if (!isSupabaseAdminConfigured()) {
    console.error('[paypal-webhook] Supabase admin not configured');
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const supabase = getSupabaseAdminClient();
  const parsed = new PayPalGateway().parseCaptureWebhook(event);
  const payerEmail = parsed.payerEmail?.trim().toLowerCase() ?? '';
  const captureId = parsed.transactionId;

  if (!captureId) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // Idempotency — stripe_payment_intent_id holds provider transaction id.
  const { data: existingTx } = await supabase
    .from('stripe_transactions')
    .select('id')
    .eq('stripe_payment_intent_id', captureId)
    .maybeSingle();

  if (existingTx?.id) {
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
  }

  const amountIls = Number(parsed.amountIls) || ON_DEMAND_AMOUNT;
  const minAmountIls = resolvePaypalMinAmountIls();

  if (!payerEmail) {
    await supabase.from('unmatched_payments').insert({
      payer_email: null,
      amount: amountIls,
      currency: 'ILS',
      gateway_provider: 'paypal',
      gateway_transaction_id: captureId,
      raw_event: event,
    });
    return NextResponse.json({ received: true, unmatched: true }, { status: 200 });
  }

  if (amountIls < minAmountIls) {
    const sinceIso = new Date(Date.now() - PROMO_MATCH_WINDOW_MS).toISOString();
    const { data: redemption } = await supabase
      .from('promo_redemptions')
      .select('id')
      .eq('user_email', payerEmail)
      .eq('payment_matched', false)
      .gte('redeemed_at', sinceIso)
      .order('redeemed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!redemption?.id) {
      await supabase.from('unmatched_payments').insert({
        payer_email: payerEmail,
        amount: amountIls,
        currency: 'ILS',
        gateway_provider: 'paypal',
        gateway_transaction_id: captureId,
        raw_event: {
          equify_note: 'underpayment_no_promo',
          event,
        },
      });
      return NextResponse.json(
        { received: true, unmatched: true, reason: 'underpayment_no_promo' },
        { status: 200 },
      );
    }

    await supabase
      .from('promo_redemptions')
      .update({ payment_matched: true })
      .eq('id', redemption.id);
  }

  const { data: user } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', payerEmail)
    .is('deleted_at', null)
    .maybeSingle();

  if (!user?.id) {
    await supabase.from('unmatched_payments').insert({
      payer_email: payerEmail,
      amount: amountIls,
      currency: 'ILS',
      gateway_provider: 'paypal',
      gateway_transaction_id: captureId,
      raw_event: event,
    });
    return NextResponse.json({ received: true, unmatched: true }, { status: 200 });
  }

  const { data: draft } = await supabase
    .from('valuations')
    .select('id, title')
    .eq('status', 'draft')
    .eq('created_by_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const valuationId = draft?.id ?? null;
  const transactionId = crypto.randomUUID();
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString();

  let tokenJwt = `paypal-pending.${transactionId}`;
  if (valuationId) {
    const { token } = new PaymentDispatchTokenService().signDispatch({
      sub: transactionId,
      valuationId,
      email: payerEmail,
      jti,
    });
    tokenJwt = token;
  }

  const { data: insertedTx, error: txError } = await supabase
    .from('stripe_transactions')
    .insert({
      id: transactionId,
      stripe_payment_intent_id: captureId,
      stripe_checkout_session_id: parsed.saleId || null,
      stripe_customer_id: payerEmail,
      purchaser_user_id: user.id,
      amount: ON_DEMAND_AMOUNT,
      currency: 'ILS',
      is_used: false,
      token_jwt: tokenJwt,
      token_jti: jti,
      expires_at: expiresAt,
      gateway_provider: 'paypal',
      valuation_id: valuationId,
      metadata: {
        provider: 'paypal',
        gateway_provider: 'paypal',
        gateway_status: parsed.status,
        gateway_amount: parsed.amountIls,
        gateway_currency: parsed.currency,
        paypal_event_id: event.id ?? null,
        dispatch_token_used_at: null,
      },
    })
    .select('id')
    .single();

  if (txError || !insertedTx?.id) {
    console.error('[paypal-webhook] insert stripe_transactions failed', txError);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  if (!valuationId) {
    console.warn('[paypal-webhook] no draft valuation for user', user.id);
    return NextResponse.json({ received: true, transactionId }, { status: 200 });
  }

  const cached = getInMemoryValuation(valuationId);
  const enterpriseValuation =
    cached?.forecast_matrix_json?.scenarios?.base?.enterprise_value ??
    cached?.forecast_matrix_json?.enterprise_value ??
    0;
  const equityValue =
    cached?.forecast_matrix_json?.scenarios?.base?.final_equity_value ?? 0;

  const { error: updError } = await supabase
    .from('valuations')
    .update({
      status: 'completed',
      stripe_transaction_id: transactionId,
      subscription_id: null,
      enterprise_valuation: enterpriseValuation,
      equity_value: equityValue,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', valuationId)
    .eq('status', 'draft');

  if (updError) {
    console.error('[paypal-webhook] valuation update failed', updError);
    return NextResponse.json({ received: true, transactionId }, { status: 200 });
  }

  // Sole authorized origin for paymentVerified: true
  if (cached?.forecast_matrix_json) {
    try {
      const dispatcher = new ValuationDispatchService(null);
      await dispatcher.dispatchAfterPaymentResolution({
        valuationId,
        companyName: cached.companyName,
        locale: cached.locale,
        forecastMatrix: cached.forecast_matrix_json,
        email: payerEmail,
        paymentVerified: true,
      });
    } catch (err) {
      console.error('[paypal-webhook] dispatch failed', err);
    }
  } else {
    console.warn(
      '[paypal-webhook] no in-memory forecast; dispatch JWT minted for /dispatch',
      valuationId,
    );
  }

  return NextResponse.json(
    { received: true, transactionId, valuationId },
    { status: 200 },
  );
}

export function GET() {
  return appRouteMethodNotAllowed(['POST']);
}
