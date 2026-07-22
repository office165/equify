import { NextResponse } from 'next/server';
import { z } from 'zod';
import { findMondayItemIdByEmail } from '../../../../lib/crm/valubot_monday_sync';
import { updateMondayLeadColumnsViaGraphql } from '../../../../lib/crm/monday_graphql_lead';
import { VALUBOT_MONDAY_COLUMNS } from '../../../../lib/crm/valubot_monday_columns';

export const runtime = 'nodejs';

const updateLeadSchema = z.object({
  status: z.enum([
    'Paid - Admin VIP Bypass',
    'Redirected to PayPal',
    'Free promo redeemed',
  ]),
  mondayItemId: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  sessionId: z.string().optional().nullable(),
  userEmail: z.string().optional().nullable(),
  aiNotes: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const parsed = updateLeadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'validation_failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { status, mondayItemId, userEmail, aiNotes } = parsed.data;

  try {
    let itemId = mondayItemId?.trim() || null;
    if (!itemId && userEmail?.trim()) {
      itemId = await findMondayItemIdByEmail(userEmail.trim());
    }

    if (!itemId) {
      return NextResponse.json({ ok: false, error: 'monday_item_not_found' }, { status: 404 });
    }

    const columnValues: Record<string, unknown> = {
      [VALUBOT_MONDAY_COLUMNS.processStage]: { label: status },
    };

    if (aiNotes?.trim()) {
      columnValues[VALUBOT_MONDAY_COLUMNS.aiNotes] = aiNotes.trim();
    }

    await updateMondayLeadColumnsViaGraphql(itemId, columnValues);

    return NextResponse.json({ ok: true, mondayItemId: itemId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'monday_update_failed';
    console.error('[api/monday/update-lead]', err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
