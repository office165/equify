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
  type EquifyGoalKey,
  type EquifyLifecycleKey,
  type EquifySectorKey,
  type ValuationComputed,
  type ValuationScenarios,
} from '../../../lib/valuation';
import { getIndustryConfig } from '../../../lib/constants/industry_config';
import {
  buildValuationInputsFromEquifyState,
} from '../../../lib/wizard/build_valuation_inputs';
import {
  computeNetDebtK,
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

  const computed = useMemo(
    () => computeValuation(buildValuationInputsFromEquifyState(state)),
    [state],
  );
  const scenarios = useMemo(() => {
    const inputs = buildValuationInputsFromEquifyState(state);
    return computeScenarios(computed, inputs);
  }, [computed, state]);

  const updateProfile = useCallback((patch: Partial<EquifyWizardProfile>) => {
    setState((prev) => ({ ...prev, profile: { ...prev.profile, ...patch } }));
  }, []);

  const updateFinancials = useCallback((patch: Partial<EquifyWizardFinancials>) => {
    setState((prev) => {
      const next = { ...prev.financials, ...patch };
      const netDebt = computeNetDebtK(next);
      return {
        ...prev,
        financials: { ...next, debt: netDebt },
      };
    });
  }, []);

  const updateRisk = useCallback((patch: Partial<EquifyWizardRisk>) => {
    setState((prev) => ({ ...prev, risk: { ...prev.risk, ...patch } }));
  }, []);

  const setSector = useCallback((sector: EquifySectorKey) => {
    setState((prev) => {
      const subs = getIndustryConfig(sector).subSectors;
      return {
        ...prev,
        profile: {
          ...prev.profile,
          sector,
          subSector: subs[0]?.id ?? '',
        },
      };
    });
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
