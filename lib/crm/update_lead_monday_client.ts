'use client';

import type { MondayLeadCheckoutStatus } from '../wizard/vip_promo';

export interface MondayUpdateLeadBody {
  status: MondayLeadCheckoutStatus;
  mondayItemId?: string | null;
  leadId?: string | null;
  sessionId?: string | null;
  userEmail?: string | null;
  aiNotes?: string | null;
}

export interface MondayUpdateLeadResponse {
  ok: boolean;
  mondayItemId?: string | null;
  error?: string;
}

export async function postMondayLeadUpdate(
  body: MondayUpdateLeadBody,
): Promise<MondayUpdateLeadResponse> {
  if (typeof window === 'undefined') return { ok: false, error: 'ssr' };

  try {
    const response = await fetch('/api/monday/update-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = (await response.json().catch(() => null)) as MondayUpdateLeadResponse | null;
    if (!response.ok || !data?.ok) {
      return {
        ok: false,
        error: data?.error ?? `http_${response.status}`,
      };
    }
    return data;
  } catch {
    return { ok: false, error: 'network' };
  }
}
