import { NextResponse } from 'next/server';
import { z } from 'zod';
import { jsonError } from '../../../../../../lib/api/http';
import { createUpayPayment, isUpayEnabled, readUpayConfig, upayPrice } from '../../../../../../lib/payments/upay/upay_client';
import { defaultUpayOrderStore, newOrderId, signOrderId } from '../../../../../../lib/payments/upay/upay_orders';
import { SITE_ORIGIN } from '../../../../../../lib/seo/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const body = z.object({ email: z.string().email().max(254), currency: z.enum(['ILS', 'USD']).optional() });

/** Round 9 (UPAY): creates an order and a upay payment page. 404 while the flag is off. */
export async function POST(request: Request) {
  if (!isUpayEnabled()) return jsonError('Not found.', 404, 'NOT_FOUND');
  const cfg = readUpayConfig();
  if (!cfg) return jsonError('Payment is not configured.', 503, 'UPAY_NOT_CONFIGURED');
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError('Validation failed.', 400, 'VALIDATION_ERROR');
  // Round 14: $349 through upay, the same flow as 999 ILS (currency USD in the request). Only while the
  // English site is on, the one place that sells in dollars. PayPal stays as the fallback.
  const price = upayPrice(parsed.data.currency ?? 'ILS', process.env);
  if (!price) return jsonError('Currency not available.', 400, 'CURRENCY_NOT_AVAILABLE');
  const store = defaultUpayOrderStore();
  const id = newOrderId();
  const sig = signOrderId(id);
  await store.create({ id, email: parsed.data.email.trim().toLowerCase(), amount: price.amount, currency: price.currency, status: 'created', createdAt: new Date().toISOString() });
  const res = await createUpayPayment(cfg, {
    orderId: id,
    amount: price.amount,
    currency: price.currency,
    returnUrl: `${SITE_ORIGIN}/payment/upay/return?order=${id}&sig=${sig}`,
  });
  if (!res.ok) {
    await store.transition(id, ['created'], { status: 'failed' });
    console.error('[upay] create failed', { orderId: id, reason: res.reason, errorcode: res.errorcode });
    return jsonError('Payment could not be started.', 502, 'UPAY_CREATE_FAILED');
  }
  await store.transition(id, ['created'], { status: 'redirected', cashierId: res.cashierId });
  return NextResponse.json({ orderId: id, sig, url: res.url }, { headers: { 'Cache-Control': 'no-store' } });
}
