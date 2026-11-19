/**
 * Round 14, stage 1: upay ready for the day it answers. Recorded sample answers only, no real call.
 *   choice:   UPAY_VERIFIER picks one of three verifiers; default "none" releases nothing; an
 *             unconfirmed config section runs only with UPAY_ENV=demo.
 *   A status query, B signed IPN, C IPN from a known IP plus asking again: paid, failed, cancelled,
 *             forged, tampered, other transaction, wrong amount or currency.
 *   env:      UPAY_ENV=demo is demo.upay.co.il with livesystem 0; the demo script refuses otherwise.
 *   usd:      $349 through upay only with EN_SITE=on; currency USD in the request; English invoice.
 *   invoice:  recorded refusals of the token and of the document.
 *   internal: /internal/payments needs PULSE_TOKEN and UPAY or GREEN_INVOICE; cookie is an HMAC; emails masked.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { POST as createRoute } from '../../app/api/v1/payments/upay/create/route';
import { POST as sessionRoute } from '../../app/api/internal/session/route';
import { buildInvoiceBody, issueInvoiceOnce, memoryInvoiceStore, type JsonFetch } from '../../lib/invoices/green_invoice';
import { INTERNAL_COOKIE, internalAccessOk, internalCookieValue, internalPagesAvailable, loadPaymentsOverview, maskEmail, paymentsStatus, type ReadDb } from '../../lib/internal/payments_admin';
import { UPAY_ANSWER_CONFIG, type UpayAnswerConfig } from '../../lib/payments/upay/upay_answer_config';
import { buildCreatePaymentMsgs, readUpayConfig, upayPrice, upayUrl, type FetchLike } from '../../lib/payments/upay/upay_client';
import { handleUpayIpn, ipnFields } from '../../lib/payments/upay/upay_ipn';
import { memoryUpayOrderStore, type UpayOrder } from '../../lib/payments/upay/upay_orders';
import { settleUpayOrder, UNDOCUMENTED_STATUS_VERIFIER, type ReleaseFn, type UpayVerifier, type VerifyContext } from '../../lib/payments/upay/upay_settle';
import { buildStatusQueryMsgs, describeVerifier, ipRequeryVerifier, ipnSignature, selectUpayVerifier, signedIpnVerifier, statusQueryVerifier, type TextFetch } from '../../lib/payments/upay/upay_verifiers';
import { Suite, type SuiteResult } from '../lib/harness';
import { withQuietConsole } from '../lib/quiet';

const ROOT = path.join(__dirname, '..', '..');
const FIX = path.join(__dirname, '..', 'fixtures', 'upay', 'round14');
const json = (n: string) => JSON.parse(fs.readFileSync(path.join(FIX, n), 'utf8')) as unknown;
const text = (n: string) => fs.readFileSync(path.join(FIX, n), 'utf8').trim();
const CFG = { email: 'merchant@example.invalid', key: 'test-key-not-real', live: false };
const SECRET = 'test-ipn-secret-not-real';
const ORDER_ID = '3f2a8c10-1111-4a22-9b33-0123456789ab';

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

const confirmedAll = (c: UpayAnswerConfig): UpayAnswerConfig => ({
  statusQuery: { ...c.statusQuery, confirmed: true },
  signedIpn: { ...c.signedIpn, confirmed: true },
  ipRequery: { ...c.ipRequery, confirmed: true },
});

function order(p: Partial<UpayOrder> = {}): UpayOrder {
  return { id: ORDER_ID, email: 'buyer@example.invalid', amount: 999, currency: 'ILS', status: 'redirected', cashierId: '305305', createdAt: new Date().toISOString(), ...p };
}

function ipnCtx(body: string, ip: string | null = '203.0.113.5'): VerifyContext {
  return { ipn: { ip, query: {}, body, fields: ipnFields({}, body) } };
}

export async function run(): Promise<SuiteResult> {
  const s = new Suite('round14-upay');
  let releases = 0;
  const release: ReleaseFn = async () => {
    releases += 1;
    return { ok: true, dispatchToken: 'dispatch-token-test' };
  };
  const settleWith = async (v: UpayVerifier, o: UpayOrder = order(), ctx?: VerifyContext) => {
    const store = memoryUpayOrderStore();
    await store.create(o);
    const before = releases;
    const r = await settleUpayOrder(o.id, { store, verify: v, release, ctx });
    return { outcome: r.outcome, released: releases - before, order: (await store.get(o.id))! };
  };

  // ---------- choice ----------
  await withEnv({ UPAY_VERIFIER: undefined, UPAY_ENV: undefined }, () => {
    const d = describeVerifier();
    s.check('choice', 'default-none', d.name === 'none' && d.active === 'none' && selectUpayVerifier() === UNDOCUMENTED_STATUS_VERIFIER);
  });
  await withEnv({ UPAY_VERIFIER: 'bogus', UPAY_ENV: 'demo' }, () => s.check('choice', 'unknown-value-is-none', describeVerifier().active === 'none'));
  for (const name of ['status_query', 'signed_ipn', 'ip_requery'] as const) {
    await withEnv({ UPAY_VERIFIER: name, UPAY_ENV: 'live', UPAY_LIVE: undefined }, () => {
      s.check('choice', `${name}-unconfirmed-live-is-none`, describeVerifier().active === 'none' && selectUpayVerifier() === UNDOCUMENTED_STATUS_VERIFIER);
      s.check('choice', `${name}-confirmed-live-active`, describeVerifier(process.env, confirmedAll(UPAY_ANSWER_CONFIG)).active === name);
    });
    await withEnv({ UPAY_VERIFIER: name, UPAY_ENV: 'demo' }, () => s.check('choice', `${name}-demo-active`, describeVerifier().active === name && selectUpayVerifier() !== UNDOCUMENTED_STATUS_VERIFIER));
  }
  s.check('choice', 'shipped-config-unconfirmed', !UPAY_ANSWER_CONFIG.statusQuery.confirmed && !UPAY_ANSWER_CONFIG.signedIpn.confirmed && !UPAY_ANSWER_CONFIG.ipRequery.confirmed);
  {
    const r = await settleWith(UNDOCUMENTED_STATUS_VERIFIER);
    s.check('choice', 'none-releases-nothing', r.outcome === 'not_verified' && r.released === 0);
  }

  // ---------- A. status query ----------
  const msgs = JSON.stringify(buildStatusQueryMsgs(CFG, '305305'));
  s.check('A', 'request-uses-config', msgs.includes(`"minoraction":"${UPAY_ANSWER_CONFIG.statusQuery.minoraction}"`) && msgs.includes('"cashierid":"305305"') && msgs.includes('"LOGIN"') && !/cardnumber|cvv/i.test(msgs));
  const fetchJson = (n: string, status = 200): FetchLike => async () => ({ ok: status < 400, status, json: async () => json(n) });
  const A = (n: string, status = 200) => statusQueryVerifier({ config: CFG, fetchImpl: fetchJson(n, status) });
  {
    const r = await settleWith(A('status-paid.json'));
    s.check('A', 'paid-released', r.outcome === 'released' && r.released === 1 && r.order.status === 'paid');
    const usd = await settleWith(A('status-paid-usd.json'), order({ amount: 349, currency: 'USD', cashierId: '305306' }));
    s.check('A', 'paid-usd-released', usd.outcome === 'released' && usd.released === 1);
    const usdOnIls = await settleWith(A('status-paid-usd.json'), order({ cashierId: '305306' }));
    s.check('A', 'usd-answer-ils-order-refused', usdOnIls.released === 0 && (usdOnIls.outcome === 'amount_mismatch' || usdOnIls.outcome === 'currency_mismatch'), usdOnIls.outcome);
    for (const [n, want] of [['status-failed.json', 'failed'], ['status-cancelled.json', 'cancelled'], ['status-error.json', 'not_verified'], ['status-other-cashier.json', 'not_verified'], ['status-low-amount.json', 'amount_mismatch']] as const) {
      const x = await settleWith(A(n));
      s.check('A', n.replace('.json', ''), x.outcome === want && x.released === 0, x.outcome);
    }
    const http = await settleWith(A('status-paid.json', 500));
    s.check('A', 'http-error-not-released', http.outcome === 'not_verified' && http.released === 0);
    const noCfg = await statusQueryVerifier({ config: null })(order());
    s.check('A', 'no-config-unknown', noCfg.status === 'unknown');
    const noCashier = await statusQueryVerifier({ config: CFG, fetchImpl: fetchJson('status-paid.json') })(order({ cashierId: null }));
    s.check('A', 'no-cashier-id-unknown', noCashier.status === 'unknown');
  }

  // ---------- B. signed IPN ----------
  {
    const B = signedIpnVerifier({ secret: SECRET });
    const good = text('ipn-signed-paid.txt');
    const r = await settleWith(B, order(), ipnCtx(good));
    s.check('B', 'signed-paid-released', r.outcome === 'released' && r.released === 1);
    s.check('B', 'recorded-signature-matches', ipnSignature(ipnFields({}, good), SECRET) === new URLSearchParams(good).get('signature'));
    const tampered = good.replace('totalamount=999.00', 'totalamount=9.00');
    s.check('B', 'tampered-refused', (await settleWith(B, order(), ipnCtx(tampered))).released === 0);
    const unsigned = text('ipn-plain-paid.txt');
    s.check('B', 'unsigned-refused', (await settleWith(B, order(), ipnCtx(unsigned))).released === 0);
    s.check('B', 'wrong-secret-refused', (await settleWith(signedIpnVerifier({ secret: 'another' }), order(), ipnCtx(good))).released === 0);
    const noSecret = await withEnv({ UPAY_IPN_SECRET: undefined }, () => settleWith(signedIpnVerifier(), order(), ipnCtx(good)));
    s.check('B', 'no-secret-refused', noSecret.released === 0);
    s.check('B', 'return-page-waits-for-ipn', (await settleWith(B)).outcome === 'not_verified');
    s.check('B', 'other-transaction-refused', (await settleWith(B, order({ cashierId: '999' }), ipnCtx(good))).released === 0);
    const md5 = signedIpnVerifier({ secret: SECRET, conf: { ...UPAY_ANSWER_CONFIG.signedIpn, algorithm: 'md5-concat', signedFields: ['cashierid', 'totalamount', 'status'] } });
    s.check('B', 'md5-variant', (await settleWith(md5, order(), ipnCtx(text('ipn-md5-paid.txt')))).outcome === 'released');
    // Through the IPN route handler: the order comes from the comment, release once, the second IPN does nothing.
    await withEnv({ UPAY_API_KEY: CFG.key, UPAY_IPN_IPS: undefined }, async () => {
      const store = memoryUpayOrderStore();
      await store.create(order());
      const before = releases;
      const mk = () => new Request('https://equify.co.il/api/v1/payments/upay-ipn', { method: 'POST', body: good, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      const a = await handleUpayIpn(mk(), { store, verify: B, release });
      const b = await handleUpayIpn(mk(), { store, verify: B, release });
      const outcomes = store.ipnLog.map((e) => (e as { outcome: string }).outcome).join(',');
      s.check('B', 'ipn-route-release-once', a.status === 200 && b.status === 200 && releases === before + 1 && outcomes === 'released,already_released', outcomes);
    });
  }

  // ---------- C. known IP, then ask again ----------
  {
    const body = text('ipn-plain-paid.txt');
    let posted = '';
    const back = (n: string): TextFetch => async (_u, init) => {
      posted = init.body;
      return { ok: true, status: 200, text: async () => text(n) };
    };
    const C = (n: string, p: Partial<Parameters<typeof ipRequeryVerifier>[0]> = {}) => ipRequeryVerifier({ ips: '203.0.113.5', verifyUrl: 'https://app.upay.co.il/ipn/verify', fetchText: back(n), ...p });
    const r = await settleWith(C('postback-verified.txt'), order(), ipnCtx(body));
    s.check('C', 'listed-ip-verified-released', r.outcome === 'released' && posted === body);
    s.check('C', 'postback-invalid-refused', (await settleWith(C('postback-invalid.txt'), order(), ipnCtx(body))).released === 0);
    s.check('C', 'ip-not-listed-refused', (await settleWith(C('postback-verified.txt'), order(), ipnCtx(body, '198.51.100.7'))).released === 0);
    s.check('C', 'empty-list-refused', (await settleWith(C('postback-verified.txt', { ips: '' }), order(), ipnCtx(body))).released === 0);
    s.check('C', 'verify-url-not-upay-refused', (await settleWith(C('postback-verified.txt', { verifyUrl: 'https://evil.example/verify' }), order(), ipnCtx(body))).released === 0);
    s.check('C', 'return-page-waits-for-ipn', (await settleWith(C('postback-verified.txt'))).outcome === 'not_verified');
    const viaStatus = ipRequeryVerifier({ ips: '203.0.113.5', conf: { ...UPAY_ANSWER_CONFIG.ipRequery, mode: 'status_query' }, statusQuery: A('status-paid.json') });
    s.check('C', 'status-query-mode', (await settleWith(viaStatus, order(), ipnCtx(body))).outcome === 'released');
    const viaStatusFailed = ipRequeryVerifier({ ips: '203.0.113.5', conf: { ...UPAY_ANSWER_CONFIG.ipRequery, mode: 'status_query' }, statusQuery: A('status-failed.json') });
    s.check('C', 'status-query-mode-failed', (await settleWith(viaStatusFailed, order(), ipnCtx(body))).outcome === 'failed');
  }

  // ---------- env: demo ----------
  await withEnv({ UPAY_EMAIL: 'm@example.invalid', UPAY_API_KEY: 'k', UPAY_ENV: 'demo', UPAY_LIVE: '1' }, () => {
    const c = readUpayConfig()!;
    const m = buildCreatePaymentMsgs(c, { orderId: 'o', amount: 999, currency: 'ILS', returnUrl: 'https://equify.co.il/x' }) as Array<{ header: { livesystem: number } }>;
    s.check('env', 'demo-server-livesystem-0', c.demo === true && !c.live && upayUrl(c).startsWith('https://demo.upay.co.il/') && m[0]!.header.livesystem === 0);
  });
  await withEnv({ UPAY_EMAIL: 'm@example.invalid', UPAY_API_KEY: 'k', UPAY_ENV: 'live' }, () => s.check('env', 'live', upayUrl(readUpayConfig()!).startsWith('https://app.upay.co.il/')));
  await withEnv({ UPAY_EMAIL: 'm@example.invalid', UPAY_API_KEY: 'k', UPAY_ENV: undefined, UPAY_LIVE: '1' }, () => s.check('env', 'legacy-upay-live', readUpayConfig()!.live));
  {
    const tsx = path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
    const env = { ...process.env, UPAY_ENV: '', UPAY_EMAIL: '', UPAY_API_KEY: '' };
    const r = spawnSync(process.execPath, [tsx, 'scripts/round-14/upay-demo-transaction.ts'], { cwd: ROOT, env, encoding: 'utf8', timeout: 60_000 });
    s.check('env', 'demo-script-refuses-without-demo', r.status === 2 && /UPAY_ENV=demo/.test(r.stderr), String(r.status));
    const g = spawnSync(process.execPath, [tsx, 'scripts/round-14/green-invoice-sandbox.ts'], { cwd: ROOT, env: { ...process.env, GREEN_INVOICE_API_ID: 'a', GREEN_INVOICE_API_SECRET: 'b', GREEN_INVOICE_LIVE: '1' }, encoding: 'utf8', timeout: 60_000 });
    s.check('invoice', 'sandbox-script-refuses-live', g.status === 2 && /Sandbox only/.test(g.stderr), String(g.status));
  }

  // ---------- USD ----------
  await withEnv({ EN_SITE: undefined }, () => s.check('usd', 'usd-needs-en-site', upayPrice('USD') === null && upayPrice('ILS')?.amount === 999));
  await withEnv({ EN_SITE: 'on' }, () => s.check('usd', 'usd-349', upayPrice('USD')?.amount === 349 && upayPrice('USD')?.currency === 'USD'));
  {
    const m = JSON.stringify(buildCreatePaymentMsgs(CFG, { orderId: 'o', amount: 349, currency: 'USD', returnUrl: 'https://equify.co.il/x' }));
    s.check('usd', 'request-currency-usd', m.includes('"currency":"USD"') && m.includes('"amount":"349.00"'));
    const ils = JSON.stringify(buildCreatePaymentMsgs(CFG, { orderId: 'o', amount: 999, currency: 'ILS', returnUrl: 'https://equify.co.il/x' }));
    s.check('usd', 'ils-request-unchanged', !ils.includes('"currency"'));
  }
  await withEnv({ UPAY: 'on', UPAY_EMAIL: 'm@example.invalid', UPAY_API_KEY: 'k', EN_SITE: undefined }, async () => {
    const r = await withQuietConsole(() => createRoute(new Request('https://equify.co.il/api/v1/payments/upay/create', { method: 'POST', body: JSON.stringify({ email: 'b@example.invalid', currency: 'USD' }) })));
    s.check('usd', 'create-route-refuses-usd-when-en-off', r.status === 400);
  });
  {
    const usd = buildInvoiceBody({ orderKey: 'upay:x', customerName: '', customerEmail: 'b@example.invalid', amount: 349, currency: 'USD', method: 'credit_card', transactionId: '1', date: '2026-11-19' }) as { lang: string; currency: string; income: Array<{ price: number; currency: string }> };
    s.check('usd', 'invoice-english-usd', usd.lang === 'en' && usd.currency === 'USD' && usd.income[0]!.price === 349);
    const ils = buildInvoiceBody({ orderKey: 'upay:x', customerName: '', customerEmail: 'b@example.invalid', amount: 999, currency: 'ILS', method: 'credit_card', transactionId: '1', date: '2026-11-19' }) as { lang: string; description: string; income: Array<{ description: string }> };
    s.check('invoice', 'ils-body-unchanged', ils.lang === 'he' && ils.description === 'דוח הערכת שווי' && ils.income[0]!.description === 'דוח הערכת שווי equify');
  }

  // ---------- invoice: recorded refusals ----------
  await withEnv({ GREEN_INVOICE: 'on' }, async () => {
    const req = { orderKey: 'k-r14', customerName: '', customerEmail: 'b@example.invalid', amount: 999, currency: 'ILS' as const, method: 'credit_card' as const, transactionId: '1', date: '2026-11-19' };
    const tokenFail: JsonFetch = async () => ({ ok: false, status: 401, json: async () => json('green-token-fail.json') });
    const st1 = memoryInvoiceStore();
    const a = await withQuietConsole(() => issueInvoiceOnce(req, { store: st1, fetchImpl: tokenFail, config: { clientId: 'a', clientSecret: 'b', live: false } }));
    s.check('invoice', 'token-refused-recorded', a.outcome === 'failed' && (st1.rows.get('k-r14') as { status: string }).status === 'failed');
    const docFail: JsonFetch = async (u) => (u.includes('token') ? { ok: true, status: 200, json: async () => ({ accessToken: 't' }) } : { ok: false, status: 400, json: async () => json('green-document-error.json') });
    const st2 = memoryInvoiceStore();
    const b = await withQuietConsole(() => issueInvoiceOnce(req, { store: st2, fetchImpl: docFail, config: { clientId: 'a', clientSecret: 'b', live: false } }));
    s.check('invoice', 'document-refused-recorded', b.outcome === 'failed' && /document_http_400/.test(b.reason ?? ''));
  });

  // ---------- internal page ----------
  await withEnv({ PULSE_TOKEN: undefined, UPAY: 'on', GREEN_INVOICE: undefined }, () => s.check('internal', 'no-token-404', !internalPagesAvailable()));
  await withEnv({ PULSE_TOKEN: 'pulse-test-token', UPAY: undefined, GREEN_INVOICE: undefined }, async () => {
    s.check('internal', 'flags-off-404', !internalPagesAvailable());
    const r = await sessionRoute(new Request('https://equify.co.il/api/internal/session', { method: 'POST', body: new URLSearchParams({ token: 'pulse-test-token' }) }));
    s.check('internal', 'session-route-404-when-off', r.status === 404);
  });
  await withEnv({ PULSE_TOKEN: 'pulse-test-token', UPAY: 'on', UPAY_EMAIL: 'merchant@example.invalid', UPAY_API_KEY: 'super-secret-key', UPAY_IPN_SECRET: 'ipn-secret-value' }, async () => {
    s.check('internal', 'available', internalPagesAvailable());
    const cookie = internalCookieValue();
    s.check('internal', 'cookie-is-not-token', cookie !== 'pulse-test-token' && !cookie.includes('pulse-test-token'));
    s.check('internal', 'access', internalAccessOk({ cookie }) && internalAccessOk({ bearer: 'pulse-test-token' }) && !internalAccessOk({ cookie: 'x' }) && !internalAccessOk({ bearer: 'nope' }) && !internalAccessOk({}));
    const ok = await sessionRoute(new Request('https://equify.co.il/api/internal/session', { method: 'POST', body: new URLSearchParams({ token: 'pulse-test-token' }) }));
    const set = ok.headers.get('set-cookie') ?? '';
    s.check('internal', 'session-sets-httponly-cookie', ok.status === 303 && set.includes(`${INTERNAL_COOKIE}=${cookie}`) && /HttpOnly/i.test(set) && /SameSite=strict/i.test(set));
    const bad = await sessionRoute(new Request('https://equify.co.il/api/internal/session', { method: 'POST', body: new URLSearchParams({ token: 'wrong' }) }));
    s.check('internal', 'session-wrong-token-no-cookie', bad.status === 303 && !bad.headers.get('set-cookie') && (bad.headers.get('location') ?? '').includes('denied=1'));
    const st = JSON.stringify(paymentsStatus());
    s.check('internal', 'status-has-no-secrets', !st.includes('super-secret-key') && !st.includes('ipn-secret-value') && !st.includes('merchant@example.invalid') && st.includes('"upay":"on"'));
    const tables: Record<string, unknown[]> = {
      upay_orders: [{ id: ORDER_ID, email: 'buyer@example.invalid', amount: '999.00', currency: 'ILS', status: 'paid', cashier_id: '305305', released_at: '2026-11-19T10:00:00Z', dispatch_token: 'secret-dispatch-token', created_at: '2026-11-19T09:59:00Z' }],
      upay_ipn_log: [{ id: 1, order_id: ORDER_ID, ip: '203.0.113.5', outcome: 'released', created_at: '2026-11-19T10:00:00Z' }],
      invoice_documents: [{ order_key: `upay:${ORDER_ID}`, status: 'issued', document_number: 40034, error: null, created_at: '2026-11-19T10:00:01Z' }],
    };
    const fake: ReadDb = { from: (t) => ({ select: () => ({ order: () => ({ limit: async () => ({ data: tables[t] ?? [], error: null }) }) }) }) };
    const o = await loadPaymentsOverview(fake);
    const dump = JSON.stringify(o);
    s.check('internal', 'overview-rows', o.db === 'ok' && o.orders.length === 1 && o.orders[0]!.released && o.ipn.length === 1 && o.invoices[0]!.documentNumber === 40034);
    s.check('internal', 'overview-masks', o.orders[0]!.email === 'bu***@example.invalid' && !dump.includes('secret-dispatch-token') && !dump.includes('buyer@'));
    s.check('internal', 'overview-no-db', (await loadPaymentsOverview(null)).db === 'not_configured');
  });
  s.check('internal', 'mask', maskEmail('ab@c.com') === 'ab***@c.com' && maskEmail('') === '');
  return s.result;
}
