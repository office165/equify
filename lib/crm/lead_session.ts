const SESSION_ID_KEY = 'valubot.lead.sessionId';
const LEAD_ID_KEY = 'valubot.lead.id';
const MONDAY_ITEM_KEY = 'valubot.lead.mondayItemId';

export function getOrCreateLeadSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
    const created = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(SESSION_ID_KEY, created);
    return created;
  } catch {
    return `sess_${Date.now()}`;
  }
}

export function persistLeadSession(lead: {
  id: string;
  sessionId: string;
  mondayItemId?: string | null;
}): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_ID_KEY, lead.sessionId);
    sessionStorage.setItem(LEAD_ID_KEY, lead.id);
    if (lead.mondayItemId) {
      sessionStorage.setItem(MONDAY_ITEM_KEY, lead.mondayItemId);
    }
  } catch {
    // quota / private mode
  }
}

export function readLeadSession(): {
  sessionId: string | null;
  leadId: string | null;
  mondayItemId: string | null;
} {
  if (typeof window === 'undefined') {
    return { sessionId: null, leadId: null, mondayItemId: null };
  }
  try {
    return {
      sessionId: sessionStorage.getItem(SESSION_ID_KEY),
      leadId: sessionStorage.getItem(LEAD_ID_KEY),
      mondayItemId: sessionStorage.getItem(MONDAY_ITEM_KEY),
    };
  } catch {
    return { sessionId: null, leadId: null, mondayItemId: null };
  }
}

export function clearLeadSession(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(SESSION_ID_KEY);
    sessionStorage.removeItem(LEAD_ID_KEY);
    sessionStorage.removeItem(MONDAY_ITEM_KEY);
  } catch {
    // ignore
  }
}
