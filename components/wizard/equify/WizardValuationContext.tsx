'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  computeScenarios,
  computeValuation,
  LIFECYCLE_ADJ,
  SECTOR_MULTIPLIERS,
  type EquifyGoalKey,
  type EquifyLifecycleKey,
  type EquifySectorKey,
  type ValuationComputed,
  type ValuationScenarios,
} from '../../../lib/valuation';
import {
  DEFAULT_EQUIFY_WIZARD_STATE,
  type EquifyWizardFinancials,
  type EquifyWizardProfile,
  type EquifyWizardRisk,
  type EquifyWizardState,
} from '../../../lib/wizard/map_equify_wizard';

export interface WizardValuationContextValue {
  state: EquifyWizardState;
  step: number;
  computed: ValuationComputed;
  scenarios: ValuationScenarios;
  setStep: (step: number) => void;
  updateProfile: (patch: Partial<EquifyWizardProfile>) => void;
  updateFinancials: (patch: Partial<EquifyWizardFinancials>) => void;
  updateRisk: (patch: Partial<EquifyWizardRisk>) => void;
  setSector: (sector: EquifySectorKey) => void;
  setLifecycle: (lifecycle: EquifyLifecycleKey) => void;
  setGoal: (goal: EquifyGoalKey) => void;
  setAgreedToTerms: (agreed: boolean) => void;
  resetWizard: () => void;
}

const WizardValuationContext = createContext<WizardValuationContextValue | null>(
  null,
);

function buildInputs(state: EquifyWizardState) {
  const { financials, risk, profile } = state;
  return {
    rev: financials.rev,
    margin: financials.margin,
    growth: financials.growth,
    debt: financials.debt,
    sectorMult: SECTOR_MULTIPLIERS[profile.sector],
    lifecycleAdj: LIFECYCLE_ADJ[profile.lifecycle],
    recurring: risk.recurring,
    topCustomer: risk.topCustomer,
    founderDep: risk.founderDep,
    competition: risk.competition,
    ip: risk.ip,
    contracts: risk.contracts,
  };
}

export function WizardValuationProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: EquifyWizardState;
}) {
  const [state, setState] = useState<EquifyWizardState>(
    initialState ?? DEFAULT_EQUIFY_WIZARD_STATE,
  );
  const [step, setStep] = useState(1);

  const computed = useMemo(() => computeValuation(buildInputs(state)), [state]);
  const scenarios = useMemo(
    () =>
      computeScenarios(computed, {
        growth: state.financials.growth,
        debt: state.financials.debt,
      }),
    [computed, state.financials.debt, state.financials.growth],
  );

  const updateProfile = useCallback((patch: Partial<EquifyWizardProfile>) => {
    setState((prev) => ({ ...prev, profile: { ...prev.profile, ...patch } }));
  }, []);

  const updateFinancials = useCallback((patch: Partial<EquifyWizardFinancials>) => {
    setState((prev) => ({
      ...prev,
      financials: { ...prev.financials, ...patch },
    }));
  }, []);

  const updateRisk = useCallback((patch: Partial<EquifyWizardRisk>) => {
    setState((prev) => ({ ...prev, risk: { ...prev.risk, ...patch } }));
  }, []);

  const setSector = useCallback((sector: EquifySectorKey) => {
    setState((prev) => ({ ...prev, profile: { ...prev.profile, sector } }));
  }, []);

  const setLifecycle = useCallback((lifecycle: EquifyLifecycleKey) => {
    setState((prev) => ({ ...prev, profile: { ...prev.profile, lifecycle } }));
  }, []);

  const setGoal = useCallback((goal: EquifyGoalKey) => {
    setState((prev) => ({ ...prev, goal }));
  }, []);

  const setAgreedToTerms = useCallback((agreedToTerms: boolean) => {
    setState((prev) => ({ ...prev, agreedToTerms }));
  }, []);

  const resetWizard = useCallback(() => {
    setState(DEFAULT_EQUIFY_WIZARD_STATE);
    setStep(1);
  }, []);

  const value = useMemo<WizardValuationContextValue>(
    () => ({
      state,
      step,
      computed,
      scenarios,
      setStep,
      updateProfile,
      updateFinancials,
      updateRisk,
      setSector,
      setLifecycle,
      setGoal,
      setAgreedToTerms,
      resetWizard,
    }),
    [
      computed,
      resetWizard,
      scenarios,
      setAgreedToTerms,
      setGoal,
      setLifecycle,
      setSector,
      state,
      step,
      updateFinancials,
      updateProfile,
      updateRisk,
    ],
  );

  return (
    <WizardValuationContext.Provider value={value}>
      {children}
    </WizardValuationContext.Provider>
  );
}

export function useWizardValuation(): WizardValuationContextValue {
  const ctx = useContext(WizardValuationContext);
  if (!ctx) {
    throw new Error('useWizardValuation must be used within WizardValuationProvider');
  }
  return ctx;
}
