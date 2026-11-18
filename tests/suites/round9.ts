/**
 * Round 9: upay (UPAY) and Green Invoice (GREEN_INVOICE). Recorded answers only, no real calls.
 *   create: the request uses the document's names; a good answer gives the page url; an error code
 *     or a url outside upay.co.il is refused; the card number is never in our request.
 *   settle: paid only when the verifier says paid AND amount and currency match; failed and
 *     cancelled close the order; "unknown" (the default, no status query in the document) releases
 *     nothing; a fake IPN (bad signature, unknown order, verifier says no) is refused; IPN plus return
 *     release once and issue one invoice.
 *   ipn: every call is logged; IP list when set.
 *   invoice: type 320 body, one per order, flag off makes no call.
 *   flag-off: step 4 of the wizard renders exactly as before this round; the routes answer 404.
 */
import fs from 'fs';
import path from 'path';
import { POST as createRoute } from '../../app/api/v1/payments/upay/create/route';
import { GET as ipnGet } from '../../app/api/v1/payments/upay-ipn/route';
import { buildInvoiceBody, issueInvoiceOnce, memoryInvoiceStore, type JsonFetch } from '../../lib/invoices/green_invoice';
import { buildCreatePaymentMsgs, createUpayPayment, parseCreatePaymentResponse, type FetchLike } from '../../lib/payments/upay/upay_client';
import { handleUpayIpn } from '../../lib/payments/upay/upay_ipn';
import { memoryUpayOrderStore, signOrderId } from '../../lib/payments/upay/upay_orders';
import { UNDOCUMENTED_STATUS_VERIFIER, settleUpayOrder, type ReleaseFn, type UpayVerifier } from '../../lib/payments/upay/upay_settle';
import { ipAllowed, orderIdFromComment } from '../../lib/payments/upay/upay_wiring';
import { renderStep4 } from '../lib/render_step4';
import { Suite, type SuiteResult } from '../lib/harness';
import { withQuietConsole } from '../lib/quiet';

const FIX = path.join(__dirname, '..', 'fixtures', 'upay');
const rec = (n: string) => JSON.parse(fs.readFileSync(path.join(FIX, n), 'utf8')) as unknown;
const CFG = { email: 'merchant@example.invalid', key: 'test-key-not-real', live: false };

async function withEnv<T>(env: Record<string, string | undefined>, fn: () => Promise<T> | T): Promise<T> {
  const prev: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(env)) {
    prev[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

export async function run(): Promise<SuiteResult> {
  const s = new Suite('round9');
  const env = { UPAY_API_KEY: CFG.key, UPAY: 'on', GREEN_INVOICE: 'on', UPAY_IPN_IPS: undefined };

  // create
  const msgs = buildCreatePaymentMsgs(CFG, { orderId: 'o1', amount: 999, currency: 'USD', returnUrl: 'https://equify.co.il/payment/upay/return?order=o1&sig=x' }) as Array<{ header: Record<string, unknown>; request: { mainaction: string; minoraction: string; parameters: Record<string, unknown> } }>;
  const text = JSON.stringify(msgs);
  s.check('create', 'documented-names', msgs[0]!.header.refername === 'UPAY' && msgs[0]!.header.livesystem === 0 && msgs[0]!.request.minoraction === 'LOGIN' && msgs[1]!.request.mainaction === 'CASHIER' && msgs[1]!.request.minoraction === 'REDIRECTDEPOSITCREDITCARDTRANSFER');
  const tr = (msgs[1]!.request.parameters.transfers as Array<Record<string, string>>)[0]!;
  s.check('create', 'transfer-fields', tr.amount === '999.00' && tr.numberpayments === '1' && tr.currency === 'USD' && tr.comment.includes('o1') && tr.returnurl.includes('order=o1'));
  s.check('create', 'no-card-fields', !/cardnumber|cvv|expiry|identitynumber|DEPOSITCREDITCARDTRANSFER"/i.test(text.replace('REDIRECTDEPOSITCREDITCARDTRANSFER', '')));
  const good = parseCreatePaymentResponse(rec('create-ok.json'));
  s.check('create', 'ok-response', good.ok && good.cashierId === '305305' && good.url.startsWith('https://app.upay.co.il/'));
  s.check('create', 'error-code', !parseCreatePaymentResponse(rec('create-fail.json')).ok);
  s.check('create', 'foreign-url-refused', !parseCreatePaymentResponse(rec('create-foreign-url.json')).ok);
  let sentBody = '';
  const fetchOk: FetchLike = async (_u, init) => {
    sentBody = init.body;
    return { ok: true, status: 200, json: async () => rec('create-ok.json') };
  };
  const created = await createUpayPayment(CFG, { orderId: 'o2', amount: 999, currency: 'ILS', returnUrl: 'https://equify.co.il/x' }, fetchOk);
  s.check('create', 'form-msgs', created.ok && sentBody.startsWith('msgs=') && !decodeURIComponent(sentBody).includes('"currency"'));

  // settle and IPN
  await withEnv(env, async () => {
    const mk = async () => {
      const store = memoryUpayOrderStore();
      const id = '3f2a8c10-1111-4a22-9b33-0123456789ab';
      await store.create({ id, email: 'buyer@example.invalid', amount: 999, currency: 'ILS', status: 'redirected', cashierId: '305305', createdAt: new Date().toISOString() });
      return { store, id };
    };
    let releases = 0;
    const release: ReleaseFn = async () => {
      releases += 1;
      return { ok: true, dispatchToken: 'dispatch-token-test' };
    };
    const paid: UpayVerifier = async () => ({ status: 'paid', amount: 999, currency: 'ILS', cashierId: '305305' });

    {
      const { store, id } = await mk();
      const r = await settleUpayOrder(id, { store, verify: UNDOCUMENTED_STATUS_VERIFIER, release });
      s.check('settle', 'default-verifier-releases-nothing', r.outcome === 'not_verified' && releases === 0 && !(await store.get(id))!.releasedAt);
    }
    for (const [name, v, want] of [
      ['failed', (async () => ({ status: 'failed' })) as UpayVerifier, 'failed'],
      ['cancelled', (async () => ({ status: 'cancelled' })) as UpayVerifier, 'cancelled'],
      ['amount-mismatch', (async () => ({ status: 'paid', amount: 1, currency: 'ILS', cashierId: '305305' })) as UpayVerifier, 'amount_mismatch'],
      ['currency-mismatch', (async () => ({ status: 'paid', amount: 999, currency: 'USD', cashierId: '305305' })) as UpayVerifier, 'currency_mismatch'],
      ['other-transaction', (async () => ({ status: 'paid', amount: 999, currency: 'ILS', cashierId: '999' })) as UpayVerifier, 'amount_mismatch'],
    ] as const) {
      const { store, id } = await mk();
      const before = releases;
      const r = await settleUpayOrder(id, { store, verify: v, release });
      s.check('settle', name, r.outcome === want && releases === before, r.outcome);
    }
    {
      const { store, id } = await mk();
      const invoices = memoryInvoiceStore();
      let invoiceCalls = 0;
      const giFetch: JsonFetch = async (u) => {
        invoiceCalls += 1;
        return { ok: true, status: u.includes('token') ? 200 : 201, json: async () => rec(u.includes('token') ? 'green-token.json' : 'green-document.json') };
      };
      const afterPaid = async () => {
        await issueInvoiceOnce({ orderKey: `upay:${id}`, customerName: '', customerEmail: 'buyer@example.invalid', amount: 999, currency: 'ILS', method: 'credit_card', transactionId: '305305', date: '2026-11-18' }, { store: invoices, fetchImpl: giFetch, config: { clientId: 'a', clientSecret: 'b', live: false } });
      };
      const before = releases;
      const sig = signOrderId(id);
      const ipnReq = new Request(`https://equify.co.il/api/v1/payments/upay-ipn?order=${id}&sig=${sig}`, { method: 'POST', body: 'x=1' });
      const a = await handleUpayIpn(ipnReq, { store, verify: paid, release, afterPaid });
      const b = await settleUpayOrder(id, { store, verify: paid, release, afterPaid });
      const c = await handleUpayIpn(new Request(`https://equify.co.il/api/v1/payments/upay-ipn?order=${id}&sig=${sig}`), { store, verify: paid, release, afterPaid });
      const o = (await store.get(id))!;
      s.check('settle', 'ipn-then-return-release-once', a.status === 200 && b.outcome === 'already_released' && c.status === 200 && releases === before + 1 && o.status === 'paid' && o.dispatchToken === 'dispatch-token-test');
      s.check('invoice', 'one-per-order', invoiceCalls === 2 && invoices.rows.size === 1);
      s.check('ipn', 'every-call-logged', store.ipnLog.length === 2);
    }
    {
      const { store, id } = await mk();
      const before = releases;
      const fake = await handleUpayIpn(new Request(`https://equify.co.il/api/v1/payments/upay-ipn?order=${id}&sig=forged`), { store, verify: paid, release });
      s.check('ipn', 'forged-signature-refused', fake.status === 403 && releases === before && (store.ipnLog[0] as { outcome: string }).outcome === 'bad_signature');
      const noVerify = await handleUpayIpn(new Request('https://equify.co.il/api/v1/payments/upay-ipn', { method: 'POST', body: `comment=${encodeURIComponent(`equify order ${id}`)}&status=paid&amount=999` }), { store, verify: UNDOCUMENTED_STATUS_VERIFIER, release });
      s.check('ipn', 'fake-paid-claim-not-released', noVerify.status === 200 && releases === before && !(await store.get(id))!.releasedAt);
      const unknown = await handleUpayIpn(new Request('https://equify.co.il/api/v1/payments/upay-ipn', { method: 'POST', body: 'comment=hello' }), { store, verify: paid, release });
      s.check('ipn', 'no-order', unknown.status === 200 && releases === before);
    }
    await withEnv({ UPAY_IPN_IPS: '203.0.113.5' }, async () => {
      const { store } = await mk();
      const blocked = await handleUpayIpn(new Request('https://equify.co.il/api/v1/payments/upay-ipn', { headers: { 'x-forwarded-for': '198.51.100.7' } }), { store, verify: paid, release });
      s.check('ipn', 'ip-list', blocked.status === 403 && ipAllowed('203.0.113.5') && !ipAllowed('198.51.100.7'));
    });
  });
  s.check('ipn', 'order-from-comment', orderIdFromComment('equify order 3F2A8C10-1111-4A22-9B33-0123456789AB') === '3f2a8c10-1111-4a22-9b33-0123456789ab' && orderIdFromComment('x') === null);

  // invoice
  const body = buildInvoiceBody({ orderKey: 'paypal:CAP1', customerName: '', customerEmail: 'b@example.invalid', amount: 999, currency: 'ILS', method: 'paypal', transactionId: 'CAP1', date: '2026-11-18' }) as { type: number; payment: Array<{ type: number; transactionId?: string }>; income: Array<{ vatType: number }> };
  s.check('invoice', 'body', body.type === 320 && body.payment[0]!.type === 5 && body.payment[0]!.transactionId === 'CAP1' && body.income[0]!.vatType === 1);
  let offCalls = 0;
  const offOut = await withEnv({ GREEN_INVOICE: undefined }, () =>
    issueInvoiceOnce({ orderKey: 'k', customerName: '', customerEmail: 'b@example.invalid', amount: 999, currency: 'ILS', method: 'credit_card', transactionId: '1', date: '2026-11-18' }, { store: memoryInvoiceStore(), fetchImpl: async () => { offCalls += 1; return { ok: true, status: 200, json: async () => ({}) }; }, config: { clientId: 'a', clientSecret: 'b', live: false } }),
  );
  s.check('invoice', 'flag-off-no-call', offOut.outcome === 'off' && offCalls === 0);
  const failOut = await withEnv({ GREEN_INVOICE: 'on' }, () =>
    withQuietConsole(() => issueInvoiceOnce({ orderKey: 'k2', customerName: '', customerEmail: 'b@example.invalid', amount: 999, currency: 'ILS', method: 'credit_card', transactionId: '1', date: '2026-11-18' }, { store: memoryInvoiceStore(), fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({}) }), config: { clientId: 'a', clientSecret: 'b', live: false } })),
  );
  s.check('invoice', 'api-failure-recorded', failOut.outcome === 'failed');

  // flag off: step 4 unchanged, routes 404.
  await withEnv({ NEXT_PUBLIC_UPAY: undefined }, () => {
    s.check('flag-off', 'step4-identical', renderStep4() === fs.readFileSync(path.join(FIX, 'step4-before.html'), 'utf8'));
    s.check('flag-off', 'step4-paypal-identical', renderStep4({ hostedButtonId: 'TEST-BUTTON' }) === fs.readFileSync(path.join(FIX, 'step4-before-paypal.html'), 'utf8'));
  });
  await withEnv({ UPAY: undefined }, async () => {
    const c = await withQuietConsole(() => createRoute(new Request('https://equify.co.il/api/v1/payments/upay/create', { method: 'POST', body: '{}' })));
    const i = await withQuietConsole(() => ipnGet(new Request('https://equify.co.il/api/v1/payments/upay-ipn')));
    s.check('flag-off', 'routes-404', c.status === 404 && i.status === 404);
  });
  return s.result;
}
