/**
 * In-memory rate limit for landing feedback POSTs (per client IP).
 * 5 submissions within 1 hour → 429.
 * Best-effort on serverless (per instance).
 */

const WINDOW_MS = 60 * 60 * 1000;
const MAX_HITS = 5;

const hits = new Map<string, number[]>();

function prune(timestamps: number[], now: number): number[] {
  return timestamps.filter((t) => now - t < WINDOW_MS);
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const real = request.headers.get('x-real-ip')?.trim();
  if (real) return real.slice(0, 128);
  return 'unknown';
}

export function isFeedbackRateLimited(ip: string): boolean {
  const now = Date.now();
  const pruned = prune(hits.get(ip) ?? [], now);
  hits.set(ip, pruned);
  return pruned.length >= MAX_HITS;
}

export function recordFeedbackHit(ip: string): void {
  const now = Date.now();
  const pruned = prune(hits.get(ip) ?? [], now);
  pruned.push(now);
  hits.set(ip, pruned);
}
