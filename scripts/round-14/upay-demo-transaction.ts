/**
 * Round 14: one test transaction on upay's demo server, the day we get a test account.
 *
 *   UPAY_ENV=demo UPAY_EMAIL=<test account mail> UPAY_API_KEY=<test key> npx tsx scripts/round-14/upay-demo-transaction.ts [--usd] [--status <cashierid>]
 *
 * Refuses to run unless UPAY_ENV=demo (demo.upay.co.il, livesystem 0): no real card is charged.
 * Writes nothing to our database and sends no mail. It prints the payment page link; pay there with
 * upay's test card, then run again with --status <cashierid> to see what the status query answers
 * (only if upay gave us one; see lib/payments/upay/upay_answer_config.ts).
 * The key is read from the environment only, and never printed.
 */
import { randomUUID } from 'crypto';
import { createUpayPayment, readUpayConfig, upayEnvMode, upayUrl, UPAY_ILS_AMOUNT, UPAY_USD_AMOUNT } from '../../lib/payments/upay/upay_client';
import { buildStatusQueryMsgs, statusQueryVerifier } from '../../lib/payments/upay/upay_verifiers';

async function main() {
  if (upayEnvMode() !== 'demo') {
    console.error('Refusing: set UPAY_ENV=demo (test server, livesystem 0).');
    process.exit(2);
  }
  const cfg = readUpayConfig();
  if (!cfg) {
    console.error('Missing UPAY_EMAIL or UPAY_API_KEY (the test account).');
    process.exit(2);
  }
  if (cfg.live || !upayUrl(cfg).startsWith('https://demo.upay.co.il/')) {
    console.error('Refusing: not the demo server.');
    process.exit(2);
  }
  const args = process.argv.slice(2);
  const statusIdx = args.indexOf('--status');
  if (statusIdx >= 0) {
    const cashierId = args[statusIdx + 1] ?? '';
    console.log('Status request (key hidden):', JSON.stringify(buildStatusQueryMsgs({ ...cfg, key: '***' }, cashierId)));
    const answer = await statusQueryVerifier({ config: cfg })({ id: 'demo', email: cfg.email, amount: 0, currency: 'ILS', status: 'redirected', cashierId, createdAt: new Date().toISOString() });
    console.log('Verifier answer:', JSON.stringify(answer));
    return;
  }
  const usd = args.includes('--usd');
  const orderId = randomUUID();
  const res = await createUpayPayment(cfg, {
    orderId,
    amount: usd ? UPAY_USD_AMOUNT : UPAY_ILS_AMOUNT,
    currency: usd ? 'USD' : 'ILS',
    returnUrl: `https://equify.co.il/payment/upay/return?order=${orderId}&sig=demo`,
  });
  if (!res.ok) {
    console.error('upay refused:', res.reason, res.errorcode ?? '');
    process.exit(1);
  }
  console.log(`Order ${orderId}, cashier id ${res.cashierId}, amount ${res.totalAmount} ${usd ? 'USD' : 'ILS'}`);
  console.log(`Payment page: ${res.url}`);
  console.log(`Then: UPAY_ENV=demo ... npx tsx scripts/round-14/upay-demo-transaction.ts --status ${res.cashierId}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
