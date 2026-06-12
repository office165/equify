import type { EquifyWizardState } from './map_equify_wizard';

export const EQUIFY_WIZARD_STATE_KEY = 'valubot.equifyWizardState';

export function saveEquifyWizardState(state: EquifyWizardState): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(EQUIFY_WIZARD_STATE_KEY, JSON.stringify(state));
  } catch {
    // quota / private mode
  }
}

export function loadEquifyWizardState(): EquifyWizardState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(EQUIFY_WIZARD_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EquifyWizardState;
  } catch {
    return null;
  }
}
