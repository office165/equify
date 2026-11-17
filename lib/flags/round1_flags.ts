/**
 * Round 1 feature flags. All are off unless the env var is exactly "on".
 *   PAYWALL_V2              consume payment token only after PDF + email; signed token for PDF/HTML routes
 *   PAYPAL_USD              PayPal webhook reads currency_code (ILS and USD minimums)
 *   LEAD_VALUE_FROM_REPORT  lead / Monday value and quality score from the report engine
 */
export type Round1Flag = 'PAYWALL_V2' | 'PAYPAL_USD' | 'LEAD_VALUE_FROM_REPORT';

export function isFlagOn(flag: Round1Flag, env: NodeJS.ProcessEnv = process.env): boolean {
  return env[flag]?.trim().toLowerCase() === 'on';
}
