/**
 * In-memory cache for sector suggest LLM results.
 * Key = normalized description (lowercase + trim). TTL 15 minutes.
 */

import type { SectorSuggestHit } from './sector_suggest';

const TTL_MS = 15 * 60 * 1000;

interface CacheEntry {
  expiresAt: number;
  suggestions: SectorSuggestHit[];
}

const cache = new Map<string, CacheEntry>();

export function normalizeSuggestCacheKey(description: string): string {
  return description.trim().toLowerCase();
}

export function getSectorSuggestCache(
  description: string,
): SectorSuggestHit[] | null {
  const key = normalizeSuggestCacheKey(description);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.suggestions.map((s) => ({ ...s }));
}

export function setSectorSuggestCache(
  description: string,
  suggestions: SectorSuggestHit[],
): void {
  const key = normalizeSuggestCacheKey(description);
  cache.set(key, {
    expiresAt: Date.now() + TTL_MS,
    suggestions: suggestions.map((s) => ({ ...s })),
  });
}
