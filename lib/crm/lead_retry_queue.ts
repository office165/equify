'use client';

import type { LeadUpsertBody } from './leads_types';

const FAILED_QUEUE_KEY = 'valubot.lead.failedQueue';
const MAX_QUEUE_SIZE = 8;

function readFailedQueue(): LeadUpsertBody[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FAILED_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LeadUpsertBody[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFailedQueue(items: LeadUpsertBody[]): void {
  if (typeof window === 'undefined') return;
  try {
    if (items.length === 0) {
      localStorage.removeItem(FAILED_QUEUE_KEY);
      return;
    }
    localStorage.setItem(FAILED_QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUE_SIZE)));
  } catch (err) {
    console.error('[lead-retry-queue] failed to persist queue', err);
  }
}

/** Persist a failed CRM payload for a later retry (e.g. after PDF export). */
export function enqueueFailedLeadPayload(body: LeadUpsertBody): void {
  const queue = readFailedQueue();
  queue.push(body);
  writeFailedQueue(queue);
  console.warn('[lead-retry-queue] queued failed payload for retry', {
    event: body.event,
    queueSize: queue.length,
    userEmail: body.userEmail,
  });
}

export function readFailedLeadQueue(): LeadUpsertBody[] {
  return readFailedQueue();
}

export function removeFailedLeadPayload(match: LeadUpsertBody): void {
  const queue = readFailedQueue();
  const idx = queue.findIndex(
    (item) =>
      item.event === match.event &&
      item.sessionId === match.sessionId &&
      item.userEmail === match.userEmail &&
      item.valuationMidpoint === match.valuationMidpoint,
  );
  if (idx >= 0) {
    queue.splice(idx, 1);
    writeFailedQueue(queue);
  }
}

export function clearFailedLeadQueue(): void {
  writeFailedQueue([]);
}
