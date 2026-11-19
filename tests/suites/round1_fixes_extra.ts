/**
 * Round 1, part C items 4 to 7: tracing includes, PAYWALL_V2, PAYPAL_USD, LEAD_VALUE_FROM_REPORT.
 * No network, no real Supabase, no email: Supabase is an in-memory fake.
 */
import path from 'path';
import type { Suite } from '../lib/harness';
import { ANCHOR_CASES, buildWizardState } from '../lib/fixtures';
import { withQuietConsole } from '../lib/quiet';
import { TEST_FX, runCase } from '../lib/run_case';
import { buildPdfHtml } from '../../lib/pdf-template';
import { mapWizardToValuationData } from '../../lib/pdf-template/map-from-wizard';
import { runDeliverPaywallV2, runDispatchPaywallV2, REPORT_PENDING_MESSAGE_HE } from '../../lib/payments/paywall_v2';
import { signReportAccessToken, verifyReportAccessToken } from '../../lib/auth/report_access_token';
import { evaluatePaypalAmount } from '../../lib/payments/paypal_amount_policy';
import { applyLeadValueSource, computeReportLeadValues } from '../../lib/crm/report_lead_values';
import { isFlagOn } from '../../lib/flags/round1_flags';

async function withEnv<T>(vars: Record<string, string | undefined>, fn: () => Promise<T> | T): Promise<T> {
  const prior: Record<string, string | undefined> = {};
  for (const k of Object.keys(vars)) {
    prior[k] = process.env[k];
    if (vars[k] === undefined) delete process.env[k];
    else process.env[k] = vars[k];
  }
  try {
    return await fn();
  } finally {
    for (const k of Object.keys(prior)) {
      if (prior[k] === undefined) delete process.env[k];
      else process.env[k] = prior[k];
    }
  }
}

function tracingChecks(suite: Suite): void {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const cfg = require(path.join(__dirname, '..', '..', 'next.config.js'));
  const inc = cfg.experimental.outputFileTracingIncludes as Record<string, string[]>;
  for (const route of ['/api/generate-pdf', '/api/generate-html', '/api/reports/deliver', '/api/v1/reports/valuation/dispatch']) {
    suite.check('tracing-template', route, (inc[route] ?? []).includes('./lib/pdf-template/**'), JSON.stringify(inc[route]));
  }
  for (const route of ['/api/generate-pdf', '/api/reports/deliver', '/api/v1/reports/valuation/dispatch']) {
    suite.check('tracing-chromium', route, (inc[route] ?? []).includes('./node_modules/@sparticuz/chromium/**'), JSON.stringify(inc[route]));
  }
}

/** In-memory stand-in for stripe_transactions (one unused token per email). */
class FakeTokenStore {
  private readonly unused = new Set<string>();
  consumed = 0;
  add(email: string): void {
    this.unused.add(email.toLowerCase());
  }
  async has(email: string): Promise<boolean> {
    return this.unused.has(email.toLowerCase());
  }
  async consume(email: string): Promise<boolean> {
    const ok = this.unused.delete(email.toLowerCase());
    if (ok) this.consumed += 1;
    return ok;
  }
}

async function paywallChecks(suite: Suite): Promise<void> {
  await withEnv({ JWT_SECRET: 'round1-test-secret-not-real', PAYWALL_V2: 'on' }, async () => {
    const email = 'buyer@example.invalid';
    const alerts: string[] = [];
    const alertOffice = (subject: string) => alerts.push(subject);
    const state = buildWizardState(ANCHOR_CASES[0]);

    // e2e happy path: real report data + real HTML build, fake email sender.
    const store = new FakeTokenStore();
    store.add(email);
    let sentHtmlBytes = 0;
    const ok = await runDeliverPaywallV2(
      { email, orderId: 'order-1' },
      {
        hasUnusedToken: (e) => store.has(e),
        consumeToken: (e) => store.consume(e),
        deliver: async () => {
          const data = withQuietConsole(() => mapWizardToValuationData(state, 'R1-E2E', 'he', TEST_FX));
          const html = withQuietConsole(() => buildPdfHtml(data));
          sentHtmlBytes = html.length;
          return { reportId: 'R1-E2E', pdfBytes: html.length, email: { delivered: true } };
        },
        alertOffice,
        mintAccessToken: (e) => signReportAccessToken(e, 'deliver'),
      },
    );
    suite.check('paywall-deliver-success-200', 'c5', ok.status === 200 && sentHtmlBytes > 0);
    suite.check('paywall-token-consumed-after-send', 'c5', store.consumed === 1 && !(await store.has(email)));
    const token = ok.status === 200 ? ok.body.reportAccessToken : '';
    suite.check('paywall-access-token-valid', 'c5', verifyReportAccessToken(token)?.email === email);

    // Build failure: token stays, customer gets the pending message, office alerted with order id.
    const store2 = new FakeTokenStore();
    store2.add(email);
    const fail = await runDeliverPaywallV2(
      { email, orderId: 'order-2' },
      {
        hasUnusedToken: (e) => store2.has(e),
        consumeToken: (e) => store2.consume(e),
        deliver: async () => {
          throw new Error('pdf render failed');
        },
        alertOffice,
        mintAccessToken: (e) => signReportAccessToken(e, 'deliver'),
      },
    );
    suite.check('paywall-deliver-failure-keeps-token', 'c5', fail.status === 502 && store2.consumed === 0 && (await store2.has(email)));
    suite.check('paywall-deliver-failure-message', 'c5', fail.status === 502 && fail.body.message === REPORT_PENDING_MESSAGE_HE);
    suite.check('paywall-deliver-failure-alert', 'c5', alerts.some((a) => a.includes('order-2')));

    // Email not delivered: same as failure.
    const store3 = new FakeTokenStore();
    store3.add(email);
    const noMail = await runDeliverPaywallV2(
      { email, orderId: 'order-3' },
      {
        hasUnusedToken: (e) => store3.has(e),
        consumeToken: (e) => store3.consume(e),
        deliver: async () => ({ pdfBytes: 1000, email: { delivered: false } }),
        alertOffice,
        mintAccessToken: (e) => signReportAccessToken(e, 'deliver'),
      },
    );
    suite.check('paywall-email-failure-keeps-token', 'c5', noMail.status === 502 && store3.consumed === 0);

    // No token: 402, nothing built.
    let built = false;
    const none = await runDeliverPaywallV2(
      { email: 'nobody@example.invalid', orderId: 'order-4' },
      {
        hasUnusedToken: async () => false,
        consumeToken: async () => false,
        deliver: async () => {
          built = true;
          return { pdfBytes: 1, email: { delivered: true } };
        },
        alertOffice,
        mintAccessToken: () => '',
      },
    );
    suite.check('paywall-no-token-402', 'c5', none.status === 402 && !built);

    // Dispatch: email failure is not 202 and the token is not claimed.
    let claimed = 0;
    const d1 = await runDispatchPaywallV2(
      { orderId: 'disp-1' },
      {
        isTokenUnused: async () => true,
        claimToken: async () => {
          claimed += 1;
          return true;
        },
        dispatch: async () => ({ pdfBytes: 5000, emailSent: false, whatsappSent: false }),
        alertOffice,
      },
    );
    suite.check('dispatch-email-failure-not-202', 'c5', d1.status === 502 && claimed === 0);
    const d2 = await runDispatchPaywallV2(
      { orderId: 'disp-2' },
      {
        isTokenUnused: async () => true,
        claimToken: async () => {
          claimed += 1;
          return true;
        },
        dispatch: async () => ({ pdfBytes: 5000, emailSent: true, whatsappSent: false }),
        alertOffice,
      },
    );
    suite.check('dispatch-success-202-claims', 'c5', d2.status === 202 && claimed === 1);

    // Routes: generate-pdf / generate-html require a signed token; legacy v1 pdf is 410.
    const { POST: pdfPost } = await import('../../app/api/generate-pdf/route');
    const { POST: htmlPost } = await import('../../app/api/generate-html/route');
    const { POST: v1Post } = await import('../../app/api/v1/reports/valuation/pdf/route');
    const req = (url: string, headers: Record<string, string> = {}) =>
      new Request(`http://test.local${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: '{}' });
    const r1 = await withQuietConsole(() => pdfPost(req('/api/generate-pdf')));
    suite.check('generate-pdf-requires-token', 'c5', r1.status === 402, String(r1.status));
    const r2 = await withQuietConsole(() => htmlPost(req('/api/generate-html', { Authorization: 'Bearer forged' })));
    suite.check('generate-html-rejects-forged', 'c5', r2.status === 402, String(r2.status));
    const r3 = await withQuietConsole(() => htmlPost(req('/api/generate-html', { Authorization: `Bearer ${token}` })));
    suite.check('generate-html-accepts-signed', 'c5', r3.status !== 402, String(r3.status));
    const r4 = await withQuietConsole(() => v1Post(req('/api/v1/reports/valuation/pdf')));
    suite.check('v1-pdf-gone', 'c5', r4.status === 410, String(r4.status));
  });

  // Flag off: routes behave as before (no token needed).
  await withEnv({ PAYWALL_V2: undefined }, async () => {
    const { POST: htmlPost } = await import('../../app/api/generate-html/route');
    const r = await withQuietConsole(() =>
      htmlPost(new Request('http://test.local/api/generate-html', { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } })),
    );
    suite.check('flag-off-no-token-needed', 'c5', r.status !== 402, String(r.status));
    suite.check('flag-off-default', 'c5', !isFlagOn('PAYWALL_V2'));
  });
}

function paypalChecks(suite: Suite): void {
  const env = {} as unknown as NodeJS.ProcessEnv;
  suite.check('paypal-ils-paid', 'c6', evaluatePaypalAmount(999, 'ILS', env).kind === 'paid');
  suite.check('paypal-ils-underpaid', 'c6', evaluatePaypalAmount(500, 'ILS', env).kind === 'underpaid');
  // Round 13: the English price is $349 (was 299).
  suite.check('paypal-usd-paid', 'c6', evaluatePaypalAmount(349, 'USD', env).kind === 'paid');
  suite.check('paypal-usd-not-read-as-ils', 'c6', evaluatePaypalAmount(349, 'usd', env).kind === 'paid');
  suite.check('paypal-usd-299-underpaid', 'c6', evaluatePaypalAmount(299, 'USD', env).kind === 'underpaid');
  suite.check('paypal-usd-underpaid', 'c6', evaluatePaypalAmount(100, 'USD', env).kind === 'underpaid');
  suite.check('paypal-unknown-currency', 'c6', evaluatePaypalAmount(999, 'EUR', env).kind === 'unsupported_currency');
  suite.check('paypal-missing-currency', 'c6', evaluatePaypalAmount(999, undefined, env).kind === 'unsupported_currency');
  const custom = { PAYPAL_MIN_AMOUNT_USD: '250', PAYPAL_MIN_AMOUNT_ILS: '900' } as unknown as NodeJS.ProcessEnv;
  suite.check('paypal-env-min-usd', 'c6', evaluatePaypalAmount(260, 'USD', custom).kind === 'paid');
  suite.check('paypal-env-min-ils', 'c6', evaluatePaypalAmount(950, 'ILS', custom).kind === 'paid');
}

function leadValueChecks(suite: Suite): void {
  for (const c of ANCHOR_CASES) {
    const report = runCase(c);
    const lead = withQuietConsole(() => computeReportLeadValues(buildWizardState(c), TEST_FX));
    suite.check('lead-value-equals-report', c.id, lead.reportValuationMidpoint === Math.round(report.equityIls ?? report.equity), `${lead.reportValuationMidpoint} vs ${report.equityIls}`);
    suite.check('lead-quality-equals-report', c.id, lead.reportQualityScore === report.qualityScore, `${lead.reportQualityScore} vs ${report.qualityScore}`);
  }
  const body = { event: 'wizard_completed' as const, valuationMidpoint: 100, qualityScore: 78, reportValuationMidpoint: 1_158_290, reportQualityScore: 34 };
  const on = applyLeadValueSource(body, { LEAD_VALUE_FROM_REPORT: 'on' } as unknown as NodeJS.ProcessEnv);
  const off = applyLeadValueSource(body, {} as NodeJS.ProcessEnv);
  suite.check('lead-flag-on-uses-report', 'c7', on.valuationMidpoint === 1_158_290 && on.qualityScore === 34);
  suite.check('lead-flag-off-unchanged', 'c7', off.valuationMidpoint === 100 && off.qualityScore === 78);
}

export async function extraRound1Checks(suite: Suite): Promise<void> {
  tracingChecks(suite);
  await paywallChecks(suite);
  paypalChecks(suite);
  leadValueChecks(suite);
}
