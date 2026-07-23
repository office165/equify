'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import { applyReportingFxLayer } from '../../../lib/valuation/apply_reporting_fx';
import { getCachedFxRates, refreshFxRates, type FxRatesSnapshot } from '../../../lib/utils/fxService';
import { coerceWizardSectorSelection, getIndustryConfig } from '../../../lib/constants/industry_config';
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
import { syncFinancialsDerived } from '../../../lib/wizard/financial_history';
import {
  buildSectorMarketContext,
  deriveFinancialDefaultsFromSectorMetrics,
  fetchSectorMetricsClient,
} from '../../../lib/wizard/sector_market_defaults';
import {
  getCurrencySymbol,
  resolveActiveCurrency,
  type ActiveCurrencyProfile,
} from '../../../lib/utils/formatCurrency';
import type { ReportingCurrencyCode } from '../../../lib/wizard/reporting_currency';

export interface WizardValuationContextValue {
  state: EquifyWizardState;
  step: number;
  computed: ValuationComputed;
  scenarios: ValuationScenarios;
  sectorMarketDefaultsPending: boolean;
  /** Active reporting currency from Step 2 profile. */
  reportingCurrency: ReportingCurrencyCode;
  /** Display symbol for {@link reportingCurrency}. */
  currencySymbol: string;
  /** Token profile for formatting — symbol, code, position, locale. */
  activeCurrency: ActiveCurrencyProfile;
  /** Active FX snapshot used for reporting-currency conversion (live cache or fallback). */
  fxRates: FxRatesSnapshot;
  setStep: (step: number) => void;
  updateProfile: (patch: Partial<EquifyWizardProfile>) => void;
  updateFinancials: (patch: Partial<EquifyWizardFinancials>) => void;
  updateRisk: (patch: Partial<EquifyWizardRisk>) => void;
  setReportingCurrency: (currency: ReportingCurrencyCode) => void;
  setSector: (sector: EquifySectorKey) => void;
  setLifecycle: (lifecycle: EquifyLifecycleKey) => void;
  setGoal: (goal: EquifyGoalKey) => void;
  setAgreedToTerms: (agreed: boolean) => void;
  applySectorMarketDefaults: (sector: EquifySectorKey) => Promise<void>;
  resetWizard: () => void;
  /** Full replace — used by draft restore only. */
  replaceWizardState: (next: EquifyWizardState) => void;
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
  const [state, setState] = useState<EquifyWizardState>(() => {
    const base = initialState ?? DEFAULT_EQUIFY_WIZARD_STATE;
    const coerced = coerceWizardSectorSelection(base.profile.sector, base.profile.subSector);
    if (
      coerced.sector === base.profile.sector &&
      coerced.subSector === base.profile.subSector
    ) {
      return base;
    }
    return {
      ...base,
      profile: { ...base.profile, ...coerced },
    };
  });
  const [step, setStep] = useState(1);
  const [sectorMarketDefaultsPending, setSectorMarketDefaultsPending] = useState(false);
  const [fxRates, setFxRates] = useState<FxRatesSnapshot>(() => getCachedFxRates());
  const sectorDefaultsInflight = useRef<EquifySectorKey | null>(null);

  useEffect(() => {
    let cancelled = false;
    void refreshFxRates().then((rates) => {
      if (!cancelled) setFxRates(rates);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const baseComputed = useMemo(
    () => computeValuation(buildValuationInputsFromEquifyState(state)),
    [state],
  );
  const baseScenarios = useMemo(() => {
    const inputs = buildValuationInputsFromEquifyState(state);
    return computeScenarios(baseComputed, inputs);
  }, [baseComputed, state]);

  const reportingCurrency = state.profile.currency;
  const currencySymbol = getCurrencySymbol(reportingCurrency);
  const activeCurrency = useMemo(
    () => resolveActiveCurrency(reportingCurrency, 'he'),
    [reportingCurrency],
  );

  const { computed, scenarios } = useMemo(
    () =>
      applyReportingFxLayer(
        baseComputed,
        baseScenarios,
        reportingCurrency,
        fxRates,
      ),
    [baseComputed, baseScenarios, fxRates, reportingCurrency],
  );

  const updateProfile = useCallback((patch: Partial<EquifyWizardProfile>) => {
    setState((prev) => {
      const nextProfile = { ...prev.profile, ...patch };
      const subSectorChanged =
        patch.subSector != null && patch.subSector !== prev.profile.subSector;

      return {
        ...prev,
        profile: nextProfile,
        financials: subSectorChanged
          ? {
              ...prev.financials,
              customMultiple: null,
              isManualMultiple: false,
            }
          : prev.financials,
      };
    });
  }, []);

  const updateFinancials = useCallback((patch: Partial<EquifyWizardFinancials>) => {
    setState((prev) => {
      const merged = { ...prev.financials, ...patch };
      const next = syncFinancialsDerived(merged);
      return {
        ...prev,
        financials: next,
      };
    });
  }, []);

  const updateRisk = useCallback((patch: Partial<EquifyWizardRisk>) => {
    setState((prev) => ({ ...prev, risk: { ...prev.risk, ...patch } }));
  }, []);

  const applySectorMarketDefaults = useCallback(async (sector: EquifySectorKey) => {
    if (sectorDefaultsInflight.current === sector) return;

    let shouldFetch = false;
    setState((prev) => {
      if (prev.financials.sectorDefaultsFor === sector) return prev;
      shouldFetch = true;
      return prev;
    });
    if (!shouldFetch) return;

    sectorDefaultsInflight.current = sector;
    setSectorMarketDefaultsPending(true);

    try {
      const metrics = await fetchSectorMetricsClient(sector);
      const defaults = deriveFinancialDefaultsFromSectorMetrics(sector, metrics);
      const marketContext = buildSectorMarketContext(sector, metrics);

      setState((prev) => {
        if (prev.profile.sector !== sector) return prev;
        const merged = syncFinancialsDerived({
          ...prev.financials,
          growth: defaults.growthPct,
          capexLevelPct: defaults.capexLevelPct,
          sectorDefaultsFor: sector,
          marketContext,
        });
        return { ...prev, financials: merged };
      });
    } finally {
      if (sectorDefaultsInflight.current === sector) {
        sectorDefaultsInflight.current = null;
      }
      setSectorMarketDefaultsPending(false);
    }
  }, []);

  const setSector = useCallback(
    (sector: EquifySectorKey) => {
      setState((prev) => {
        const subs = getIndustryConfig(sector).subSectors;
        const firstSub = subs[0]?.id ?? '';
        return {
          ...prev,
          profile: {
            ...prev.profile,
            sector,
            subSector: firstSub,
          },
          financials: {
            ...prev.financials,
            sectorDefaultsFor:
              prev.financials.sectorDefaultsFor === sector
                ? sector
                : undefined,
            customMultiple: null,
            isManualMultiple: false,
          },
        };
      });
      void applySectorMarketDefaults(sector);
    },
    [applySectorMarketDefaults],
  );

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
    sectorDefaultsInflight.current = null;
    setSectorMarketDefaultsPending(false);
    setState(DEFAULT_EQUIFY_WIZARD_STATE);
    setStep(1);
  }, []);

  const replaceWizardState = useCallback((next: EquifyWizardState) => {
    const coerced = coerceWizardSectorSelection(
      next.profile.sector,
      next.profile.subSector,
    );
    setState({
      ...next,
      profile: { ...next.profile, ...coerced },
      financials: syncFinancialsDerived(next.financials),
    });
  }, []);

  const setReportingCurrency = useCallback((currency: ReportingCurrencyCode) => {
    setState((prev) => ({
      ...prev,
      profile: { ...prev.profile, currency },
    }));
    void refreshFxRates().then(setFxRates);
  }, []);

  const value = useMemo<WizardValuationContextValue>(
    () => ({
      state,
      step,
      computed,
      scenarios,
      sectorMarketDefaultsPending,
      reportingCurrency,
      currencySymbol,
      activeCurrency,
      fxRates,
      setStep,
      updateProfile,
      updateFinancials,
      updateRisk,
      setReportingCurrency,
      setSector,
      setLifecycle,
      setGoal,
      setAgreedToTerms,
      applySectorMarketDefaults,
      resetWizard,
      replaceWizardState,
    }),
    [
      applySectorMarketDefaults,
      computed,
      currencySymbol,
      activeCurrency,
      fxRates,
      reportingCurrency,
      resetWizard,
      replaceWizardState,
      scenarios,
      sectorMarketDefaultsPending,
      setAgreedToTerms,
      setGoal,
      setLifecycle,
      setReportingCurrency,
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

export function useReportingCurrency() {
  const { reportingCurrency, currencySymbol, activeCurrency, setReportingCurrency } =
    useWizardValuation();
  return { reportingCurrency, currencySymbol, activeCurrency, setReportingCurrency };
}
