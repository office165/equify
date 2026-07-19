/**
 * PayPal NCP checkout URLs — single source of truth via env, with hardcoded fallbacks.
 * Testing period: if FULL is unset, everyone uses PROMO.
 */

export const PAYPAL_NCP_URL_FULL_FALLBACK =
  'https://www.paypal.com/ncp/payment/V684FJT73X9T2';

export const PAYPAL_NCP_URL_PROMO_FALLBACK =
  'https://www.paypal.com/ncp/payment/LG4MDNKQ63HEY';

function trimEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

/** ₪999 (or full-price) NCP link. Falls back to PROMO when FULL is unset (test mode). */
export function getPaypalNcpUrlFull(): string {
  return (
    trimEnv('NEXT_PUBLIC_PAYPAL_NCP_URL_FULL') ||
    trimEnv('NEXT_PUBLIC_PAYPAL_NCP_URL') ||
    getPaypalNcpUrlPromo()
  );
}

/** ₪1 / promo NCP link. */
export function getPaypalNcpUrlPromo(): string {
  return (
    trimEnv('NEXT_PUBLIC_PAYPAL_NCP_URL_PROMO') || PAYPAL_NCP_URL_PROMO_FALLBACK
  );
}

/** Explicit full-price URL with hardcoded V684… fallback (never promo chain). */
export function getPaypalNcpUrlFullHardFallback(): string {
  return (
    trimEnv('NEXT_PUBLIC_PAYPAL_NCP_URL_FULL') || PAYPAL_NCP_URL_FULL_FALLBACK
  );
}

/** Alias used by wizard checkout. */
export function getPaypalCheckoutUrlFull(): string {
  return getPaypalNcpUrlFull();
}

/** Alias used by wizard promo checkout. */
export function getPaypalCheckoutUrlPromo(): string {
  return getPaypalNcpUrlPromo();
}

/** @deprecated Prefer getPaypalNcpUrlFull / getPaypalCheckoutUrlFull */
export const PAYPAL_CHECKOUT_URL = PAYPAL_NCP_URL_FULL_FALLBACK;
