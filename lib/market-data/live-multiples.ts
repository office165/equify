/**
 * Resolves multiples at runtime: tries Supabase snapshot first, falls back to static.
 */

import { createClient } from '@supabase/supabase-js';
import type { MultiplesRange, Industry } from '../valuation/multiples';
import { ISRAEL_MULTIPLES_2026 } from '../valuation/multiples';
import { computeBlendedMultiples } from './compute-multiples';

let cachedSnapshot: Record<string, MultiplesRange> | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

export async function getLiveMultiples(): Promise<Record<Industry, MultiplesRange>> {
  // Return memory cache if fresh
  if (cachedSnapshot && Date.now() < cacheExpiry) {
    return cachedSnapshot as Record<Industry, MultiplesRange>;
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { data, error } = await supabase
      .from('market_data_snapshots')
      .select('computed_multiples, snapshot_date')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();

    if (error || !data?.computed_multiples) throw new Error('No snapshot');

    // Convert blended multiples to MultiplesRange format
    const result: Record<string, MultiplesRange> = {};
    for (const [industry, blended] of Object.entries(data.computed_multiples as Record<string, ReturnType<typeof computeBlendedMultiples>>)) {
      result[industry] = {
        evEbitda: blended.evEbitda,
        evEbita:  blended.evEbita,
        evSales:  blended.evSales,
      };
    }

    cachedSnapshot = result;
    cacheExpiry = Date.now() + CACHE_TTL_MS;
    return result as Record<Industry, MultiplesRange>;

  } catch {
    // Fallback to static multiples
    return ISRAEL_MULTIPLES_2026;
  }
}
