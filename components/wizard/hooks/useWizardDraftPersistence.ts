/**
 * Client-side wizard draft persistence (localStorage only).
 * Key is isolated from equify_valuation_state (results/deliver path).
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EquifyWizardState } from '../../../lib/wizard/map_equify_wizard';

export const WIZARD_DRAFT_STORAGE_KEY = 'equify:wizard:draft:v1';
export const WIZARD_DRAFT_MAX_AGE_MS = 72 * 60 * 60 * 1000;
export const WIZARD_DRAFT_DEBOUNCE_MS = 800;

export interface WizardDraftEnvelope {
  version: 1;
  savedAt: string;
  state: EquifyWizardState;
}

function readDraftRaw(): WizardDraftEnvelope | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(WIZARD_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WizardDraftEnvelope;
    if (parsed?.version !== 1 || !parsed.state || !parsed.savedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearWizardDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(WIZARD_DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function writeWizardDraft(state: EquifyWizardState): void {
  if (typeof window === 'undefined') return;
  try {
    const envelope: WizardDraftEnvelope = {
      version: 1,
      savedAt: new Date().toISOString(),
      state,
    };
    localStorage.setItem(WIZARD_DRAFT_STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // quota / private mode
  }
}

export function loadFreshWizardDraft(
  maxAgeMs: number = WIZARD_DRAFT_MAX_AGE_MS,
): WizardDraftEnvelope | null {
  const draft = readDraftRaw();
  if (!draft) return null;
  const savedAt = Date.parse(draft.savedAt);
  if (!Number.isFinite(savedAt)) {
    clearWizardDraft();
    return null;
  }
  if (Date.now() - savedAt > maxAgeMs) {
    clearWizardDraft();
    return null;
  }
  return draft;
}

export interface UseWizardDraftPersistenceResult {
  restoredNotice: boolean;
  dismissRestoredNotice: () => void;
  startFreshDraft: () => void;
}

/**
 * Debounced save of wizard state; optional restore on mount via callbacks.
 * Never touches `equify_valuation_state`.
 */
export function useWizardDraftPersistence(input: {
  state: EquifyWizardState;
  enabled?: boolean;
  onRestore?: (state: EquifyWizardState) => void;
  onStartFresh?: () => void;
}): UseWizardDraftPersistenceResult {
  const { state, enabled = true, onRestore, onStartFresh } = input;
  const [restoredNotice, setRestoredNotice] = useState(false);
  const restoredOnce = useRef(false);
  const timerRef = useRef<number | null>(null);
  const onRestoreRef = useRef(onRestore);
  const onStartFreshRef = useRef(onStartFresh);
  onRestoreRef.current = onRestore;
  onStartFreshRef.current = onStartFresh;

  useEffect(() => {
    if (!enabled || restoredOnce.current) return;
    restoredOnce.current = true;
    const draft = loadFreshWizardDraft();
    if (!draft) return;
    onRestoreRef.current?.(draft.state);
    setRestoredNotice(true);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      writeWizardDraft(state);
    }, WIZARD_DRAFT_DEBOUNCE_MS);
    return () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [state, enabled]);

  const dismissRestoredNotice = useCallback(() => {
    setRestoredNotice(false);
  }, []);

  const startFreshDraft = useCallback(() => {
    clearWizardDraft();
    setRestoredNotice(false);
    onStartFreshRef.current?.();
  }, []);

  return { restoredNotice, dismissRestoredNotice, startFreshDraft };
}
