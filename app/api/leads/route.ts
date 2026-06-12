import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  buildEphemeralLeadFromBody,
  upsertLeadToDatabase,
} from '../../../lib/crm/leads_service';
import { getLeadsHealthConfig, isVercelRuntime } from '../../../lib/crm/leads_persistence';
import { scheduleMondaySyncForLead } from '../../../lib/crm/schedule_monday_sync';
import type { LeadUpsertBody } from '../../../lib/crm/leads_types';

export const runtime = 'nodejs';

const leadUpsertSchema = z.object({
  event: z.enum([
    'wizard_step1',
    'wizard_completed',
    'pdf_downloaded',
    'whatsapp_sent',
    'payment',
  ]),
  sessionId: z.string().optional(),
  leadId: z.string().optional(),
  fullName: z.string().optional(),
  companyName: z.string().optional(),
  userEmail: z.string().optional(),
  userPhone: z.string().optional(),
  nationalId: z.string().optional(),
  corporateTaxId: z.string().optional(),
  sectorLabel: z.string().optional(),
  industryCode: z.string().optional(),
  valuationPurpose: z
    .enum(['M&A_SALE', 'CAPITAL_RAISE', 'TAX', 'INTERNAL_REPORT'])
    .optional(),
  valuationMidpoint: z.number().optional(),
  qualityScore: z.number().optional(),
  source: z.enum(['organic', 'linkedin', 'twitter', 'reddit']).optional(),
  package: z.enum(['Flash', 'Pro', 'Enterprise']).optional(),
  aiNotes: z.string().optional(),
  locale: z.enum(['he', 'en']).optional(),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const parsed = leadUpsertSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'validation_failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const body = parsed.data as LeadUpsertBody;

  console.log('🚀 MONDAY INTEGRATION INGESTION INITIATED. PAYLOAD:', {
    event: body.event,
    fullName: body.fullName,
    companyName: body.companyName,
    userPhone: body.userPhone,
    nationalId: body.nationalId,
    userEmail: body.userEmail,
    sessionId: body.sessionId,
    leadId: body.leadId,
  });

  if (body.event === 'wizard_step1') {
    if (!body.userEmail?.trim()) {
      return NextResponse.json(
        { ok: false, error: 'userEmail_required_for_step1' },
        { status: 400 },
      );
    }
  }

  try {
    const lead = await upsertLeadToDatabase(body);
    const config = getLeadsHealthConfig();
    scheduleMondaySyncForLead(lead, body.event);
    return NextResponse.json({
      ok: true,
      saved: true,
      lead,
      mondayItemId: lead.mondayItemId,
      mondaySynced: false,
      mondayError: null,
      persistence: {
        mode: config.persistenceMode,
        fileStoreOnVercel: config.fileStoreOnVercel,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'lead_upsert_failed';
    console.error('❌ MONDAY ROUTING FAILURE:', err);
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        stage: 'lead_upsert',
        ok: false,
        error: message,
      }),
    );

    if (isVercelRuntime() && body.userEmail?.trim()) {
      const emergencyLead = buildEphemeralLeadFromBody(body);
      scheduleMondaySyncForLead(emergencyLead, body.event);
      return NextResponse.json({
        ok: true,
        saved: false,
        mondayQueued: true,
        warning: 'db_unavailable_monday_queued',
        lead: emergencyLead,
        persistence: {
          mode: 'ephemeral',
          fileStoreOnVercel: false,
        },
      });
    }

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
