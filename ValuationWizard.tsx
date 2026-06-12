'use client';

import React, {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LanguageToggle,
  useValuationI18n,
  type TranslationKey,
  type ValuationTranslations,
} from './valuation_i18n';
import {
  AccessibilityRegion,
  WizardSkipLink,
} from './lib/components/accessibility';
import { TermsDisclaimerCheckbox } from './lib/components/TermsDisclaimerCheckbox';
import { TERMS_AND_AI_DISCLAIMER_HE } from './lib/legal/terms';
import { AmbientBackground } from './components/ambient/AmbientBackground';
import { SiteHeader } from './components/brand/SiteHeader';
import { useReducedMotion } from './components/landing/motion/useReducedMotion';
import { DUR, EASE, PROGRESS_SPRING, wizardStepOffset } from './lib/motion';
import { postLeadEvent } from './lib/crm/leads_client';
import type { WizardStep1LeadPayload } from './lib/wizard/step1_lead_sync';
import { lockLeadPayload } from './lib/wizard/lead_wire';
import { toLeadUpsertBody } from './lib/wizard/secured_lead_dispatch';
import {
  dispatchLeadNow,
  hasPendingWizardSaves,
  resumeWizardProgressQueue,
  scheduleWizardProgressSave,
  subscribeWizardSaveStatus,
} from './lib/wizard/wizard_progress_queue';
import { SiteFooter } from './components/SiteFooter';
import { FieldHelpTooltip } from './components/ui/FieldHelpTooltip';
import { SmartNumberInput } from './components/ui/SmartNumberInput';
import { parseFinancialInput } from './lib/utils/financialParser';
import { formatCurrencyShort } from './lib/utils/formatCurrency';
import {
  areUserIdentifiersValid,
  validateUserIdentifiers,
  type UserIdentifierFieldKey,
} from './lib/validation/user_identifiers';
import {
  getIndustrySelectOptions,
  SAAS_INDUSTRY,
} from './lib/constants/industries';
import { getIncorporationCountryOptions } from './lib/constants/countries';
import {
  AccessibilityPreferencesProvider,
  useAccessibilityPreferences,
} from './lib/accessibility/accessibility_preferences';
import { AccessibilityToolbar } from './lib/components/AccessibilityToolbar';
import {
  VB_CINEMATIC_ROOT,
  VB_GLASS_PANE,
  VB_GLASS_PANE_SUBTLE,
  VB_FINTECH_INPUT,
  VB_LIFECYCLE_CARD,
  VB_LIFECYCLE_CARD_ACTIVE,
  VB_LIFECYCLE_CARD_IDLE,
  VB_PRIMARY_BTN,
  VB_PROGRESS_FILL,
  VB_PROGRESS_TRACK,
  VB_SECONDARY_BTN,
} from './lib/styles/fintech_ui';

export { TERMS_AND_AI_DISCLAIMER_HE };

export {
  buildWizardLeadRelayInput,
  captureWizardLeadIdentifiers,
  type WizardLeadIdentifierBundle,
} from './lib/wizard/lead_wire';

// =============================================================================
// Types & form model (React Hook Form–compatible shape)
// =============================================================================

export type LifecycleStage = 'seed' | 'early' | 'growth' | 'mature';

export type ValuationPurposeOption =
  | 'M&A_SALE'
  | 'CAPITAL_RAISE'
  | 'TAX'
  | 'INTERNAL_REPORT';

export type CurrencyCode = 'ILS' | 'USD' | 'EUR' | 'GBP';

function formStringToNumber(raw: string): number | null {
  if (!raw.trim()) return null;
  const n = parseFinancialInput(raw);
  return Number.isFinite(n) ? n : null;
}

function numberToFormString(value: number | null): string {
  return value === null ? '' : String(value);
}

function currencySymbol(code: CurrencyCode): '₪' | '$' | '€' {
  switch (code) {
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    default:
      return '₪';
  }
}

export interface ValuationWizardFormValues {
  // Step 1 — Mandatory user identifiers (report access gate)
  userMobilePhone: string;
  userNationalId: string;
  userCorporateTaxId?: string;
  userEmail: string;

  // Step 1 — Company Profile
  companyName: string;
  fullName: string;
  industry: string;
  lifecycleStage: LifecycleStage | '';
  currency: CurrencyCode;
  incorporationCountry: string;
  foundedYear: string;

  // Step 2 — Financial Inputs
  annualRevenue: string;
  annualChurnRate: string;
  ebitda: string;
  freeCashFlow: string;
  rdExpensesY1: string;
  rdExpensesY2: string;
  rdExpensesY3: string;
  rdExpensesY4: string;
  rdExpensesY5: string;
  interestExpense: string;
  totalDebt: string;
  cashAndEquivalents: string;

  // Step 1 — Qualitative context (PDF intangibles)
  qualitativeDescription: string;
  /** White-label logo as base64 data URL (png/jpg) */
  customLogoDataUrl: string;

  // Step 2 — Capital bridge
  netDebt: string;

  // Step 3 — Risk Modifiers
  recurringRevenuePct: number;
  customerConcentrationPct: number;
  customerConcentrationOver20: boolean;
  competitionLevel: number;
  ipProtection: boolean;
  founderDependency: boolean;

  // Step 4 — Valuation Purpose
  valuationPurpose: ValuationPurposeOption | '';
}

export type { SecuredLeadFiveFieldPayload as SecuredLeadDispatchPayload } from './lib/wizard/lead_wire';

/** Fire-and-forget relay — survives dashboard unmount after submit. */
function dispatchSecuredLeadRelay(
  payload: WizardStep1LeadPayload,
  event: 'wizard_step1' | 'wizard_completed' = 'wizard_step1',
  extras: {
    valuationMidpoint?: number;
    valuationPurpose?: ValuationWizardFormValues['valuationPurpose'];
  } = {},
): void {
  const upsertBody = toLeadUpsertBody(
    {
      fullName: payload.fullName,
      companyName: payload.companyName,
      userPhone: payload.userPhone,
      nationalId: payload.nationalId,
      userEmail: payload.userEmail,
    },
    event,
    {
      corporateTaxId: payload.corporateTaxId,
      industryCode: payload.industryCode,
      locale: payload.locale,
      valuationMidpoint: extras.valuationMidpoint,
      valuationPurpose: extras.valuationPurpose || undefined,
    },
  );

  console.log('🚀 MONDAY INTEGRATION INGESTION INITIATED. PAYLOAD:', upsertBody);
  dispatchLeadNow(payload);
  void postLeadEvent(upsertBody).catch((err) => {
    console.error('❌ MONDAY ROUTING FAILURE:', err);
  });
}

const defaultValues: ValuationWizardFormValues = {
  userMobilePhone: '',
  userNationalId: '',
  userCorporateTaxId: '',
  userEmail: '',
  companyName: '',
  fullName: '',
  industry: '',
  lifecycleStage: '',
  currency: 'ILS',
  incorporationCountry: 'IL',
  foundedYear: '',
  annualRevenue: '',
  annualChurnRate: '',
  ebitda: '',
  freeCashFlow: '',
  rdExpensesY1: '',
  rdExpensesY2: '',
  rdExpensesY3: '',
  rdExpensesY4: '',
  rdExpensesY5: '',
  interestExpense: '',
  totalDebt: '',
  cashAndEquivalents: '',
  qualitativeDescription: '',
  customLogoDataUrl: '',
  netDebt: '',
  recurringRevenuePct: 60,
  customerConcentrationPct: 25,
  customerConcentrationOver20: false,
  competitionLevel: 3,
  ipProtection: true,
  founderDependency: false,
  valuationPurpose: '',
};

function handleRadioGroupKeyDown(
  e: React.KeyboardEvent,
  optionIds: readonly string[],
  currentId: string,
  onSelect: (id: string) => void,
  isRtl: boolean,
): void {
  const idx = optionIds.indexOf(currentId);
  const activeIdx = idx >= 0 ? idx : 0;
  const prevKey = isRtl ? 'ArrowRight' : 'ArrowLeft';
  const nextKey = isRtl ? 'ArrowLeft' : 'ArrowRight';
  let nextIdx = activeIdx;

  if (e.key === prevKey || e.key === 'ArrowUp') {
    e.preventDefault();
    nextIdx = activeIdx <= 0 ? optionIds.length - 1 : activeIdx - 1;
  } else if (e.key === nextKey || e.key === 'ArrowDown') {
    e.preventDefault();
    nextIdx = activeIdx >= optionIds.length - 1 ? 0 : activeIdx + 1;
  } else if (e.key === 'Home') {
    e.preventDefault();
    nextIdx = 0;
  } else if (e.key === 'End') {
    e.preventDefault();
    nextIdx = optionIds.length - 1;
  } else {
    return;
  }

  onSelect(optionIds[nextIdx]);
}

function getLifecycleStages(i18n: ValuationTranslations) {
  return [
    {
      id: 'seed' as const,
      title: i18n.t('lifecycleSeed'),
      subtitle: i18n.t('lifecycleSeedSub'),
      icon: '◈',
    },
    {
      id: 'early' as const,
      title: i18n.t('lifecycleEarly'),
      subtitle: i18n.t('lifecycleEarlySub'),
      icon: '◇',
    },
    {
      id: 'growth' as const,
      title: i18n.t('lifecycleGrowth'),
      subtitle: i18n.t('lifecycleGrowthSub'),
      icon: '◆',
    },
    {
      id: 'mature' as const,
      title: i18n.t('lifecycleMature'),
      subtitle: i18n.t('lifecycleMatureSub'),
      icon: '⬡',
    },
  ];
}

function getPurposeCards(i18n: ValuationTranslations) {
  return [
    {
      id: 'M&A_SALE' as const,
      title: i18n.t('purposeMaTitle'),
      description: i18n.t('purposeMaDesc'),
      accent: 'from-emerald-400/20 to-teal-500/10',
    },
    {
      id: 'CAPITAL_RAISE' as const,
      title: i18n.t('purposeRaiseTitle'),
      description: i18n.t('purposeRaiseDesc'),
      accent: 'from-mint-400/20 to-emerald-500/10',
    },
    {
      id: 'TAX' as const,
      title: i18n.t('purposeTaxTitle'),
      description: i18n.t('purposeTaxDesc'),
      accent: 'from-slate-400/20 to-emerald-500/10',
    },
    {
      id: 'INTERNAL_REPORT' as const,
      title: i18n.t('purposeInternalTitle'),
      description: i18n.t('purposeInternalDesc'),
      accent: 'from-teal-400/15 to-slate-500/10',
    },
  ];
}

function getWizardSteps(i18n: ValuationTranslations) {
  return [
    { id: 1, label: i18n.t('stepCompanyProfile') },
    { id: 2, label: i18n.t('stepFinancialInputs') },
    { id: 3, label: i18n.t('stepRiskModifiers') },
    { id: 4, label: i18n.t('stepValuationPurpose') },
  ] as const;
}

// =============================================================================
// Primitives
// =============================================================================

function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

function markWizardPerf(label: string): void {
  if (typeof performance === 'undefined') return;
  performance.mark(label);
}

function logWizardContinuePerf(): void {
  if (process.env.NODE_ENV !== 'development' || typeof performance === 'undefined') {
    return;
  }
  const click = performance.getEntriesByName('continue-click').at(-1);
  const painted = performance.getEntriesByName('next-step-painted').at(-1);
  if (!click || !painted) return;
  const delta = painted.startTime - click.startTime;
  console.info(
    `[wizard-perf] continue-click → next-step-painted: ${delta.toFixed(1)}ms`,
  );
  try {
    performance.measure('wizard:continue-to-paint', 'continue-click', 'next-step-painted');
    const measure = performance.getEntriesByName('wizard:continue-to-paint').at(-1);
    if (measure) {
      console.info(
        `[wizard-perf] transition settled: ${measure.duration.toFixed(1)}ms`,
      );
    }
  } catch {
    // marks may be missing
  }
}

const RD_HISTORY_ROWS = [
  { key: 'rdExpensesY1', labelKey: 'rdYear2021', year: 2021 },
  { key: 'rdExpensesY2', labelKey: 'rdYear2022', year: 2022 },
  { key: 'rdExpensesY3', labelKey: 'rdYear2023', year: 2023 },
  { key: 'rdExpensesY4', labelKey: 'rdYear2024', year: 2024 },
  { key: 'rdExpensesY5', labelKey: 'rdYear2025', year: 2025 },
] as const;

type RdExpenseFieldKey = (typeof RD_HISTORY_ROWS)[number]['key'];

function FieldLabel({
  id,
  htmlFor,
  children,
  required,
  tooltip,
  helpAria,
  isRtl,
}: {
  id?: string;
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
  tooltip?: { label: string; content: string };
  helpAria: string;
  isRtl: boolean;
}) {
  const labelEl = (
    <label
      id={id}
      htmlFor={htmlFor}
      className="text-xs font-medium uppercase tracking-wider text-slate-300"
    >
      {children}
      {required && <span className="me-0.5 text-mint-400">*</span>}
    </label>
  );

  if (!tooltip) return labelEl;

  return (
    <FieldHelpTooltip
      label={tooltip.label}
      content={tooltip.content}
      helpAria={helpAria}
      isRtl={isRtl}
    >
      {labelEl}
    </FieldHelpTooltip>
  );
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/jpg'] as const;

function LogoUploadInput({
  id,
  value,
  onChange,
  i18n,
}: {
  id: string;
  value: string;
  onChange: (dataUrl: string) => void;
  i18n: ValuationTranslations;
}) {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!ACCEPTED_LOGO_TYPES.includes(file.type as (typeof ACCEPTED_LOGO_TYPES)[number])) {
      setError(i18n.t('customLogoErrorType'));
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError(i18n.t('customLogoErrorSize'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        onChange(result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="nextronium-glass space-y-3 rounded-2xl p-5">
      <FieldLabel htmlFor={id} helpAria={i18n.t('helpAria')} isRtl={i18n.isRtl}>
        {i18n.t('customLogoUpload')}
      </FieldLabel>
      <p className="text-xs text-slate-400">{i18n.t('customLogoUploadDesc')}</p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <label
          htmlFor={id}
          className="inline-flex cursor-pointer touch-manipulation items-center justify-center rounded-xl border border-dashed border-mint-400/40 bg-[#161D2A]/60 px-5 py-3 text-sm font-medium text-mint-400 transition hover:border-mint-400/60 hover:bg-[#161D2A]/80"
        >
          {value ? i18n.t('customLogoUpload') : 'PNG / JPG'}
        </label>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
          className="sr-only"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {value ? (
          <div className="flex flex-1 items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt=""
              className="h-14 max-w-[180px] rounded-lg border border-slate-600/50 bg-white/95 object-contain p-2"
            />
            <button
              type="button"
              onClick={() => {
                onChange('');
                setError(null);
              }}
              className="text-xs font-medium text-rose-300 underline-offset-2 hover:underline"
            >
              {i18n.t('customLogoRemove')}
            </button>
          </div>
        ) : null}
      </div>
      {error && (
        <p role="alert" className="text-xs text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}

function TextAreaInput({
  id,
  value,
  onChange,
  placeholder,
  ariaLabel,
  rows = 4,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel: string;
  rows?: number;
}) {
  return (
    <textarea
      id={id}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={cn(VB_FINTECH_INPUT, 'resize-y')}
    />
  );
}

function TextInput({
  id,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  type = 'text',
  inputMode,
  min,
  max,
  ariaLabel,
  labelId,
  required,
  invalid,
  describedBy,
  autoComplete,
}: {
  id: string;
  name?: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  min?: number;
  max?: number;
  ariaLabel: string;
  labelId?: string;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
  autoComplete?: string;
}) {
  return (
    <input
      id={id}
      name={name ?? id}
      type={type}
      inputMode={inputMode}
      min={min}
      max={max}
      autoComplete={autoComplete}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-labelledby={labelId}
      aria-required={required || undefined}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={VB_FINTECH_INPUT}
    />
  );
}

function SelectInput({
  id,
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  required,
  invalid,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[] | { value: string; label: string }[];
  placeholder: string;
  ariaLabel: string;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
}) {
  const normalized = options.map((o) =>
    typeof o === 'string' ? { value: o, label: o } : o,
  );

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      aria-required={required || undefined}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={cn(VB_FINTECH_INPUT, 'appearance-none')}
    >
      <option value="" className="bg-slate-900 text-slate-500">
        {placeholder}
      </option>
      {normalized.map((o) => (
        <option key={o.value} value={o.value} className="bg-slate-900">
          {o.label}
        </option>
      ))}
    </select>
  );
}

function RangeSlider({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
  formatValue,
  hint,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  formatValue?: (v: number) => string;
  hint?: string;
}) {
  const display = formatValue ? formatValue(value) : `${value}`;
  const valueId = `${id}-value`;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [valueId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-slate-200">
          {label}
        </label>
        <span
          id={valueId}
          className="shrink-0 rounded-lg bg-mint-400/10 px-2.5 py-1 font-mono text-sm font-semibold text-mint-400/90"
          aria-live="polite"
        >
          {display}
        </span>
      </div>
      <input
        id={id}
        type="range"
        role="slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={display}
        aria-describedby={describedBy}
        className="h-2.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#00bfa5] transition-all duration-300 focus-visible:shadow-[0_0_15px_rgba(0,191,165,0.2)] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[#00bfa5]/40 [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-emerald-300 [&::-webkit-slider-thumb]:to-[#00bfa5] [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(0,191,165,0.45)]"
      />
      {hint && (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}

function CalculatedNetDebtField({
  label,
  formulaHint,
  value,
  currencyCode,
}: {
  label: string;
  formulaHint: string;
  value: number;
  currencyCode: CurrencyCode;
}) {
  return (
    <div dir="rtl" className="space-y-2">
      <span className="text-xs font-medium uppercase tracking-wider text-slate-300">
        {label}
      </span>
      <div
        className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4"
        aria-live="polite"
      >
        <p className="text-end font-mono text-2xl font-semibold tabular-nums text-[#00D4C8]">
          {formatCurrencyShort(value, currencyCode)}
        </p>
        <p className="mt-1 text-end text-xs text-slate-500">{formulaHint}</p>
      </div>
    </div>
  );
}

function ToggleSwitch({
  id,
  label,
  description,
  checked,
  onChange,
  isRtl,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  isRtl: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        VB_GLASS_PANE_SUBTLE,
        'flex cursor-pointer items-center justify-between gap-4 rounded-xl px-4 py-3.5 transition-all duration-300 hover:border-[#00bfa5]/25 hover:shadow-[0_0_15px_rgba(0,191,165,0.1)]',
      )}
    >
      <span>
        <span className="block text-sm font-medium text-slate-200">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
        )}
      </span>
      <span className="relative inline-flex h-7 w-12 shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-checked={checked}
          aria-label={label}
          className="sr-only"
        />
        <span
          className={cn(
            'absolute inset-0 rounded-full transition-colors duration-300',
            checked
              ? 'bg-gradient-to-r from-mint-400 to-emerald-600'
              : 'bg-slate-700',
          )}
        />
        <span
          className={cn(
            'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all duration-300',
            checked
              ? isRtl
                ? 'right-[22px]'
                : 'left-[22px]'
              : isRtl
                ? 'right-0.5'
                : 'left-0.5',
          )}
        />
      </span>
    </label>
  );
}

function StarRating({
  value,
  onChange,
  max = 5,
  ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
  ariaLabel: string;
}) {
  const handleKeyDown = (e: React.KeyboardEvent, star: number) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(1, star - 1));
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(max, star + 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(1);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(max);
    }
  };

  return (
    <div
      className="flex gap-1.5"
      role="radiogroup"
      aria-label={ariaLabel}
      aria-valuemin={1}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      {Array.from({ length: max }, (_, i) => {
        const star = i + 1;
        const active = star <= value;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={star === value ? 0 : -1}
            onClick={() => onChange(star)}
            onKeyDown={(e) => handleKeyDown(e, star)}
            className={cn(
              'text-2xl transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-mint-400 rounded',
              active ? 'text-mint-400/90 drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]' : 'text-slate-500',
            )}
          >
            <span className="sr-only">
              {star} / {max}
            </span>
            <span aria-hidden>★</span>
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// Step panels
// =============================================================================

function resolveIdentifierError(
  key: UserIdentifierFieldKey,
  code: string | undefined,
  i18n: ValuationTranslations,
): string | undefined {
  if (!code) return undefined;
  const map: Record<UserIdentifierFieldKey, Record<string, TranslationKey>> = {
    userMobilePhone: {
      required: 'errUserMobileRequired',
      invalid_phone: 'errUserMobileInvalid',
    },
    userNationalId: {
      required: 'errUserNationalIdRequired',
      invalid_id: 'errUserNationalIdInvalid',
    },
    userCorporateTaxId: {
      required: 'errUserCorpIdRequired',
      invalid_corp: 'errUserCorpIdInvalid',
    },
    userEmail: {
      required: 'errUserEmailRequired',
      invalid_email: 'errUserEmailInvalid',
    },
  };
  const translationKey = map[key][code];
  return translationKey ? i18n.t(translationKey) : code;
}

function StepUserIdentifiers({
  values,
  setField,
  errors,
  onFieldBlur,
  i18n,
}: {
  values: ValuationWizardFormValues;
  setField: <K extends keyof ValuationWizardFormValues>(
    key: K,
    value: ValuationWizardFormValues[K],
  ) => void;
  errors: Partial<Record<keyof ValuationWizardFormValues, string>>;
  onFieldBlur: (key: keyof ValuationWizardFormValues) => void;
  i18n: ValuationTranslations;
}) {
  const fields: {
    key: UserIdentifierFieldKey;
    id: string;
    name: string;
    label: string;
    ariaLabel: string;
    placeholder: string;
    required?: boolean;
    inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
    autoComplete?: string;
  }[] = [
    {
      key: 'userMobilePhone',
      id: 'userMobilePhone',
      name: 'userPhone',
      label: i18n.t('userMobilePhone'),
      ariaLabel: `${i18n.t('userMobilePhone')}. ${i18n.t('userMobilePhonePlaceholder')}`,
      placeholder: i18n.t('userMobilePhonePlaceholder'),
      inputMode: 'tel',
      autoComplete: 'tel',
    },
    {
      key: 'userNationalId',
      id: 'userNationalId',
      name: 'userId',
      label: i18n.t('userNationalId'),
      ariaLabel: `${i18n.t('userNationalId')}. ${i18n.t('userNationalIdPlaceholder')}`,
      placeholder: i18n.t('userNationalIdPlaceholder'),
      inputMode: 'numeric',
      autoComplete: 'off',
    },
    {
      key: 'userCorporateTaxId',
      id: 'userCorporateTaxId',
      name: 'userCorporateTaxId',
      label: i18n.t('userCorporateTaxId'),
      ariaLabel: `${i18n.t('userCorporateTaxId')}. ${i18n.t('userCorporateTaxIdPlaceholder')}`,
      placeholder: i18n.t('userCorporateTaxIdPlaceholder'),
      inputMode: 'numeric',
      autoComplete: 'off',
      required: false,
    },
    {
      key: 'userEmail',
      id: 'userEmail',
      name: 'userEmail',
      label: i18n.t('userEmail'),
      ariaLabel: `${i18n.t('userEmail')}. ${i18n.t('userEmailPlaceholder')}`,
      placeholder: i18n.t('userEmailPlaceholder'),
      inputMode: 'email',
      autoComplete: 'email',
    },
  ];

  return (
    <section
      aria-labelledby="user-identifiers-heading"
      className={cn(VB_GLASS_PANE, 'rounded-2xl p-5 sm:p-6')}
    >
      <header className="mb-5">
        <h3
          id="user-identifiers-heading"
          className="text-base font-semibold text-mint-400"
        >
          {i18n.t('userIdentifiersTitle')}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          {i18n.t('userIdentifiersDesc')}
        </p>
      </header>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {fields.map((field) => {
          const isRequired = field.required !== false;
          const message = errors[field.key];
          const isPhoneField = field.key === 'userMobilePhone';
          return (
            <div
              key={field.key}
              className={cn('space-y-2', isPhoneField && 'sm:col-span-2')}
            >
              <FieldLabel
                id={`${field.id}-label`}
                htmlFor={field.id}
                required={isRequired}
                helpAria={i18n.t('helpAria')}
                isRtl={i18n.isRtl}
              >
                {field.label}
              </FieldLabel>
              {isPhoneField && (
                <p
                  id={`${field.id}-whatsapp-hint`}
                  className="text-xs leading-relaxed text-mint-400/90/80"
                >
                  {i18n.t('userMobilePhoneWhatsAppHint')}
                </p>
              )}
              <TextInput
                id={field.id}
                name={field.name}
                labelId={`${field.id}-label`}
                value={values[field.key] ?? ''}
                onChange={(v) => setField(field.key, v)}
                onBlur={() => onFieldBlur(field.key)}
                placeholder={field.placeholder}
                inputMode={field.inputMode}
                ariaLabel={field.ariaLabel}
                required={isRequired}
                invalid={Boolean(message)}
                describedBy={
                  message
                    ? `${field.id}-error`
                    : isPhoneField
                      ? `${field.id}-whatsapp-hint`
                      : undefined
                }
                autoComplete={field.autoComplete}
              />
              {message && (
                <p id={`${field.id}-error`} role="alert" className="text-xs text-rose-300">
                  {message}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

const StepCompanyProfile = memo(function StepCompanyProfile({
  values,
  setField,
  errors,
  onFieldBlur,
  i18n,
}: {
  values: ValuationWizardFormValues;
  setField: <K extends keyof ValuationWizardFormValues>(
    key: K,
    value: ValuationWizardFormValues[K],
  ) => void;
  errors: Partial<Record<keyof ValuationWizardFormValues, string>>;
  onFieldBlur: (key: keyof ValuationWizardFormValues) => void;
  i18n: ValuationTranslations;
}) {
  const lifecycleStages = getLifecycleStages(i18n);
  const industryOptions = getIndustrySelectOptions(i18n.locale);
  const countryOptions = getIncorporationCountryOptions(i18n.locale);

  return (
    <div className="wizard-step-panel space-y-8">
      <header>
        <h2 tabIndex={-1} className="text-2xl font-semibold tracking-tight text-slate-50 outline-none">
          {i18n.t('companyProfileTitle')}
        </h2>
        <p className="mt-1 text-sm text-slate-300">{i18n.t('companyProfileDesc')}</p>
      </header>

      <StepUserIdentifiers
        values={values}
        setField={setField}
        errors={errors}
        onFieldBlur={onFieldBlur}
        i18n={i18n}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="md:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel
              htmlFor="companyName"
              required
              helpAria={i18n.t('helpAria')}
              isRtl={i18n.isRtl}
            >
              {i18n.t('legalName')}
            </FieldLabel>
            <TextInput
              id="companyName"
              value={values.companyName}
              onChange={(v) => setField('companyName', v)}
              onBlur={() => onFieldBlur('companyName')}
              placeholder="Acme Technologies Ltd."
              ariaLabel={i18n.t('legalName')}
              required
              invalid={Boolean(errors.companyName)}
              describedBy={errors.companyName ? 'companyName-error' : undefined}
              autoComplete="organization"
            />
            {errors.companyName && (
              <p id="companyName-error" role="alert" className="text-xs text-rose-300">
                {errors.companyName}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <FieldLabel
              htmlFor="fullName"
              required
              helpAria={i18n.t('helpAria')}
              isRtl={i18n.isRtl}
            >
              {i18n.t('fullName')}
            </FieldLabel>
            <TextInput
              id="fullName"
              value={values.fullName}
              onChange={(v) => setField('fullName', v)}
              onBlur={() => onFieldBlur('fullName')}
              placeholder={i18n.t('fullNamePlaceholder')}
              ariaLabel={i18n.t('fullName')}
              required
              invalid={Boolean(errors.fullName)}
              describedBy={errors.fullName ? 'fullName-error' : undefined}
              autoComplete="name"
            />
            {errors.fullName && (
              <p id="fullName-error" role="alert" className="text-xs text-rose-300">
                {errors.fullName}
              </p>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          <LogoUploadInput
            id="customLogo"
            value={values.customLogoDataUrl}
            onChange={(v) => setField('customLogoDataUrl', v)}
            i18n={i18n}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel
            htmlFor="industry"
            required
            helpAria={i18n.t('helpAria')}
            isRtl={i18n.isRtl}
          >
            {i18n.t('industry')}
          </FieldLabel>
          <SelectInput
            id="industry"
            value={values.industry}
            onChange={(v) => setField('industry', v)}
            options={industryOptions}
            placeholder={i18n.t('selectPlaceholder')}
            ariaLabel={i18n.t('industry')}
            required
            invalid={Boolean(errors.industry)}
            describedBy={errors.industry ? 'industry-error' : undefined}
          />
          {errors.industry && (
            <p id="industry-error" role="alert" className="text-xs text-rose-300">
              {errors.industry}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <FieldLabel
            htmlFor="currency"
            required
            helpAria={i18n.t('helpAria')}
            isRtl={i18n.isRtl}
          >
            {i18n.t('reportingCurrency')}
          </FieldLabel>
          <SelectInput
            id="currency"
            value={values.currency}
            onChange={(v) => setField('currency', v as CurrencyCode)}
            options={[
              { value: 'ILS', label: i18n.t('currencyIls') },
              { value: 'USD', label: i18n.t('currencyUsd') },
              { value: 'EUR', label: i18n.t('currencyEur') },
              { value: 'GBP', label: i18n.t('currencyGbp') },
            ]}
            placeholder={i18n.t('selectPlaceholder')}
            ariaLabel={i18n.t('reportingCurrency')}
            required
          />
        </div>

        <div className="space-y-2">
          <FieldLabel
            htmlFor="incorporationCountry"
            helpAria={i18n.t('helpAria')}
            isRtl={i18n.isRtl}
          >
            {i18n.t('incorporationCountry')}
          </FieldLabel>
          <SelectInput
            id="incorporationCountry"
            value={values.incorporationCountry || 'IL'}
            onChange={(v) => setField('incorporationCountry', v)}
            options={countryOptions}
            placeholder={i18n.t('selectPlaceholder')}
            ariaLabel={i18n.t('incorporationCountry')}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel
            htmlFor="foundedYear"
            helpAria={i18n.t('helpAria')}
            isRtl={i18n.isRtl}
          >
            {i18n.t('foundedYear')}
          </FieldLabel>
          <TextInput
            id="foundedYear"
            type="number"
            min={1800}
            max={2026}
            value={values.foundedYear}
            onChange={(v) => setField('foundedYear', v)}
            onBlur={() => onFieldBlur('foundedYear')}
            placeholder="2019"
            inputMode="numeric"
            ariaLabel={i18n.t('foundedYear')}
          />
        </div>
      </div>

      <div className="space-y-3">
        <span
          id="lifecycle-stage-label"
          className="text-xs font-medium uppercase tracking-wider text-slate-300"
        >
          {i18n.t('lifecycleStage')}
          <span className="me-0.5 text-mint-400">*</span>
        </span>
        <div
          role="radiogroup"
          aria-labelledby="lifecycle-stage-label"
          aria-required="true"
          aria-invalid={errors.lifecycleStage ? true : undefined}
          aria-describedby={errors.lifecycleStage ? 'lifecycle-stage-error' : undefined}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          onKeyDown={(e) => {
            const ids = lifecycleStages.map((s) => s.id);
            const current = values.lifecycleStage || ids[0];
            handleRadioGroupKeyDown(e, ids, current, (id) => {
              setField('lifecycleStage', id as LifecycleStage);
            }, i18n.isRtl);
          }}
        >
          {lifecycleStages.map((stage) => {
            const selected = values.lifecycleStage === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={
                  values.lifecycleStage
                    ? selected
                      ? 0
                      : -1
                    : stage.id === lifecycleStages[0].id
                      ? 0
                      : -1
                }
                onClick={() => setField('lifecycleStage', stage.id)}
                className={cn(
                  VB_LIFECYCLE_CARD,
                  i18n.isRtl && 'min-h-[9rem] px-3.5 py-4 sm:px-4',
                  selected ? VB_LIFECYCLE_CARD_ACTIVE : VB_LIFECYCLE_CARD_IDLE,
                )}
              >
                <span
                  className={cn(
                    'mb-3 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg transition',
                    selected
                      ? 'bg-mint-400/20 text-mint-400/90'
                      : 'bg-slate-700/60 text-slate-400 group-hover:text-slate-300',
                  )}
                  aria-hidden
                >
                  {stage.icon}
                </span>
                <span
                  className={cn(
                    'block font-semibold leading-snug text-slate-50',
                    i18n.isRtl ? 'text-[0.8125rem] sm:text-sm' : 'text-sm',
                  )}
                >
                  {stage.title}
                </span>
                <span
                  className={cn(
                    'mt-1.5 block leading-relaxed text-slate-400',
                    i18n.isRtl ? 'text-[0.6875rem] sm:text-xs' : 'text-xs',
                  )}
                >
                  {stage.subtitle}
                </span>
                {selected && (
                  <span
                    className="absolute end-3 top-3 h-2 w-2 rounded-full bg-mint-400 shadow-[0_0_10px_#00F5A0]"
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>
        {errors.lifecycleStage && (
          <p id="lifecycle-stage-error" role="alert" className="text-xs text-rose-300">
            {errors.lifecycleStage}
          </p>
        )}
      </div>

      <div className={cn(VB_GLASS_PANE_SUBTLE, 'space-y-2 rounded-2xl p-5')}>
        <FieldLabel
          htmlFor="qualitativeDescription"
          helpAria={i18n.t('helpAria')}
          isRtl={i18n.isRtl}
          tooltip={{
            label: i18n.t('qualitativeDescription'),
            content: i18n.t('qualitativeDescriptionDesc'),
          }}
        >
          {i18n.t('qualitativeDescription')}
        </FieldLabel>
        <TextAreaInput
          id="qualitativeDescription"
          value={values.qualitativeDescription}
          onChange={(v) => setField('qualitativeDescription', v)}
          placeholder={i18n.t('qualitativeDescriptionPlaceholder')}
          ariaLabel={i18n.t('qualitativeDescription')}
          rows={5}
        />
      </div>
    </div>
  );
});

const RdHistoryAccordion = memo(function RdHistoryAccordion({
  values,
  setField,
  currency,
  currencyCode,
  inputLocale,
  i18n,
}: {
  values: ValuationWizardFormValues;
  setField: <K extends keyof ValuationWizardFormValues>(
    key: K,
    value: ValuationWizardFormValues[K],
  ) => void;
  currency: '₪' | '$' | '€';
  currencyCode: CurrencyCode;
  inputLocale: import('./api_client').ValuationLocale;
  i18n: ValuationTranslations;
}) {
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  const advanceToNextYear = useCallback(() => {
    setActiveIndex((idx) => Math.min(idx + 1, RD_HISTORY_ROWS.length - 1));
  }, []);

  return (
    <div className={cn(VB_GLASS_PANE_SUBTLE, 'overflow-hidden rounded-2xl p-4 sm:p-6')}>
      <p className="typo-eyebrow mb-1">{i18n.t('rdHistoryTitle')}</p>
      <p className="mb-4 text-xs text-slate-400">{i18n.t('rdHistoryDesc')}</p>

      <div className="flex flex-col gap-2">
        {RD_HISTORY_ROWS.map((row, index) => {
          const fieldKey = row.key as RdExpenseFieldKey;
          const raw = values[fieldKey];
          const numValue = formStringToNumber(raw);
          const hasValue = raw.trim() !== '' && numValue !== null;
          const isActive = activeIndex === index;

          return (
            <motion.div
              key={row.key}
              layout
              transition={reducedMotionTransition(reducedMotion)}
              className="min-w-0"
            >
              {isActive ? (
                <div
                  className={cn(
                    VB_LIFECYCLE_CARD,
                    VB_LIFECYCLE_CARD_ACTIVE,
                    'p-3 sm:p-4',
                  )}
                >
                  <p className="typo-eyebrow mb-3 text-[10px]">{i18n.t(row.labelKey)}</p>
                  <SmartNumberInput
                    id={row.key}
                    fieldName={row.key}
                    label={String(row.year)}
                    value={numValue}
                    onChange={(v) => setField(fieldKey, numberToFormString(v))}
                    onConfirm={advanceToNextYear}
                    currency={currency}
                    locale={inputLocale}
                    defaultScale="thousands"
                    autoFocus
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    VB_LIFECYCLE_CARD,
                    VB_LIFECYCLE_CARD_IDLE,
                    'flex w-full min-h-[44px] items-center gap-3 p-3 text-start transition-colors sm:p-4',
                  )}
                  aria-expanded={false}
                >
                  <span className="typo-eyebrow shrink-0 text-[10px]">{row.year}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-sm text-slate-200">
                    {hasValue
                      ? formatCurrencyShort(numValue!, currencyCode)
                      : i18n.t('rdHistoryEmpty')}
                  </span>
                  <span
                    className={cn(
                      'h-2 w-2 shrink-0 rounded-full border',
                      hasValue
                        ? 'border-[#00bfa5] bg-[#00bfa5]'
                        : 'border-slate-500 bg-transparent',
                    )}
                    aria-hidden
                  />
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});

function reducedMotionTransition(reduced: boolean) {
  return reduced ? { duration: 0 } : { duration: DUR.fast, ease: EASE };
}

const StepFinancialInputs = memo(function StepFinancialInputs({
  values,
  setField,
  errors,
  isSaaS,
  i18n,
}: {
  values: ValuationWizardFormValues;
  setField: <K extends keyof ValuationWizardFormValues>(
    key: K,
    value: ValuationWizardFormValues[K],
  ) => void;
  errors: Partial<Record<keyof ValuationWizardFormValues, string>>;
  isSaaS: boolean;
  i18n: ValuationTranslations;
}) {
  const revenueLabel = isSaaS ? i18n.t('annualArr') : i18n.t('annualRevenue');
  const currency = currencySymbol(values.currency);
  const inputLocale = i18n.locale;

  const computedNetDebt =
    (formStringToNumber(values.totalDebt) ?? 0) -
    (formStringToNumber(values.cashAndEquivalents) ?? 0);

  useEffect(() => {
    const next = numberToFormString(computedNetDebt);
    if (values.netDebt !== next) {
      setField('netDebt', next);
    }
  }, [computedNetDebt, setField, values.netDebt]);

  return (
    <div className="wizard-step-panel wizard-container space-y-8">
      <header>
        <h2 tabIndex={-1} className="text-2xl font-semibold tracking-tight text-slate-50 outline-none">
          {i18n.t('financialInputsTitle')}
        </h2>
        <p className="mt-1 text-sm text-slate-300">
          {i18n.t('financialInputsDesc')}
          {isSaaS && (
            <span className="ms-1 text-mint-400/90">
              {i18n.t('saasModeActive')}
            </span>
          )}
        </p>
      </header>

      <div className="grid w-full max-w-full gap-6 md:grid-cols-2">
        <div
          className={cn(
            'min-w-0 transition-all duration-500',
            isSaaS ? 'md:col-span-1' : 'md:col-span-2',
          )}
        >
          <SmartNumberInput
            id="annualRevenue"
            fieldName="annualRevenue"
            label={revenueLabel}
            value={formStringToNumber(values.annualRevenue)}
            onChange={(v) => setField('annualRevenue', numberToFormString(v))}
            required
            currency={currency}
            locale={inputLocale}
            defaultScale="millions"
            invalid={Boolean(errors.annualRevenue)}
            errorId={errors.annualRevenue ? 'annualRevenue-error' : undefined}
          />
          {errors.annualRevenue && (
            <p id="annualRevenue-error" role="alert" className="mt-1 text-xs text-rose-300">
              {errors.annualRevenue}
            </p>
          )}
        </div>

        {isSaaS ? (
          <div className="space-y-2">
            <FieldLabel
              htmlFor="annualChurnRate"
              required={isSaaS}
              helpAria={i18n.t('helpAria')}
              isRtl={i18n.isRtl}
              tooltip={{
                label: i18n.t('churnTooltipTitle'),
                content: i18n.t('churnTooltip'),
              }}
            >
              {i18n.t('annualChurnRate')}
            </FieldLabel>
            <TextInput
              id="annualChurnRate"
              value={values.annualChurnRate}
              onChange={(v) => setField('annualChurnRate', v)}
              placeholder="e.g. 8.5"
              inputMode="decimal"
              ariaLabel={i18n.t('annualChurnRate')}
              required={isSaaS}
              invalid={Boolean(errors.annualChurnRate)}
              describedBy={errors.annualChurnRate ? 'annualChurnRate-error' : undefined}
            />
            {errors.annualChurnRate && (
              <p id="annualChurnRate-error" role="alert" className="text-xs text-rose-300">
                {errors.annualChurnRate}
              </p>
            )}
          </div>
        ) : null}

        <SmartNumberInput
          id="ebitda"
          fieldName="ebitda"
          label={i18n.t('ebitda')}
          tooltip={i18n.t('ebitdaTooltip')}
          value={formStringToNumber(values.ebitda)}
          onChange={(v) => setField('ebitda', numberToFormString(v))}
          currency={currency}
          locale={inputLocale}
          defaultScale="millions"
        />

        <SmartNumberInput
          id="freeCashFlow"
          fieldName="freeCashFlow"
          label={i18n.t('freeCashFlow')}
          tooltip={i18n.t('fcfTooltip')}
          value={formStringToNumber(values.freeCashFlow)}
          onChange={(v) => setField('freeCashFlow', numberToFormString(v))}
          currency={currency}
          locale={inputLocale}
          defaultScale="millions"
        />

        <SmartNumberInput
          id="interestExpense"
          fieldName="interestExpense"
          label={i18n.t('interestExpense')}
          tooltip={i18n.t('interestExpenseTooltip')}
          value={formStringToNumber(values.interestExpense)}
          onChange={(v) => setField('interestExpense', numberToFormString(v))}
          currency={currency}
          locale={inputLocale}
          defaultScale="thousands"
        />

        <SmartNumberInput
          id="totalDebt"
          fieldName="totalDebt"
          label={i18n.t('totalDebt')}
          value={formStringToNumber(values.totalDebt)}
          onChange={(v) => setField('totalDebt', numberToFormString(v))}
          currency={currency}
          locale={inputLocale}
          defaultScale="millions"
        />

        <div className="md:col-span-2">
          <SmartNumberInput
            id="cashAndEquivalents"
            fieldName="cashAndEquivalents"
            label={i18n.t('cashEquivalents')}
            tooltip={i18n.t('cashEquivalentsTooltip')}
            value={formStringToNumber(values.cashAndEquivalents)}
            onChange={(v) => setField('cashAndEquivalents', numberToFormString(v))}
            currency={currency}
            locale={inputLocale}
            defaultScale="millions"
          />
        </div>

        <div className="md:col-span-2">
          <CalculatedNetDebtField
            label={i18n.t('netDebt')}
            formulaHint={i18n.t('netDebtFormula')}
            value={computedNetDebt}
            currencyCode={values.currency}
          />
        </div>
      </div>

      <RdHistoryAccordion
        values={values}
        setField={setField}
        currency={currency}
        currencyCode={values.currency}
        inputLocale={inputLocale}
        i18n={i18n}
      />
    </div>
  );
});

const StepRiskModifiers = memo(function StepRiskModifiers({
  values,
  setField,
  i18n,
}: {
  values: ValuationWizardFormValues;
  setField: <K extends keyof ValuationWizardFormValues>(
    key: K,
    value: ValuationWizardFormValues[K],
  ) => void;
  i18n: ValuationTranslations;
}) {
  const competitionLabels = [
    i18n.t('compLow'),
    i18n.t('compModerate'),
    i18n.t('compBalanced'),
    i18n.t('compHigh'),
    i18n.t('compIntense'),
  ];

  return (
    <div className="wizard-step-panel space-y-8">
      <header>
        <h2 tabIndex={-1} className="text-2xl font-semibold tracking-tight text-slate-50 outline-none">
          {i18n.t('riskModifiersTitle')}
        </h2>
        <p className="mt-1 text-sm text-slate-300">{i18n.t('riskModifiersDesc')}</p>
      </header>

      <div className="space-y-8 rounded-2xl border border-slate-700/50 bg-slate-800/25 p-6">
        <RangeSlider
          id="recurringRevenuePct"
          label={i18n.t('recurringRevenuePct')}
          hint={i18n.t('recurringRevenuePctHint')}
          value={values.recurringRevenuePct}
          onChange={(v) => setField('recurringRevenuePct', v)}
          min={0}
          max={100}
          step={1}
          formatValue={(v) => `${v}%`}
        />

        <ToggleSwitch
          id="customerConcentrationOver20"
          label={i18n.t('customerConcentrationOver20')}
          description={i18n.t('customerConcentrationOver20Desc')}
          checked={values.customerConcentrationOver20}
          onChange={(v) => setField('customerConcentrationOver20', v)}
          isRtl={i18n.isRtl}
        />

        <RangeSlider
          id="customerConcentrationPct"
          label={i18n.t('customerConcentrationPct')}
          value={values.customerConcentrationPct}
          onChange={(v) => setField('customerConcentrationPct', v)}
          min={0}
          max={100}
          step={1}
          formatValue={(v) => `${v}%`}
        />

        <div className="space-y-3 border-t border-slate-700/50 pt-6">
          <span className="text-sm font-medium text-slate-300">
            {i18n.t('levelOfCompetition')}
          </span>
          <StarRating
            value={values.competitionLevel}
            onChange={(v) => setField('competitionLevel', v)}
            ariaLabel={i18n.t('competitionAria')}
          />
          <p className="text-xs leading-relaxed text-mint-400/90" aria-live="polite">
            {competitionLabels[values.competitionLevel - 1] ?? '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <ToggleSwitch
          id="ipProtection"
          label={i18n.t('ipProtection')}
          description={i18n.t('ipProtectionDesc')}
          checked={values.ipProtection}
          onChange={(v) => setField('ipProtection', v)}
          isRtl={i18n.isRtl}
        />
        <ToggleSwitch
          id="founderDependency"
          label={i18n.t('founderDependency')}
          description={i18n.t('founderDependencyDesc')}
          checked={values.founderDependency}
          onChange={(v) => setField('founderDependency', v)}
          isRtl={i18n.isRtl}
        />
      </div>
    </div>
  );
});

const StepValuationPurpose = memo(function StepValuationPurpose({
  values,
  setField,
  errors,
  i18n,
  termsAccepted,
  onTermsAcceptedChange,
  termsError,
}: {
  values: ValuationWizardFormValues;
  setField: <K extends keyof ValuationWizardFormValues>(
    key: K,
    value: ValuationWizardFormValues[K],
  ) => void;
  errors: Partial<Record<keyof ValuationWizardFormValues, string>>;
  i18n: ValuationTranslations;
  termsAccepted: boolean;
  onTermsAcceptedChange: (accepted: boolean) => void;
  termsError: string | null;
}) {
  const purposeCards = getPurposeCards(i18n);
  const purposeIds = purposeCards.map((c) => c.id);

  return (
    <div className="wizard-step-panel space-y-8">
      <header>
        <h2 tabIndex={-1} className="text-2xl font-semibold tracking-tight text-slate-50 outline-none">
          {i18n.t('valuationPurposeTitle')}
        </h2>
        <p className="mt-1 text-sm text-slate-300">{i18n.t('valuationPurposeDesc')}</p>
      </header>

      <div
        role="radiogroup"
        aria-labelledby="valuation-purpose-label"
        aria-required="true"
        aria-invalid={errors.valuationPurpose ? true : undefined}
        aria-describedby={
          errors.valuationPurpose ? 'valuation-purpose-error' : undefined
        }
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
        onKeyDown={(e) => {
          const current = values.valuationPurpose || purposeIds[0];
          handleRadioGroupKeyDown(e, purposeIds, current, (id) => {
            setField('valuationPurpose', id as ValuationPurposeOption);
          }, i18n.isRtl);
        }}
      >
        <span id="valuation-purpose-label" className="sr-only">
          {i18n.t('purposeGroupAria')}
        </span>
        {purposeCards.map((card) => {
          const selected = values.valuationPurpose === card.id;
          return (
            <button
              key={card.id}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={
                values.valuationPurpose
                  ? selected
                    ? 0
                    : -1
                  : card.id === purposeIds[0]
                    ? 0
                    : -1
              }
              onClick={() => setField('valuationPurpose', card.id)}
              className={cn(
                'relative min-h-[44px] touch-manipulation overflow-hidden rounded-2xl border p-5 text-start transition-all duration-300 focus-visible:ring-2 focus-visible:ring-mint-400',
                selected
                  ? 'border-[#00F5A0]/40 bg-[#0B1311]/55 shadow-[0_0_40px_-15px_rgba(16,185,129,0.15)] ring-1 ring-[#00F5A0]/25'
                  : 'border-emerald-500/10 bg-[#0B1311]/40 hover:border-emerald-500/25',
              )}
            >
              <span className="text-base font-semibold text-slate-50">{card.title}</span>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{card.description}</p>
              {selected && (
                <span
                  className="absolute end-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-mint-400/20 text-mint-400/90"
                  aria-hidden
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
      {errors.valuationPurpose && (
        <p id="valuation-purpose-error" role="alert" className="text-xs text-rose-300">
          {errors.valuationPurpose}
        </p>
      )}

      <TermsDisclaimerCheckbox
        termsAccepted={termsAccepted}
        onTermsAcceptedChange={onTermsAcceptedChange}
        termsError={termsError}
        i18n={i18n}
      />
    </div>
  );
});

// =============================================================================
// Wizard shell
// =============================================================================

const FIELD_WIZARD_STEP: Partial<Record<keyof ValuationWizardFormValues, number>> = {
  userMobilePhone: 1,
  userNationalId: 1,
  userCorporateTaxId: 1,
  userEmail: 1,
  companyName: 1,
  fullName: 1,
  industry: 1,
  lifecycleStage: 1,
  incorporationCountry: 1,
  foundedYear: 1,
  annualRevenue: 2,
  annualChurnRate: 2,
  valuationPurpose: 4,
};

function buildVisibleErrors(
  errors: Partial<Record<keyof ValuationWizardFormValues, string>>,
  options: {
    touched: Partial<Record<keyof ValuationWizardFormValues, boolean>>;
    exposedSteps: Record<number, boolean>;
    submitAttempted: boolean;
    currentStep: number;
  },
): Partial<Record<keyof ValuationWizardFormValues, string>> {
  const visible: Partial<Record<keyof ValuationWizardFormValues, string>> = {};
  for (const key of Object.keys(errors) as (keyof ValuationWizardFormValues)[]) {
    const message = errors[key];
    if (!message) continue;
    const fieldStep = FIELD_WIZARD_STEP[key] ?? options.currentStep;
    const shouldShow =
      options.touched[key] ||
      options.submitAttempted ||
      options.exposedSteps[fieldStep] ||
      options.exposedSteps[options.currentStep];
    if (shouldShow) {
      visible[key] = message;
    }
  }
  return visible;
}

function mergeUserIdentifierErrors(
  values: ValuationWizardFormValues,
  i18n: ValuationTranslations,
): Partial<Record<keyof ValuationWizardFormValues, string>> {
  const merged: Partial<Record<keyof ValuationWizardFormValues, string>> = {};
  const idErrors = validateUserIdentifiers(values);
  (Object.keys(idErrors) as UserIdentifierFieldKey[]).forEach((key) => {
    const message = resolveIdentifierError(key, idErrors[key], i18n);
    if (message) merged[key] = message;
  });
  return merged;
}

function validateStep(
  step: number,
  values: ValuationWizardFormValues,
  i18n: ValuationTranslations,
): Partial<Record<keyof ValuationWizardFormValues, string>> {
  const errors: Partial<Record<keyof ValuationWizardFormValues, string>> = {};

  if (step === 1) {
    Object.assign(errors, mergeUserIdentifierErrors(values, i18n));
    if (!values.companyName.trim()) errors.companyName = i18n.t('errCompanyName');
    if (!values.fullName.trim()) errors.fullName = i18n.t('errFullName');
    if (!values.industry) errors.industry = i18n.t('errIndustry');
    if (!values.lifecycleStage) errors.lifecycleStage = i18n.t('errLifecycle');
  }

  if (step === 2) {
    if (!values.annualRevenue.trim()) {
      errors.annualRevenue =
        values.industry === SAAS_INDUSTRY ? i18n.t('errArr') : i18n.t('errRevenue');
    }
    if (values.industry === SAAS_INDUSTRY && !values.annualChurnRate.trim()) {
      errors.annualChurnRate = i18n.t('errChurn');
    }
  }

  if (step === 4) {
    Object.assign(errors, mergeUserIdentifierErrors(values, i18n));
    if (!values.valuationPurpose) errors.valuationPurpose = i18n.t('errPurpose');
  }

  return errors;
}

export interface ValuationWizardProps {
  onComplete?: (values: ValuationWizardFormValues) => void;
  /** Async hook: POST calculate + paywall; parent swaps to dashboard on resolve. */
  onRunValuation?: (
    values: ValuationWizardFormValues,
    options?: { locale?: import('./api_client').ValuationLocale },
  ) => Promise<void>;
  isSubmitting?: boolean;
  submitError?: string | null;
  initialValues?: Partial<ValuationWizardFormValues>;
}

function ValuationWizardContent({
  onComplete,
  onRunValuation,
  isSubmitting = false,
  submitError = null,
  initialValues,
}: ValuationWizardProps) {
  const { i18n, locale } = useValuationI18n();
  const reducedMotion = useReducedMotion();
  const rtl = locale === 'he';
  const { rootDataAttributes } = useAccessibilityPreferences();
  const steps = useMemo(() => getWizardSteps(i18n), [i18n]);
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [values, setValues] = useState<ValuationWizardFormValues>({
    ...defaultValues,
    ...initialValues,
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof ValuationWizardFormValues, string>>
  >({});
  const [touched, setTouched] = useState<
    Partial<Record<keyof ValuationWizardFormValues, boolean>>
  >({});
  const [exposedSteps, setExposedSteps] = useState<Record<number, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const stepPanelRef = useRef<HTMLDivElement>(null);
  const lockedLeadRef = useRef<WizardStep1LeadPayload | null>(null);
  const wizardFormId = useId();

  const isSaaS = values.industry === SAAS_INDUSTRY;
  const identifiersValid = useMemo(() => areUserIdentifiersValid(values), [values]);

  const visibleErrors = useMemo(
    () =>
      buildVisibleErrors(errors, {
        touched,
        exposedSteps,
        submitAttempted,
        currentStep: step,
      }),
    [errors, touched, exposedSteps, submitAttempted, step],
  );

  const touchField = useCallback((key: keyof ValuationWizardFormValues) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }, []);

  useEffect(() => {
    const panel = stepPanelRef.current;
    if (!panel) return;
    const focusTarget =
      panel.querySelector<HTMLElement>('h2') ??
      panel.querySelector<HTMLElement>(
        'input:not([type="hidden"]), select, button, textarea, [tabindex="0"]',
      );
    focusTarget?.focus();
  }, [step]);

  useEffect(() => {
    resumeWizardProgressQueue();
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribeWizardSaveStatus((saved) => {
      if (!saved) return;
      setShowSavedIndicator(true);
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setShowSavedIndicator(false), 2500);
    });
    return () => {
      unsubscribe();
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  useEffect(() => {
    if (step !== 1) return;
    void import('./lib/crm/leads_client');
    void import('./lib/constants/industries');
  }, [step]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasPendingWizardSaves()) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const setField = useCallback(
    <K extends keyof ValuationWizardFormValues>(
      key: K,
      value: ValuationWizardFormValues[K],
    ) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [],
  );

  const progressPct = useMemo(
    () => ((step - 1) / (steps.length - 1)) * 100,
    [step, steps.length],
  );

  const buildStep1LeadPayload = useCallback(
    (): WizardStep1LeadPayload => lockLeadPayload(values, locale),
    [locale, values],
  );

  const goNext = useCallback(() => {
    markWizardPerf('continue-click');

    const stepErrors = validateStep(step, values, i18n);
    if (Object.keys(stepErrors).length > 0) {
      setExposedSteps((prev) => ({ ...prev, [step]: true }));
      setErrors(stepErrors);
      return;
    }

    setDirection('forward');
    setStep((s) => Math.min(s + 1, steps.length));

    requestAnimationFrame(() => {
      markWizardPerf('next-step-painted');
      logWizardContinuePerf();
    });

    if (step === 1) {
      scheduleWizardProgressSave(buildStep1LeadPayload());
    }
  }, [buildStep1LeadPayload, i18n, step, steps.length, values]);

  const goBack = () => {
    setDirection('back');
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleTermsAcceptedChange = useCallback((accepted: boolean) => {
    setTermsAccepted(accepted);
    if (accepted) setTermsError(null);
  }, []);

  const handleSubmit = async () => {
    setSubmitAttempted(true);
    setExposedSteps((prev) => ({ ...prev, 1: true, 4: true }));

    const stepErrors = validateStep(4, values, i18n);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    if (!identifiersValid) {
      setErrors(mergeUserIdentifierErrors(values, i18n));
      return;
    }
    if (!termsAccepted) {
      setTermsError(i18n.t('errTermsRequired'));
      return;
    }
    setTermsError(null);
    if (isSubmitting) return;

    const lockedLeadPayload = lockLeadPayload(values, locale);
    lockedLeadRef.current = lockedLeadPayload;
    dispatchSecuredLeadRelay(lockedLeadPayload, 'wizard_completed', {
      valuationPurpose: values.valuationPurpose || undefined,
    });

    if (onRunValuation) {
      try {
        await onRunValuation(values, { locale });
        setSubmitted(true);
        onComplete?.(values);
      } catch {
        setSubmitted(false);
      }
      return;
    }

    setSubmitted(true);
    onComplete?.(values);
  };

  const stepTransition = reducedMotion
    ? { duration: 0 }
    : { duration: DUR.fast, ease: EASE };

  const stepAnnouncement = `${i18n.t('stepLabel')} ${step} / ${steps.length} — ${steps[step - 1].label}`;

  const stepPanelClassName =
    'overflow-x-hidden overflow-y-visible px-4 py-8 sm:px-8 sm:py-10 touch-manipulation';

  const stepPanelContent = (
    <>
      {step === 1 && (
        <StepCompanyProfile
          values={values}
          setField={setField}
          errors={visibleErrors}
          onFieldBlur={touchField}
          i18n={i18n}
        />
      )}
      {step === 2 && (
        <StepFinancialInputs
          values={values}
          setField={setField}
          errors={visibleErrors}
          isSaaS={isSaaS}
          i18n={i18n}
        />
      )}
      {step === 3 && (
        <StepRiskModifiers values={values} setField={setField} i18n={i18n} />
      )}
      {step === 4 && (
        <StepValuationPurpose
          values={values}
          setField={setField}
          errors={visibleErrors}
          i18n={i18n}
          termsAccepted={termsAccepted}
          onTermsAcceptedChange={handleTermsAcceptedChange}
          termsError={termsError}
        />
      )}
    </>
  );

  /* Static panel — no AnimatePresence overlay; prevents iOS Safari tap swallowing */
  const useStaticStepPanel = true;

  return (
    <div
      dir={i18n.dir}
      lang={locale === 'he' ? 'he' : 'en'}
      className={VB_CINEMATIC_ROOT}
      {...rootDataAttributes}
    >
      <AmbientBackground />

      <AccessibilityToolbar />

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {stepAnnouncement}
      </p>

      <WizardSkipLink href={`#${wizardFormId}`} label={i18n.t('skipToWizard')} />

      <SiteHeader
        premium
        className="relative z-10 mx-auto max-w-4xl border-b border-white/[0.06] bg-transparent px-4 sm:px-6"
      />

      <div
        className={cn(
          'wizard-container relative z-[1] mx-auto max-w-4xl pb-safe py-8 sm:px-6 sm:py-10 lg:py-12',
        )}
      >
        {/* Header */}
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-3">
            <p className="typo-eyebrow mb-2">{i18n.t('brand')}</p>
            <h1 className="typo-h2 tracking-tight sm:text-4xl">{i18n.t('wizardTitle')}</h1>
            <p className="typo-body mt-2 max-w-md text-sm">{i18n.t('wizardSubtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            {showSavedIndicator && (
              <span
                className="text-[10px] font-medium text-emerald-400/90 transition-opacity"
                role="status"
                aria-live="polite"
              >
                {i18n.t('wizardSaved')}
              </span>
            )}
            <LanguageToggle />
            <div className={cn(VB_GLASS_PANE_SUBTLE, 'rounded-xl px-4 py-2 text-end')}>
              <span className="text-[10px] uppercase tracking-wider text-slate-400">
                {i18n.t('stepLabel')}
              </span>
              <p
                className="font-mono text-lg font-semibold text-mint-400/90"
                aria-live="polite"
                aria-atomic="true"
              >
                <span dir="ltr" className="inline-flex items-baseline gap-1">
                  <span>{step}</span>
                  <span className="text-slate-500">/</span>
                  <span>{steps.length}</span>
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <nav aria-label={i18n.t('wizardProgressAria')} className="mb-10">
          <div
            className={VB_PROGRESS_TRACK}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPct)}
            aria-valuetext={`${Math.round(progressPct)}%`}
            aria-label={i18n.t('wizardProgressAria')}
          >
            <motion.div
              className={VB_PROGRESS_FILL}
              initial={false}
              animate={{ width: `${progressPct}%` }}
              transition={reducedMotion ? { duration: 0 } : PROGRESS_SPRING}
            />
          </div>
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {i18n.t('wizardProgressAria')}: {Math.round(progressPct)}%
          </p>
          <ol className="flex flex-wrap justify-between gap-2">
            {steps.map((s) => {
              const active = s.id === step;
              const done = s.id < step;
              return (
                <li
                  key={s.id}
                  aria-current={active ? 'step' : undefined}
                  className={cn(
                    'flex items-center gap-2 text-xs font-medium transition-colors',
                    active && 'text-mint-400/90',
                    done && 'text-emerald-300',
                    !active && !done && 'text-slate-500',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full border border-emerald-500/15 bg-[#0B1311]/50 text-[10px] font-semibold tabular-nums',
                      active && 'border-[#00F5A0]/40 text-[#00F5A0] shadow-[0_0_12px_rgba(0,245,160,0.2)]',
                      done && 'border-emerald-500/35 text-emerald-300',
                      !active && !done && 'text-slate-500',
                    )}
                  >
                    {done ? '✓' : s.id}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Card */}
        <AccessibilityRegion label={i18n.t('wizardMainAria')} className="block">
        <form
          id={wizardFormId}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (step === steps.length) void handleSubmit();
            else void goNext();
          }}
          className={cn(
            VB_GLASS_PANE,
            'relative z-[2] overflow-x-visible overflow-y-visible rounded-3xl [&_.vb-field-help]:relative [&_.vb-field-help]:z-[2]',
          )}
        >
          <div className="border-b border-emerald-500/10 bg-[#0B1311]/50 px-6 py-4 sm:px-8">
            <p className="text-sm font-medium text-slate-200">{steps[step - 1].label}</p>
          </div>

          {useStaticStepPanel ? (
            <div
              ref={stepPanelRef}
              role="region"
              aria-label={i18n.t('stepPanelAria')}
              className={stepPanelClassName}
            >
              {stepPanelContent}
            </div>
          ) : (
            <AnimatePresence initial={false}>
              <motion.div
                ref={stepPanelRef}
                key={step}
                role="region"
                aria-label={i18n.t('stepPanelAria')}
                className={stepPanelClassName}
                initial={{
                  opacity: 0,
                  x: wizardStepOffset(rtl, direction, 'enter'),
                }}
                animate={{ opacity: 1, x: 0 }}
                exit={{
                  opacity: 0,
                  x: wizardStepOffset(rtl, direction, 'exit'),
                }}
                transition={stepTransition}
              >
                {stepPanelContent}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Footer controls */}
          <div
            className={cn(
              'wizard-cta-row wizard-footer relative z-[3] flex flex-col-reverse gap-3 pb-safe sm:items-center sm:justify-between',
              i18n.isRtl ? 'sm:flex-row-reverse' : 'sm:flex-row',
            )}
          >
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1}
              aria-disabled={step === 1}
              tabIndex={step === 1 ? -1 : 0}
              className={cn(
                VB_SECONDARY_BTN,
                'touch-manipulation disabled:cursor-not-allowed disabled:opacity-40',
              )}
            >
              {i18n.t('back')}
            </button>

            <div className="flex gap-3">
              {step < steps.length ? (
                <button
                  type="submit"
                  className={cn(
                    VB_PRIMARY_BTN,
                    'flex-1 touch-manipulation scale-100 transition-transform active:scale-[0.98] sm:flex-none',
                  )}
                >
                  {i18n.t('continue')}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || !termsAccepted || !identifiersValid}
                  aria-disabled={isSubmitting || !termsAccepted || !identifiersValid}
                  aria-describedby={
                    !termsAccepted
                      ? 'terms-submit-hint'
                      : !identifiersValid
                        ? 'identifiers-submit-hint'
                        : undefined
                  }
                  className={cn(
                    VB_PRIMARY_BTN,
                    'flex-1 touch-manipulation disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none',
                  )}
                >
                  {isSubmitting ? i18n.t('verifyingPayment') : i18n.t('runValuation')}
                </button>
              )}
            </div>
          </div>
          {!termsAccepted && step === steps.length && (
            <p id="terms-submit-hint" className="sr-only">
              {i18n.t('errTermsRequired')}
            </p>
          )}
          {!identifiersValid && step === steps.length && submitAttempted && (
            <p id="identifiers-submit-hint" role="alert" className="mt-3 text-xs text-amber-300">
              {i18n.t('errUserIdentifiersGate')}
            </p>
          )}
        </form>
        </AccessibilityRegion>

        {submitError && (
          <div
            className="wizard-step-panel mt-6 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-sm text-rose-200"
            role="alert"
          >
            {submitError}
          </div>
        )}

        {submitted && !onRunValuation && process.env.NODE_ENV === 'development' && (
          <div
            className="wizard-step-panel mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200"
            role="status"
          >
            קליטת נתונים הושלמה — מוכן לשליחה למנוע ההערכה.
          </div>
        )}

        <SiteFooter variant="compact" />
      </div>

    </div>
  );
}

export default function ValuationWizard(props: ValuationWizardProps) {
  return (
    <AccessibilityPreferencesProvider>
      <ValuationWizardContent {...props} />
    </AccessibilityPreferencesProvider>
  );
}
