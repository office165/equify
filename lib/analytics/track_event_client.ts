/**
 * Browser fire-and-forget product events via /api/v1/events.
 * Never throws — analytics must not break the wizard.
 */

import type { ProductEventType } from './track_event';

export function scheduleClientProductEvent(
  eventType: ProductEventType,
  metadata?: Record<string, unknown>,
): void {
  try {
    void fetch('/api/v1/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, metadata: metadata ?? {} }),
      keepalive: true,
    }).catch(() => {
      /* ignore */
    });
  } catch {
    /* ignore */
  }
}
