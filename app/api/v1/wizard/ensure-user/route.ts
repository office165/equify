import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  appRouteMethodNotAllowed,
  jsonError,
} from '../../../../../lib/api/http';
import { ensureWizardUser } from '../../../../../lib/payments/ensure_wizard_user';

export const runtime = 'nodejs';

const bodySchema = z.object({
  email: z.string().email().max(320),
  fullName: z.string().max(200).optional().nullable(),
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

  const result = await ensureWizardUser({
    email: parsed.data.email,
    fullName: parsed.data.fullName,
  });

  if (!result.ok) {
    if (result.reason === 'supabase_not_configured') {
      return NextResponse.json(
        { ok: false, reason: result.reason },
        { status: 503 },
      );
    }
    if (result.reason === 'invalid_input') {
      return NextResponse.json(
        { ok: false, reason: result.reason },
        { status: 400 },
      );
    }
    console.error('[wizard/ensure-user] db_error', result.message);
    return NextResponse.json(
      { ok: false, reason: 'server_error' },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { ok: true, userId: result.userId, email: result.email },
    { status: 200 },
  );
}

export function GET() {
  return appRouteMethodNotAllowed(['POST']);
}
