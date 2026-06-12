import { NextResponse } from 'next/server';
import { parseLaunchSlotsFromEnv } from '../../../lib/landing/launchSlots';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Real launch scarcity counter — env-driven (LAUNCH_SLOTS_* / NEXT_PUBLIC_LAUNCH_SLOTS_*).
 * Wire Monday board count here when LAUNCH_MONDAY_BOARD_ID is configured.
 */
export async function GET() {
  const slots = parseLaunchSlotsFromEnv();
  return NextResponse.json({ ...slots, source: 'api' as const });
}
