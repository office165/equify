import { NextResponse } from 'next/server';
import { getLeadsHealthConfig } from '../../../lib/crm/leads_persistence';
import { probeLeadDatabaseReachable } from '../../../lib/crm/valubot_leads_repository';
import { buildPulseDetails, pulseTokenMatches, readPulseToken } from '../../../lib/pulse/pulse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

/** Round 8: pulse for SBC's control room. See lib/pulse/pulse.ts. */
export async function GET(request: Request) {
  if (!pulseTokenMatches(readPulseToken(request.headers))) {
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }
  const details = await buildPulseDetails({
    dbConfigured: getLeadsHealthConfig().dbConfigured,
    probeDb: async () => (await probeLeadDatabaseReachable()).reachable,
  });
  return NextResponse.json(details, { headers: NO_STORE });
}
