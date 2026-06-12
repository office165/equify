'use client';

import type { WizardStep1LeadPayload } from './step1_lead_sync';

const QUEUE_STORAGE_KEY = 'valubot.wizard.progressQueue';
const DEBOUNCE_MS = 400;
const MAX_SILENT_RETRIES = 3;
const RETRY_BASE_MS = 800;

type SaveStatusListener = (saved: boolean) => void;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPayload: WizardStep1LeadPayload | null = null;
let flushInFlight = false;
const listeners = new Set<SaveStatusListener>();

function notifyListeners(saved: boolean): void {
  listeners.forEach((listener) => listener(saved));
}

export function subscribeWizardSaveStatus(listener: SaveStatusListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function hasPendingWizardSaves(): boolean {
  if (pendingPayload || flushInFlight) return true;
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as unknown[];
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

function readQueue(): WizardStep1LeadPayload[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WizardStep1LeadPayload[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items: WizardStep1LeadPayload[]): void {
  if (typeof window === 'undefined') return;
  try {
    if (items.length === 0) {
      localStorage.removeItem(QUEUE_STORAGE_KEY);
    } else {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(items));
    }
  } catch {
    // quota / privacy mode
  }
}

function enqueueLocal(payload: WizardStep1LeadPayload): void {
  const queue = readQueue();
  queue.push(payload);
  writeQueue(queue.slice(-5));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postProgressToApi(payload: WizardStep1LeadPayload): Promise<boolean> {
  const [{ postLeadEvent }, { getIndustryLabel }] = await Promise.all([
    import('../crm/leads_client'),
    import('../constants/industries'),
  ]);

  const sectorLabel = payload.industryCode
    ? getIndustryLabel(payload.industryCode, payload.locale)
    : undefined;

  const result = await postLeadEvent({
    event: 'wizard_step1',
    fullName: payload.fullName.trim(),
    companyName: payload.companyName.trim(),
    userEmail: payload.userEmail.trim(),
    userPhone: payload.userPhone.trim(),
    nationalId: payload.nationalId.trim(),
    corporateTaxId: payload.corporateTaxId.trim(),
    industryCode: payload.industryCode,
    sectorLabel,
    locale: payload.locale,
  });

  return Boolean(result?.ok);
}

async function flushPayload(payload: WizardStep1LeadPayload): Promise<boolean> {
  for (let attempt = 0; attempt < MAX_SILENT_RETRIES; attempt += 1) {
    const ok = await postProgressToApi(payload);
    if (ok) return true;
    if (attempt < MAX_SILENT_RETRIES - 1) {
      await sleep(RETRY_BASE_MS * 2 ** attempt);
    }
  }
  return false;
}

async function flushQueue(): Promise<void> {
  if (flushInFlight) return;
  flushInFlight = true;
  try {
    const queued = readQueue();
    const targets = pendingPayload ? [pendingPayload, ...queued] : queued;
    pendingPayload = null;

    for (const payload of targets) {
      const ok = await flushPayload(payload);
      if (ok) {
        notifyListeners(true);
      } else {
        enqueueLocal(payload);
      }
    }

    if (readQueue().length > 0) {
      void retryQueuedSaves();
    }
  } finally {
    flushInFlight = false;
  }
}

async function retryQueuedSaves(): Promise<void> {
  const queue = readQueue();
  if (queue.length === 0) return;

  const remaining: WizardStep1LeadPayload[] = [];
  for (const payload of queue) {
    const ok = await flushPayload(payload);
    if (ok) {
      notifyListeners(true);
    } else {
      remaining.push(payload);
    }
  }
  writeQueue(remaining);
}

/**
 * Debounced, non-blocking wizard progress save.
 * Call AFTER step transition — never await from navigation handlers.
 */
export function scheduleWizardProgressSave(payload: WizardStep1LeadPayload): void {
  pendingPayload = payload;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void flushQueue();
  }, DEBOUNCE_MS);
}

/** Immediate flush — use on final submit before dashboard unmount (no debounce). */
export function dispatchLeadNow(payload: WizardStep1LeadPayload): void {
  pendingPayload = payload;
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  void flushQueue();
}

/** Drain any localStorage-queued saves on wizard mount. */
export function resumeWizardProgressQueue(): void {
  if (!hasPendingWizardSaves()) return;
  void retryQueuedSaves();
}
