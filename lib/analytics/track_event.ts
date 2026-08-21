/**
 * Fire-and-forget product event insert into public.events.
 * Never throws — analytics must not break payment / wizard / PDF paths.
 */

import {
  getSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from '../db/supabase';

export const PRODUCT_EVENT_TYPES = [
  'wizard_completed',
  'checkout_opened',
  'payment_succeeded',
  'report_created',
  'pdf_downloaded',
  'wizard_step1_started',
  'sector_fast_path_used',
  'sector_manual_used',
  'sector_freetext_used',
  'sector_range_confirmed',
  'sector_range_rejected',
  'wizard_step1_completed',
  'sector_suggest_llm_ok',
  'sector_suggest_llm_fallback',
] as const;

export type ProductEventType = (typeof PRODUCT_EVENT_TYPES)[number];

export interface TrackProductEventInput {
  eventType: ProductEventType;
  userId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function trackProductEvent(
  input: TrackProductEventInput,
): Promise<void> {
  if (!isSupabaseAdminConfigured()) {
    return;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from('events').insert({
      user_id: input.userId?.trim() || null,
      event_type: input.eventType,
      metadata: input.metadata ?? {},
    });
    if (error) {
      console.warn('[events] insert failed', input.eventType, error.message);
    }
  } catch (err) {
    console.warn(
      '[events] insert error',
      input.eventType,
      err instanceof Error ? err.message : err,
    );
  }
}

/** Non-blocking wrapper for route handlers. */
export function scheduleProductEvent(input: TrackProductEventInput): void {
  void trackProductEvent(input);
}
