/**
 * Round 9 (UPAY): settling an order after the IPN or the return to our site.
 *
 * A report is released only when all of these hold:
 *   1. the request carries our HMAC for the order id (checked by the route);
 *   2. the verifier, which asks upay about the transaction, says it is paid;
 *   3. the amount and the currency upay reports equal the order's;
 *   4. this call is the one that claims the release (atomic, so the IPN and the return together
 *      release once, and a repeated IPN does nothing).
 * The return URL's own parameters never release a report.
 *
 * The upay document has no transaction status query, so the default verifier answers "unknown"
 * and nothing is released until upay gives us that API (reports/round-9.md). Release then goes
 * through the same mechanism as PayPal: claimPaypalCaptureAndMint mints the dispatch token that
 * the existing delivery path uses (capture id "upay:<cashierid>", unique in stripe_transactions).
 */
import { claimPaypalCaptureAndMint } from '../paypal_claim_mint';
import type { UpayOrder, UpayOrderStore } from './upay_orders';

export type VerifierAnswer =
  | { status: 'paid'; amount: number; currency: 'ILS' | 'USD'; cashierId: string; cardLast4?: string }
  | { status: 'failed' | 'cancelled' }
  | { status: 'unknown'; reason: string };

export type UpayVerifier = (order: UpayOrder) => Promise<VerifierAnswer>;

/** The status query is not in upay's document; until it is, nothing can be verified. */
export const UNDOCUMENTED_STATUS_VERIFIER: UpayVerifier = async () => ({
  status: 'unknown',
  reason: 'upay_status_query_not_documented',
});

export type ReleaseFn = (order: UpayOrder, cashierId: string) => Promise<{ ok: true; dispatchToken?: string } | { ok: false; reason: string }>;

export const releaseViaPaypalMechanism: ReleaseFn = async (order, cashierId) => {
  const r = await claimPaypalCaptureAndMint({
    captureId: `upay:${cashierId}`,
    payerEmail: order.email,
    gatewayAmountIls: order.currency === 'ILS' ? order.amount : null,
    gatewayStatus: 'upay_verified',
  });
  return r.ok ? { ok: true, dispatchToken: r.dispatchToken } : { ok: false, reason: r.reason };
};

export type AfterPaidFn = (order: UpayOrder, paid: Extract<VerifierAnswer, { status: 'paid' }>) => Promise<void>;

export type SettleOutcome =
  | 'released'
  | 'already_released'
  | 'not_verified'
  | 'amount_mismatch'
  | 'currency_mismatch'
  | 'failed'
  | 'cancelled'
  | 'no_order'
  | 'release_failed';

export async function settleUpayOrder(
  orderId: string,
  deps: { store: UpayOrderStore; verify?: UpayVerifier; release?: ReleaseFn; afterPaid?: AfterPaidFn },
): Promise<{ outcome: SettleOutcome; detail?: string }> {
  const order = await deps.store.get(orderId);
  if (!order) return { outcome: 'no_order' };
  if (order.releasedAt) return { outcome: 'already_released' };
  const answer = await (deps.verify ?? UNDOCUMENTED_STATUS_VERIFIER)(order);
  if (answer.status === 'unknown') return { outcome: 'not_verified', detail: answer.reason };
  if (answer.status !== 'paid') {
    await deps.store.transition(orderId, ['created', 'redirected'], { status: answer.status });
    return { outcome: answer.status };
  }
  if (Math.abs(answer.amount - order.amount) > 0.005) return { outcome: 'amount_mismatch', detail: `${answer.amount} vs ${order.amount}` };
  if (answer.currency !== order.currency) return { outcome: 'currency_mismatch', detail: `${answer.currency} vs ${order.currency}` };
  if (order.cashierId && order.cashierId !== answer.cashierId) return { outcome: 'amount_mismatch', detail: 'cashier id differs' };
  await deps.store.transition(orderId, ['created', 'redirected', 'paid'], { status: 'paid', cashierId: answer.cashierId });
  if (!(await deps.store.claimRelease(orderId))) return { outcome: 'already_released' };
  const rel = await (deps.release ?? releaseViaPaypalMechanism)(order, answer.cashierId);
  if (!rel.ok) return { outcome: 'release_failed', detail: rel.reason };
  if (rel.dispatchToken) await deps.store.setToken(orderId, rel.dispatchToken);
  if (deps.afterPaid) {
    try {
      await deps.afterPaid(order, answer);
    } catch (err) {
      console.error('[upay] after-paid step failed', err instanceof Error ? err.message : err);
    }
  }
  return { outcome: 'released' };
}
