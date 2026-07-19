/**
 * In-memory rate limit for failed promo validations (per email).
 * 5 failures within 10 minutes → temporary block.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILURES = 5;

const failedAttempts = new Map<string, number[]>();

function prune(timestamps: number[], now: number): number[] {
  return timestamps.filter((t) => now - t < WINDOW_MS);
}

export function isPromoValidateRateLimited(email: string): boolean {
  const key = email.trim().toLowerCase();
  const now = Date.now();
  const pruned = prune(failedAttempts.get(key) ?? [], now);
  failedAttempts.set(key, pruned);
  return pruned.length >= MAX_FAILURES;
}

export function recordPromoValidateFailure(email: string): void {
  const key = email.trim().toLowerCase();
  const now = Date.now();
  const pruned = prune(failedAttempts.get(key) ?? [], now);
  pruned.push(now);
  failedAttempts.set(key, pruned);
}

export function clearPromoValidateFailures(email: string): void {
  failedAttempts.delete(email.trim().toLowerCase());
}
