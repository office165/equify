import type { ValuationComputed } from '../valuation';
import { readLeadSession } from '../crm/lead_session';
import type { EquifyWizardState } from './map_equify_wizard';
import { saveEquifyWizardState, loadEquifyWizardState } from './equify_storage';
import type { MondayLeadCheckoutStatus } from './vip_promo';

/** Full wizard snapshot persisted before PayPal checkout. */
export const EQUIFY_VALUATION_STATE_KEY = 'equify_valuation_state';

export interface EquifyValuationSummary {
  equityK: number;
  evK: number;
  ebitdaK: number;
  wacc: number;
  qualityScore: number;
}

export interface EquifyValuationPersistedState {
  version: 1;
  savedAt: string;
  wizard: EquifyWizardState;
  summary: EquifyValuationSummary;
  mondayItemId: string | null;
  leadId: string | null;
  sessionId: string | null;
  userEmail: string;
  promoCode: string | null;
  paymentPath: 'vip' | 'paypal' | 'promo_free' | null;
  mondayStatus: MondayLeadCheckoutStatus | null;
}

export function buildEquifyValuationSnapshot(
  wizard: EquifyWizardState,
  computed: ValuationComputed,
  options?: {
    promoCode?: string | null;
    paymentPath?: 'vip' | 'paypal' | 'promo_free' | null;
    mondayStatus?: MondayLeadCheckoutStatus | null;
  },
): EquifyValuationPersistedState {
  const leadSession = readLeadSession();
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    wizard,
    summary: {
      equityK: computed.equity,
      evK: computed.ev,
      ebitdaK: wizard.financials.y2026.ebitdaK,
      wacc: computed.wacc,
      qualityScore: computed.qs,
    },
    mondayItemId: leadSession.mondayItemId,
    leadId: leadSession.leadId,
    sessionId: leadSession.sessionId,
    userEmail: wizard.profile.userEmail,
    promoCode: options?.promoCode ?? null,
    paymentPath: options?.paymentPath ?? null,
    mondayStatus: options?.mondayStatus ?? null,
  };
}

export function persistEquifyValuationState(snapshot: EquifyValuationPersistedState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(EQUIFY_VALUATION_STATE_KEY, JSON.stringify(snapshot));
  } catch {
    // quota / private mode
  }
  saveEquifyWizardState(snapshot.wizard);
}

export function loadEquifyValuationState(): EquifyValuationPersistedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(EQUIFY_VALUATION_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EquifyValuationPersistedState;
    if (parsed?.version !== 1 || !parsed.wizard) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Prefer localStorage snapshot; fall back to legacy session wizard state. */
export function loadBestEquifyWizardState(): EquifyWizardState | null {
  return loadEquifyValuationState()?.wizard ?? loadEquifyWizardState();
}
