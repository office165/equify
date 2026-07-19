/** Admin / VIP promo codes that bypass PayPal checkout. */
export const VIP_PROMO_CODES = ['DANI0708', 'LZ0707LZ'] as const;

export const PAYPAL_CHECKOUT_URL =
  'https://www.paypal.com/ncp/payment/V684FJT73X9T2';

export type MondayLeadCheckoutStatus =
  | 'Paid - Admin VIP Bypass'
  | 'Redirected to PayPal';

export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase();
}

export function isVipPromoCode(code: string): boolean {
  const normalized = normalizePromoCode(code);
  return (VIP_PROMO_CODES as readonly string[]).includes(normalized);
}
