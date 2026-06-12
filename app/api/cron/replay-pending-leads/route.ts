import { NextResponse } from 'next/server';
import { replayPendingLeadSyncBatch } from '../../../../lib/crm/leads_service';

export const runtime = 'nodejs';
export const maxDuration = 60;

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV === 'development';
  const header = request.headers.get('authorization')?.trim();
  return header === `Bearer ${secret}`;
}

/**
 * Re-pushes leads marked pending_sync to Monday.com.
 * Schedule via Vercel Cron (daily on Hobby) or external scheduler (e.g. every 15 min on Pro).
 */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await replayPendingLeadSyncBatch(50);
    console.log('[cron/replay-pending-leads] complete', result);
    return NextResponse.json({
      ok: true,
      at: new Date().toISOString(),
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'replay_failed';
    console.error('[cron/replay-pending-leads] failed', message, err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
