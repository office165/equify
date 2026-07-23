import { NextResponse } from 'next/server';
import {
  PayPalGateway,
  verifyPayPalWebhookSignature,
} from '../../../../../lib/gateway/paypal_gateway';
import {
  getSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from '../../../../../lib/db/supabase';
import { claimPaypalCaptureAndMint } from '../../../../../lib/payments/paypal_claim_mint';
import { appRouteMethodNotAllowed } from '../../../../../lib/api/http';

const ON_DEMAND_AMOUNT = 999;
const PROMO_MATCH_WINDOW_MS = 48 * 60 * 60 * 1000;

function resolvePaypalMinAmountIls(): number {
  const raw = process.env.PAYPAL_MIN_AMOUNT_ILS?.trim();
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : ON_DEMAND_AMOUNT;
}

function logUnmatchedPayment(detail: {
  captureId: string | null;
  amount: number | null;
  payerEmail: string | null;
  reason: string;
}): void {
  console.error('[paypal-webhook] UNMATCHED_PAYMENT', {
    level: 'error',
    reason: detail.reason,
    captureId: detail.captureId,
    amount: detail.amount,
    payerEmail: detail.payerEmail,
    timestamp: new Date().toISOString(),
  });
}

async function insertUnmatched(input: {
  payerEmail: string | null;
  amount: number;
  captureId: string;
  event: Record<string, unknown>;
  reason: string;
}): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from('unmatched_payments').insert({
    payer_email: input.payerEmail,
    amount: input.amount,
    currency: 'ILS',
    gateway_provider: 'paypal',
    gateway_transaction_id: input.captureId,
    raw_event: {
      equify_note: input.reason,
      event: input.event,
    },
  });
  if (error) {
    console.error('[paypal-webhook] unmatched_payments insert failed', error);
    return false;
  }
  logUnmatchedPayment({
    captureId: input.captureId,
    amount: input.amount,
    payerEmail: input.payerEmail,
    reason: input.reason,
  });
  return true;
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  let valid = false;
  try {
    valid = await verifyPayPalWebhookSignature(request.headers, rawBody);
  } catch (err) {
    console.error('[paypal-webhook] signature verify error', err);
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!valid) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
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
    return NextResponse.json(
      { error: 'supabase_not_configured' },
      { status: 503 },
    );
  }

  const parsed = new PayPalGateway().parseCaptureWebhook(event);
  const payerEmail = parsed.payerEmail?.trim().toLowerCase() ?? '';
  const captureId = parsed.transactionId?.trim() ?? '';
  const amountIls = Number(parsed.amountIls) || ON_DEMAND_AMOUNT;
  const minAmountIls = resolvePaypalMinAmountIls();

  if (!captureId) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // Soft idempotency pre-check (RPC also handles races).
  const supabase = getSupabaseAdminClient();
  const { data: existingTx, error: existingErr } = await supabase
    .from('stripe_transactions')
    .select('id')
    .eq('stripe_payment_intent_id', captureId)
    .maybeSingle();

  if (existingErr) {
    console.error('[paypal-webhook] idempotency lookup failed', existingErr);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  if (existingTx?.id) {
    return NextResponse.json(
      { received: true, duplicate: true },
      { status: 200 },
    );
  }

  if (!payerEmail) {
    const wrote = await insertUnmatched({
      payerEmail: null,
      amount: amountIls,
      captureId,
      event,
      reason: 'missing_payer_email',
    });
    if (!wrote) {
      return NextResponse.json({ error: 'unmatched_write_failed' }, { status: 500 });
    }
    return NextResponse.json({ received: true, unmatched: true }, { status: 200 });
  }

  if (amountIls < minAmountIls) {
    const sinceIso = new Date(Date.now() - PROMO_MATCH_WINDOW_MS).toISOString();
    const { data: redemption, error: promoErr } = await supabase
      .from('promo_redemptions')
      .select('id')
      .eq('user_email', payerEmail)
      .eq('payment_matched', false)
      .gte('redeemed_at', sinceIso)
      .order('redeemed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (promoErr) {
      console.error('[paypal-webhook] promo redemption lookup failed', promoErr);
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }

    if (!redemption?.id) {
      const wrote = await insertUnmatched({
        payerEmail,
        amount: amountIls,
        captureId,
        event,
        reason: 'underpayment_no_promo',
      });
      if (!wrote) {
        return NextResponse.json(
          { error: 'unmatched_write_failed' },
          { status: 500 },
        );
      }
      return NextResponse.json(
        { received: true, unmatched: true, reason: 'underpayment_no_promo' },
        { status: 200 },
      );
    }

    const { error: matchErr } = await supabase
      .from('promo_redemptions')
      .update({ payment_matched: true })
      .eq('id', redemption.id);
    if (matchErr) {
      console.error('[paypal-webhook] promo payment_matched update failed', matchErr);
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }
  }

  try {
    const claimed = await claimPaypalCaptureAndMint({
      captureId,
      saleId: parsed.saleId,
      payerEmail,
      gatewayAmountIls: parsed.amountIls,
      gatewayStatus: parsed.status,
      paypalEventId:
        typeof event.id === 'string' ? event.id : null,
    });

    if (!claimed.ok) {
      if (claimed.reason === 'user_not_found') {
        const wrote = await insertUnmatched({
          payerEmail,
          amount: amountIls,
          captureId,
          event,
          reason: 'user_not_found',
        });
        if (!wrote) {
          return NextResponse.json(
            { error: 'unmatched_write_failed' },
            { status: 500 },
          );
        }
        return NextResponse.json(
          { received: true, unmatched: true, reason: 'user_not_found' },
          { status: 200 },
        );
      }

      if (claimed.reason === 'supabase_not_configured') {
        return NextResponse.json(
          { error: 'supabase_not_configured' },
          { status: 503 },
        );
      }

      console.error('[paypal-webhook] claim_paypal_capture_and_mint failed', claimed);
      return NextResponse.json(
        { error: 'mint_failed', reason: claimed.reason },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        received: true,
        duplicate: claimed.duplicate,
        transactionId: claimed.transactionId,
        valuationId: claimed.valuationId,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('[paypal-webhook] unhandled error', {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

export function GET() {
  return appRouteMethodNotAllowed(['POST']);
}
