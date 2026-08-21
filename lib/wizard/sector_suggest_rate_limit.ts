/**
 * In-memory rate limit for sector suggest LLM calls (per client IP).
 * 10 requests within 1 hour → limited (caller should fall back to keywords).
 * Best-effort on serverless (per instance).
 */

const WINDOW_MS = 60 * 60 * 1000;
const MAX_HITS = 10;

const hits = new Map<string, number[]>();

function prune(timestamps: number[], now: number): number[] {
  return timestamps.filter((t) => now - t < WINDOW_MS);
}

export function isSectorSuggestRateLimited(ip: string): boolean {
  const now = Date.now();
  const pruned = prune(hits.get(ip) ?? [], now);
  hits.set(ip, pruned);
  return pruned.length >= MAX_HITS;
}

export function recordSectorSuggestHit(ip: string): void {
  const now = Date.now();
  const pruned = prune(hits.get(ip) ?? [], now);
  pruned.push(now);
  hits.set(ip, pruned);
}
