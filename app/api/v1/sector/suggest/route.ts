import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  appRouteMethodNotAllowed,
  jsonError,
} from '../../../../../lib/api/http';
import { suggestSectorsFromDescription } from '../../../../../lib/wizard/sector_suggest';

export const runtime = 'nodejs';

const bodySchema = z.object({
  description: z.string().trim().min(5).max(400),
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

  const suggestions = suggestSectorsFromDescription(parsed.data.description, 3);
  return NextResponse.json({ suggestions });
}

export function GET() {
  return appRouteMethodNotAllowed(['POST']);
}
