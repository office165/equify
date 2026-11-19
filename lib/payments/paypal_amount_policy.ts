/**
 * PayPal capture amount check by currency (PAYPAL_USD=on).
 * ILS is compared with PAYPAL_MIN_AMOUNT_ILS (default 999), USD with PAYPAL_MIN_AMOUNT_USD
 * (default 349, the English price since round 13; it was 299). Any other currency is recorded as unmatched.
 */
export const DEFAULT_MIN_AMOUNT_ILS = 999;
export const DEFAULT_MIN_AMOUNT_USD = 349;

function readMin(raw: string | undefined, fallback: number): number {
  const n = raw?.trim() ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export type PaypalAmountDecision =
  | { kind: 'paid'; currency: 'ILS' | 'USD'; amount: number; min: number }
  | { kind: 'underpaid'; currency: 'ILS' | 'USD'; amount: number; min: number }
  | { kind: 'unsupported_currency'; currency: string; amount: number };

export function evaluatePaypalAmount(
  amount: number,
  currencyCode: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): PaypalAmountDecision {
  const currency = (currencyCode ?? '').trim().toUpperCase();
  const value = Number.isFinite(amount) ? amount : 0;
  if (currency === 'ILS') {
    const min = readMin(env.PAYPAL_MIN_AMOUNT_ILS, DEFAULT_MIN_AMOUNT_ILS);
    return { kind: value >= min ? 'paid' : 'underpaid', currency, amount: value, min };
  }
  if (currency === 'USD') {
    const min = readMin(env.PAYPAL_MIN_AMOUNT_USD, DEFAULT_MIN_AMOUNT_USD);
    return { kind: value >= min ? 'paid' : 'underpaid', currency, amount: value, min };
  }
  return { kind: 'unsupported_currency', currency: currency || 'UNKNOWN', amount: value };
}
