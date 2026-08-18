import {
  getSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from '../db/supabase';

const CACHE_MS = 5 * 60 * 1000;
const PUBLIC_MIN_DISPLAY = 25;

let cached: { count: number; fetchedAt: number } | null = null;

export async function countDeliveredReports(): Promise<number> {
  if (!isSupabaseAdminConfigured()) {
    return 0;
  }

  const now = Date.now();
  if (cached && now - cached.fetchedAt < CACHE_MS) {
    return cached.count;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { count, error } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'report_created');

    if (error) {
      console.warn('[public_stats] count failed', error.message);
      return cached?.count ?? 0;
    }

    const safe = typeof count === 'number' && count >= 0 ? count : 0;
    cached = { count: safe, fetchedAt: now };
    return safe;
  } catch (err) {
    console.warn(
      '[public_stats] count error',
      err instanceof Error ? err.message : err,
    );
    return cached?.count ?? 0;
  }
}
