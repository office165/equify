/**
 * Wizard checkout helpers (no client-side payment bypass).
 * Free promo entitlement is minted only by POST /api/v1/promo/validate.
 */

export type MondayLeadCheckoutStatus =
  | 'Redirected to PayPal'
  | 'Free promo redeemed';

export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase();
}
