/**
 * Round 9 (UPAY): the production wiring of settleUpayOrder: order store, verifier, release through
 * the PayPal mechanism, and the Green Invoice step (GREEN_INVOICE) after a verified payment.
 */
import { issueInvoiceOnce } from '../../invoices/green_invoice';
import { defaultUpayOrderStore, type UpayOrderStore } from './upay_orders';
import { UNDOCUMENTED_STATUS_VERIFIER, releaseViaPaypalMechanism, settleUpayOrder, type AfterPaidFn, type UpayVerifier } from './upay_settle';

export const greenInvoiceAfterUpay: AfterPaidFn = async (order, paid) => {
  await issueInvoiceOnce({
    orderKey: `upay:${order.id}`,
    customerName: '',
    customerEmail: order.email,
    amount: order.amount,
    currency: order.currency,
    method: 'credit_card',
    transactionId: paid.cashierId,
    date: new Date().toISOString().slice(0, 10),
    cardLast4: paid.cardLast4,
  });
};

export function settleWithDefaults(orderId: string, opts: { store?: UpayOrderStore; verify?: UpayVerifier } = {}) {
  return settleUpayOrder(orderId, {
    store: opts.store ?? defaultUpayOrderStore(),
    verify: opts.verify ?? UNDOCUMENTED_STATUS_VERIFIER,
    release: releaseViaPaypalMechanism,
    afterPaid: greenInvoiceAfterUpay,
  });
}

/** "equify order <uuid>" in the transfer comment, as we send it. */
export function orderIdFromComment(text: string | null | undefined): string | null {
  const m = /equify order ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i.exec(text ?? '');
  return m ? m[1]!.toLowerCase() : null;
}

export function clientIp(headers: Headers): string | null {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip')?.trim() || null;
}

/** UPAY_IPN_IPS: optional comma list. Empty means no IP check (upay's document gives no list). */
export function ipAllowed(ip: string | null, list = process.env.UPAY_IPN_IPS): boolean {
  const allowed = (list ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (allowed.length === 0) return true;
  return ip != null && allowed.includes(ip);
}
