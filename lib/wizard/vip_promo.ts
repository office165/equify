/**
 * Wizard checkout helpers (no client-side payment bypass).
 * NCP URLs live in lib/payments/paypal_ncp_urls.ts.
 */

export type MondayLeadCheckoutStatus = 'Redirected to PayPal';

export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase();
}
