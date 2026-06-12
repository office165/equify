import { waitUntil } from '@vercel/functions';
import {
  isFileStoreOnVercel,
  isVercelRuntime,
  logEphemeralPersistenceCritical,
} from './leads_persistence';
import { performMondaySyncForLead } from './leads_service';
import type { LeadUpsertEvent, ValubotLeadRecord } from './leads_types';

/**
 * Keeps Monday push alive on Vercel after the HTTP response (waitUntil).
 * On ephemeral file-store, sync MUST finish in this invocation — never fire-and-forget.
 */
export function scheduleMondaySyncForLead(
  lead: ValubotLeadRecord,
  event: LeadUpsertEvent,
  options?: { pdfBuffer?: Buffer | null },
): void {
  if (isFileStoreOnVercel()) {
    logEphemeralPersistenceCritical('schedule_monday_sync', {
      leadId: lead.id,
      event,
    });
  }

  const task = performMondaySyncForLead(lead, event, options).catch((err) => {
    console.error('❌ MONDAY ROUTING FAILURE:', err);
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        stage: 'monday_sync_background',
        ok: false,
        leadId: lead.id,
        event,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  });

  if (isVercelRuntime()) {
    try {
      waitUntil(task);
      return;
    } catch {
      // waitUntil unavailable outside Vercel — fall through to void
    }
  }

  void task;
}
