import {
  performMondaySyncForLead,
  upsertLeadToDatabase,
} from '../crm/leads_service';
import type { LeadUpsertBody } from '../crm/leads_types';

const MONDAY_SYNC_TIMEOUT_MS = 45_000;
const MONDAY_SYNC_MAX_ATTEMPTS = 3;
const MONDAY_RETRY_BASE_MS = 600;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`${label}_timeout`)), ms);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

export interface MondayRelaySyncMetrics {
  attempts: number;
  durationMs: number;
  timedOut: boolean;
  lastError?: string;
}

export interface MondayRelaySyncResult {
  leadResult: Awaited<ReturnType<typeof performMondaySyncForLead>> & {
    lead: Awaited<ReturnType<typeof upsertLeadToDatabase>>;
  };
  metrics: MondayRelaySyncMetrics;
}

/**
 * DB-first relay transport — persists lead, then retries Monday Graph push.
 * Failures mark pending_sync for cron replay; never evicts the DB row.
 */
export async function executeMondayLeadRelaySync(
  leadBody: LeadUpsertBody,
  options: { pdfBuffer: Buffer | null },
): Promise<MondayRelaySyncResult> {
  const started = Date.now();
  let attempts = 0;
  let lastError: string | undefined;
  let timedOut = false;

  const lead = await upsertLeadToDatabase(leadBody);

  for (let attempt = 1; attempt <= MONDAY_SYNC_MAX_ATTEMPTS; attempt += 1) {
    attempts = attempt;
    try {
      const syncResult = await withTimeout(
        performMondaySyncForLead(lead, leadBody.event, {
          pdfBuffer: options.pdfBuffer ?? undefined,
        }),
        MONDAY_SYNC_TIMEOUT_MS,
        'monday_graph_sync',
      );
      return {
        leadResult: { lead, ...syncResult },
        metrics: {
          attempts,
          durationMs: Date.now() - started,
          timedOut: false,
        },
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      timedOut = lastError.includes('_timeout');
      console.warn('[backup-relay] Monday sync attempt failed', {
        attempt,
        maxAttempts: MONDAY_SYNC_MAX_ATTEMPTS,
        error: lastError,
        timedOut,
        durationMs: Date.now() - started,
        leadId: lead.id,
      });
      if (attempt < MONDAY_SYNC_MAX_ATTEMPTS) {
        await sleep(MONDAY_RETRY_BASE_MS * attempt);
      }
    }
  }

  const metrics: MondayRelaySyncMetrics = {
    attempts,
    durationMs: Date.now() - started,
    timedOut,
    lastError,
  };

  throw Object.assign(new Error(lastError ?? 'monday_sync_failed'), { metrics, lead });
}
