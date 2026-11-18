import { NextResponse } from 'next/server';
import { jsonError } from '../../../../../../lib/api/http';
import { isUpayEnabled } from '../../../../../../lib/payments/upay/upay_client';
import { defaultUpayOrderStore, orderSignatureOk } from '../../../../../../lib/payments/upay/upay_orders';
import { settleWithDefaults } from '../../../../../../lib/payments/upay/upay_wiring';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Round 9 (UPAY): called by the return page. Needs our signature for the order. Tries to settle
 * (which asks upay, never trusts the return URL) and answers the order state; the dispatch token
 * only once the report was released.
 */
export async function GET(request: Request) {
  if (!isUpayEnabled()) return jsonError('Not found.', 404, 'NOT_FOUND');
  const u = new URL(request.url);
  const orderId = u.searchParams.get('order') ?? '';
  if (!orderSignatureOk(orderId, u.searchParams.get('sig'))) return jsonError('Forbidden.', 403, 'BAD_SIGNATURE');
  const store = defaultUpayOrderStore();
  const settled = await settleWithDefaults(orderId, { store });
  const order = await store.get(orderId);
  if (!order) return jsonError('Not found.', 404, 'NOT_FOUND');
  return NextResponse.json(
    { status: order.status, released: Boolean(order.releasedAt), outcome: settled.outcome, dispatchToken: order.releasedAt ? order.dispatchToken ?? null : null },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
