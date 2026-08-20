import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  appRouteMethodNotAllowed,
  jsonError,
} from '../../../../lib/api/http';
import {
  PRODUCT_EVENT_TYPES,
  scheduleProductEvent,
} from '../../../../lib/analytics/track_event';

export const runtime = 'nodejs';

const bodySchema = z.object({
  eventType: z.enum(PRODUCT_EVENT_TYPES),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonError('Invalid JSON body.', 400, 'INVALID_JSON');
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonError('Validation failed.', 400, 'VALIDATION_ERROR');
  }

  const { eventType, metadata } = parsed.data;
  // Strip accidental PII-ish keys if a client ever sends them.
  const safeMeta: Record<string, unknown> = {};
  if (metadata) {
    for (const [key, value] of Object.entries(metadata)) {
      if (/email|phone|name|description|freetext|text/i.test(key)) continue;
      safeMeta[key] = value;
    }
  }

  scheduleProductEvent({ eventType, metadata: safeMeta });
  return NextResponse.json({ ok: true });
}

export function GET() {
  return appRouteMethodNotAllowed(['POST']);
}
