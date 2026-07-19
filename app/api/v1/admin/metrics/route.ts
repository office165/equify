import { NextResponse } from 'next/server';
import {
  PRODUCT_EVENT_TYPES,
  type ProductEventType,
} from '../../../../../lib/analytics/track_event';
import { SessionTokenService } from '../../../../../lib/auth/session_token_service';
import {
  getSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from '../../../../../lib/db/supabase';
import {
  appRouteMethodNotAllowed,
  jsonError,
} from '../../../../../lib/api/http';

export const runtime = 'nodejs';

type CountsByType = Record<ProductEventType, number>;

function emptyCounts(): CountsByType {
  return {
    wizard_completed: 0,
    checkout_opened: 0,
    payment_succeeded: 0,
    report_created: 0,
    pdf_downloaded: 0,
  };
}

async function requireAdminUserId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;
  if (!bearer) return null;

  let session;
  try {
    session = new SessionTokenService().verifySession(bearer);
  } catch {
    return null;
  }

  if (!isSupabaseAdminConfigured()) return null;
  const supabase = getSupabaseAdminClient();
  const { data: user } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', session.sub)
    .is('deleted_at', null)
    .maybeSingle();

  if (!user?.id || user.role !== 'admin') {
    return null;
  }
  return user.id;
}

async function countEventsSince(sinceIso: string): Promise<CountsByType> {
  const counts = emptyCounts();
  if (!isSupabaseAdminConfigured()) return counts;

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('events')
    .select('event_type')
    .gte('created_at', sinceIso);

  if (error) {
    throw error;
  }

  for (const row of data ?? []) {
    const type = row.event_type as ProductEventType;
    if (PRODUCT_EVENT_TYPES.includes(type)) {
      counts[type] += 1;
    }
  }
  return counts;
}

/**
 * Admin metrics — real event counts for the last 24h and 7d.
 * Auth: Bearer WhatsApp session JWT + users.role = 'admin'.
 */
export async function GET(request: Request) {
  if (!isSupabaseAdminConfigured()) {
    return jsonError('Metrics store unavailable', 503, 'SERVICE_UNAVAILABLE');
  }

  const adminId = await requireAdminUserId(request);
  if (!adminId) {
    return jsonError('Admin access required', 403, 'FORBIDDEN');
  }

  try {
    const now = Date.now();
    const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [last24h, last7d] = await Promise.all([
      countEventsSince(since24h),
      countEventsSince(since7d),
    ]);

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      windows: {
        '24h': last24h,
        '7d': last7d,
      },
      eventTypes: PRODUCT_EVENT_TYPES,
    });
  } catch (err) {
    console.error('[admin/metrics]', err);
    return jsonError('Failed to load metrics', 500, 'METRICS_ERROR');
  }
}

export function POST() {
  return appRouteMethodNotAllowed(['GET']);
}
