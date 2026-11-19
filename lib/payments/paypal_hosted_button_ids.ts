/**
 * PayPal Hosted Button IDs + public client-id (NEXT_PUBLIC_* — safe in browser).
 *
 * HOSTED_BUTTON_ID_PROMO remains available via env for ops, but the wizard
 * checkout flow no longer uses the promo (1 ILS) button — valid codes are free.
 */

export const CLIENT_ID =
  process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim() ||
  'BAA2pLZ9r0GDymXTIJ85zRAbZ7UD_eKid08QZUvFnfgQ0fNJA2y18vKJtLiYweHgBA7jugeF7sqRbtHing';

export const HOSTED_BUTTON_ID_FULL =
  process.env.NEXT_PUBLIC_PAYPAL_HOSTED_BUTTON_ID_FULL?.trim() || 'V684FJT73X9T2';

/** Kept for env compatibility; unused by current wizard checkout. */
export const HOSTED_BUTTON_ID_PROMO =
  process.env.NEXT_PUBLIC_PAYPAL_HOSTED_BUTTON_ID_PROMO?.trim() || 'LG4MDNKQ63HEY';

/**
 * Round 13 (EN_SITE): the English price, $349, is a separate PayPal hosted button priced in USD (created in PayPal by the owner,
 * like the ILS one). Until NEXT_PUBLIC_PAYPAL_HOSTED_BUTTON_ID_FULL_USD is set, English checkout uses the ILS button, as today.
 * The webhook accepts USD captures only with PAYPAL_USD=on (lib/payments/paypal_amount_policy.ts, minimum $349).
 */
export const HOSTED_BUTTON_ID_FULL_USD = process.env.NEXT_PUBLIC_PAYPAL_HOSTED_BUTTON_ID_FULL_USD?.trim() || '';

export type CheckoutCurrency = 'ILS' | 'USD';

export function checkoutButton(locale: 'he' | 'en', enSite: boolean, usdId: string = HOSTED_BUTTON_ID_FULL_USD): { id: string; currency: CheckoutCurrency } {
  if (enSite && locale === 'en' && usdId) return { id: usdId, currency: 'USD' };
  return { id: HOSTED_BUTTON_ID_FULL, currency: 'ILS' };
}
