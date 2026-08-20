import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  appRouteMethodNotAllowed,
  jsonError,
} from '../../../../../lib/api/http';
import { scheduleProductEvent } from '../../../../../lib/analytics/track_event';
import { clientIpFromRequest } from '../../../../../lib/landing/feedback_rate_limit';
import { suggestSectorsFromDescription } from '../../../../../lib/wizard/sector_suggest';
import {
  getSectorSuggestCache,
  setSectorSuggestCache,
} from '../../../../../lib/wizard/sector_suggest_cache';
import { suggestSectorsWithLlm } from '../../../../../lib/wizard/sector_suggest_llm';
import {
  isSectorSuggestRateLimited,
  recordSectorSuggestHit,
} from '../../../../../lib/wizard/sector_suggest_rate_limit';

export const runtime = 'nodejs';

const bodySchema = z.object({
  description: z.string().trim().min(5).max(400),
});

function keywordFallback(description: string) {
  return suggestSectorsFromDescription(description, 3);
}

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

  const description = parsed.data.description;
  const ip = clientIpFromRequest(request);
  const started = Date.now();

  const cached = getSectorSuggestCache(description);
  if (cached && cached.length > 0) {
    return NextResponse.json({ suggestions: cached });
  }

  const rateLimited = isSectorSuggestRateLimited(ip);
  if (!rateLimited) {
    recordSectorSuggestHit(ip);
    try {
      const llm = await suggestSectorsWithLlm(description);
      if (llm && llm.suggestions.length >= 1) {
        setSectorSuggestCache(description, llm.suggestions);
        scheduleProductEvent({
          eventType: 'sector_suggest_llm_ok',
          metadata: {
            durationMs: llm.durationMs,
            count: llm.suggestions.length,
            source: 'sector/suggest',
          },
        });
        return NextResponse.json({ suggestions: llm.suggestions });
      }
    } catch {
      /* fall through to keywords */
    }
  }

  const suggestions = keywordFallback(description);
  scheduleProductEvent({
    eventType: 'sector_suggest_llm_fallback',
    metadata: {
      durationMs: Date.now() - started,
      count: suggestions.length,
      reason: rateLimited ? 'rate_limited' : 'llm_unavailable',
      source: 'sector/suggest',
    },
  });
  if (suggestions.length > 0) {
    setSectorSuggestCache(description, suggestions);
  }
  return NextResponse.json({ suggestions });
}

export function GET() {
  return appRouteMethodNotAllowed(['POST']);
}
