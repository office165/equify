export interface LaunchSlotsResponse {
  total: number;
  remaining: number;
  claimed: number;
  source: 'env' | 'api' | 'fallback';
}

const DEFAULT_TOTAL = 100;
const DEFAULT_REMAINING = 23;

export function parseLaunchSlotsFromEnv(): LaunchSlotsResponse {
  const total = parseInt(
    process.env.LAUNCH_SLOTS_TOTAL ??
      process.env.NEXT_PUBLIC_LAUNCH_SLOTS_TOTAL ??
      String(DEFAULT_TOTAL),
    10,
  );
  const remaining = parseInt(
    process.env.LAUNCH_SLOTS_REMAINING ??
      process.env.NEXT_PUBLIC_LAUNCH_SLOTS_REMAINING ??
      String(DEFAULT_REMAINING),
    10,
  );
  const safeTotal = Number.isFinite(total) && total > 0 ? total : DEFAULT_TOTAL;
  const safeRemaining = Number.isFinite(remaining)
    ? Math.max(0, Math.min(remaining, safeTotal))
    : DEFAULT_REMAINING;
  return {
    total: safeTotal,
    remaining: safeRemaining,
    claimed: safeTotal - safeRemaining,
    source: 'env',
  };
}

export async function fetchLaunchSlots(): Promise<LaunchSlotsResponse> {
  try {
    const res = await fetch('/api/launch-slots', { cache: 'no-store' });
    if (!res.ok) throw new Error('fetch_failed');
    const data = (await res.json()) as LaunchSlotsResponse;
    if (
      typeof data.remaining === 'number' &&
      typeof data.total === 'number' &&
      data.total > 0
    ) {
      return data;
    }
    throw new Error('invalid_payload');
  } catch {
    const total = parseInt(
      process.env.NEXT_PUBLIC_LAUNCH_SLOTS_TOTAL ?? String(DEFAULT_TOTAL),
      10,
    );
    const remaining = parseInt(
      process.env.NEXT_PUBLIC_LAUNCH_SLOTS_REMAINING ?? String(DEFAULT_REMAINING),
      10,
    );
    const safeTotal = Number.isFinite(total) && total > 0 ? total : DEFAULT_TOTAL;
    const safeRemaining = Number.isFinite(remaining)
      ? Math.max(0, Math.min(remaining, safeTotal))
      : DEFAULT_REMAINING;
    return {
      total: safeTotal,
      remaining: safeRemaining,
      claimed: safeTotal - safeRemaining,
      source: 'fallback',
    };
  }
}
