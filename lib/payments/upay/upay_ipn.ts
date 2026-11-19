/**
 * Round 9 (UPAY): the IPN handler (/api/v1/payments/upay-ipn), separate from the route so it can be
 * tested. Every call is logged. The order comes from our signed query (?order=&sig=) or from the
 * transfer comment we send ("equify order <id>"). Nothing in the IPN itself is trusted: settling
 * asks upay (verifier) and compares amount and currency with the order.
 */
import { orderSignatureOk, type UpayOrderStore } from './upay_orders';
import { settleUpayOrder, type AfterPaidFn, type ReleaseFn, type UpayVerifier } from './upay_settle';
import { clientIp, ipAllowed, orderIdFromComment } from './upay_wiring';

/** Round 14: the IPN's fields, from the query and the body (form or JSON), keys lower case. */
export function ipnFields(query: Record<string, string>, raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const put = (k: string, v: unknown) => {
    if (v == null || typeof v === 'object') return;
    out[k.toLowerCase()] = String(v);
  };
  for (const [k, v] of Object.entries(query)) put(k, v);
  const t = raw.trim();
  if (t.startsWith('{')) {
    try {
      for (const [k, v] of Object.entries(JSON.parse(t) as Record<string, unknown>)) put(k, v);
    } catch {
      /* not JSON */
    }
  } else if (t) {
    for (const [k, v] of new URLSearchParams(t).entries()) put(k, v);
  }
  return out;
}

export async function handleUpayIpn(
  request: Request,
  deps: { store: UpayOrderStore; verify: UpayVerifier; release: ReleaseFn; afterPaid?: AfterPaidFn },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams.entries());
  const raw = request.method === 'POST' ? await request.text().catch(() => '') : '';
  const ip = clientIp(request.headers);
  const log = (orderId: string | null, outcome: string) => deps.store.logIpn({ orderId, ip, query, body: raw, outcome });

  if (!ipAllowed(ip)) {
    await log(null, 'ip_blocked');
    return { status: 403, body: { received: false } };
  }
  let orderId: string | null = null;
  if (query.order) {
    if (!orderSignatureOk(query.order, query.sig)) {
      await log(query.order, 'bad_signature');
      return { status: 403, body: { received: false } };
    }
    orderId = query.order;
  } else {
    let form: URLSearchParams | null = null;
    try {
      form = new URLSearchParams(raw);
    } catch {
      form = null;
    }
    orderId = orderIdFromComment(query.comment ?? form?.get('comment') ?? raw);
  }
  if (!orderId) {
    await log(null, 'no_order');
    return { status: 200, body: { received: true } };
  }
  const res = await settleUpayOrder(orderId, { ...deps, ctx: { ipn: { ip, query, body: raw, fields: ipnFields(query, raw) } } });
  await log(orderId, res.outcome);
  return { status: 200, body: { received: true } };
}
