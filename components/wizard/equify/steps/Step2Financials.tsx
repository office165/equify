'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatNetDebtLine } from '../../../../lib/format/currency';
import { patchFinancialHistoryYear, computeProjectedEbitda2027K } from '../../../../lib/wizard/financial_history';
import { getStep2RequiredFieldErrors, hasMeaningfulFinancialInputs, hasNegativeEbitda2026 } from '../../../../lib/wizard/financial_input_state';
import { computeNetDebtK } from '../../../../lib/wizard/map_equify_wizard';
import { injectCurrencyIntoCopy } from '../../../../lib/wizard/reporting_currency';
import { useEquifyStrings } from '../../../../lib/i18n/use_equify_strings';
import { SmartFieldLabel } from '../../ui/SmartFieldLabel';
import { SmartInput } from '../../ui/SmartInput';
import { SmartSlider } from '../../ui/SmartSlider';
import { LiveValuationCard } from '../LiveValuationCard';
import { useReportingCurrency, useWizardValuation } from '../WizardValuationContext';

export interface Step2FinancialsProps {
  onBack: () => void;
  onNext: () => void;
}

function safeK(value: number | undefined | null): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function Step2Financials({ onBack, onNext }: Step2FinancialsProps) {
  const { shell, steps: t, isHe, locale } = useEquifyStrings();
  const { state, updateFinancials, updateProfile, applySectorMarketDefaults } = useWizardValuation();
  const { reportingCurrency, setReportingCurrency } = useReportingCurrency();
  const { financials, profile } = state;
  const [auditOpen, setAuditOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    y2026Revenue?: boolean;
  }>({});

  useEffect(() => {
    void applySectorMarketDefaults(profile.sector);
  }, [applySectorMarketDefaults, profile.sector]);

  const y2024 = financials.y2024 ?? { revenueK: 0, ebitdaK: 0 };
  const y2025 = financials.y2025 ?? { revenueK: 0, ebitdaK: 0 };
  const y2026 = financials.y2026 ?? { revenueK: 0, ebitdaK: 0 };
  const projected2027K = useMemo(
    () => computeProjectedEbitda2027K(safeK(y2026.ebitdaK), safeK(financials.growth)),
    [financials.growth, y2026.ebitdaK],
  );

  const netDebtK = useMemo(() => computeNetDebtK(financials), [financials]);
  const netBridge = useMemo(() => {
    const line = formatNetDebtLine(netDebtK, locale, reportingCurrency);
    return {
      isNetCash: line.tone === 'positive',
      label: locale === 'he' ? line.labelHe : line.labelEn,
      display: line.displayValue,
    };
  }, [locale, netDebtK, reportingCurrency]);
  const hasLiveInputs = useMemo(
    () => hasMeaningfulFinancialInputs(financials),
    [financials],
  );
  const canProceed = hasLiveInputs;

  const negativeEbitdaNote = useMemo(
    () => hasNegativeEbitda2026(financials),
    [financials],
  );

  const validateStep2 = useCallback(() => {
    const next = getStep2RequiredFieldErrors(financials);
    setFieldErrors({
      y2026Revenue: next.y2026Revenue,
    });
    return !next.y2026Revenue;
  }, [financials]);

  const handleNext = useCallback(() => {
    if (!validateStep2()) return;
    onNext();
  }, [onNext, validateStep2]);

  const step2Copy = useMemo(
    () => ({
      histYearTip: injectCurrencyIntoCopy(t.step2.histYearTip, reportingCurrency),
      backlogSignedTip: injectCurrencyIntoCopy(t.step2.backlogSignedTip, reportingCurrency),
      ownerSalaryTip: injectCurrencyIntoCopy(t.step2.ownerSalaryTip, reportingCurrency),
      projectedForwardTip: injectCurrencyIntoCopy(t.step2.projectedForwardTip, reportingCurrency),
      grossDebtTip: injectCurrencyIntoCopy(t.step2.grossDebtTip, reportingCurrency),
      cashTip: injectCurrencyIntoCopy(t.step2.cashTip, reportingCurrency),
    }),
    [reportingCurrency, t.step2],
  );

  const backLabel = isHe ? `→ ${t.common.back}` : `← ${t.common.back}`;

  return (
    <>
      <div className="pane-eyebrow rv">{shell.step2Eyebrow}</div>
      <h2 className="pane-title rv">
        {shell.step2TitleBefore}{' '}
        <span className="hl">{shell.step2TitleHl}</span>
      </h2>
      <p className="pane-sub rv">{t.step2.sub}</p>

      <div className="fin-layout fin-layout--live-first">
        <div className="fin-inputs stagger w-full min-w-0 max-w-full">
          <div className="fin-field-grid grid grid-cols-1 md:grid-cols-2">
            <SmartInput
              label={t.step2.hist2026Revenue}
              tooltip={step2Copy.histYearTip}
              value={safeK(y2026.revenueK)}
              variant="currency"
              currencyCode={reportingCurrency}
              density="compact"
              required
              invalid={Boolean(fieldErrors.y2026Revenue)}
              errorMessage={fieldErrors.y2026Revenue ? t.step2.err2026Revenue : undefined}
              placeholder={t.step2.placeholderRevenueExample}
              ariaLabel={t.step2.hist2026Revenue}
              onChange={(v) => {
                if (fieldErrors.y2026Revenue && v > 0) {
                  setFieldErrors((prev) => ({ ...prev, y2026Revenue: false }));
                }
                updateFinancials(
                  patchFinancialHistoryYear(financials, 'y2026', { revenueK: v }),
                );
              }}
            />
            <SmartInput
              label={t.step2.hist2026Ebitda}
              tooltip={step2Copy.histYearTip}
              value={safeK(y2026.ebitdaK)}
              variant="currency"
              currencyCode={reportingCurrency}
              density="compact"
              required
              placeholder={t.step2.placeholderEbitdaExample}
              ariaLabel={t.step2.hist2026Ebitda}
              onChange={(v) => {
                updateFinancials(
                  patchFinancialHistoryYear(financials, 'y2026', { ebitdaK: v }),
                );
              }}
            />
          </div>
          {negativeEbitdaNote ? (
            <p className="fin-negative-ebitda-note rv" role="note">
              {t.step2.negativeEbitdaNote}
            </p>
          ) : null}

          <SmartInput
            label={t.step2.backlogSigned}
            tooltip={step2Copy.backlogSignedTip}
            value={safeK(financials.backlogSignedK)}
            variant="currency"
            currencyCode={reportingCurrency}
            placeholder={t.step2.placeholderZero}
            ariaLabel={t.step2.backlogSigned}
            onChange={(v) => updateFinancials({ backlogSignedK: v })}
          />

          <details
            className={`fin-audit-accordion rv${auditOpen ? ' is-open' : ''}`}
            open={auditOpen}
            onToggle={(e) => setAuditOpen(e.currentTarget.open)}
          >
            <summary className="fin-audit-accordion-summary">
              <span className="fin-audit-accordion-copy">
                <span className="fin-audit-accordion-title">
                  {t.step2.auditedHistoryAccordion}
                </span>
                <span className="fin-audit-accordion-hint">
                  {t.step2.auditedHistoryAccordionHint}
                </span>
              </span>
              <ChevronDown
                className="fin-audit-accordion-chevron"
                aria-hidden="true"
                size={20}
                strokeWidth={2.25}
              />
            </summary>
            <div className="fin-audit-accordion-body">
            <div className="fin-field-grid grid grid-cols-1 md:grid-cols-2">
              <SmartInput
                label={t.step2.hist2024Revenue}
                  tooltip={step2Copy.histYearTip}
                  value={safeK(y2024.revenueK)}
                  variant="currency"
              currencyCode={reportingCurrency}
                  density="compact"
                  placeholder={t.step2.placeholderRevenueExample}
                  ariaLabel={t.step2.hist2024Revenue}
                  onChange={(v) =>
                    updateFinancials(
                      patchFinancialHistoryYear(financials, 'y2024', { revenueK: v }),
                    )
                  }
                />
                <SmartInput
                  label={t.step2.hist2024Ebitda}
                  tooltip={step2Copy.histYearTip}
                  value={safeK(y2024.ebitdaK)}
                  variant="currency"
              currencyCode={reportingCurrency}
                  density="compact"
                  placeholder={t.step2.placeholderEbitdaExample}
                  ariaLabel={t.step2.hist2024Ebitda}
                  onChange={(v) =>
                    updateFinancials(
                      patchFinancialHistoryYear(financials, 'y2024', { ebitdaK: v }),
                    )
                  }
                />
              </div>
              <div className="fin-field-grid grid grid-cols-1 md:grid-cols-2">
                <SmartInput
                  label={t.step2.hist2025Revenue}
                  tooltip={step2Copy.histYearTip}
                  value={safeK(y2025.revenueK)}
                  variant="currency"
              currencyCode={reportingCurrency}
                  density="compact"
                  placeholder={t.step2.placeholderRevenueExample}
                  ariaLabel={t.step2.hist2025Revenue}
                  onChange={(v) =>
                    updateFinancials(
                      patchFinancialHistoryYear(financials, 'y2025', { revenueK: v }),
                    )
                  }
                />
                <SmartInput
                  label={t.step2.hist2025Ebitda}
                  tooltip={step2Copy.histYearTip}
                  value={safeK(y2025.ebitdaK)}
                  variant="currency"
              currencyCode={reportingCurrency}
                  density="compact"
                  placeholder={t.step2.placeholderEbitdaExample}
                  ariaLabel={t.step2.hist2025Ebitda}
                  onChange={(v) =>
                    updateFinancials(
                      patchFinancialHistoryYear(financials, 'y2025', { ebitdaK: v }),
                    )
                  }
                />
              </div>
            </div>
          </details>

          <SmartInput
            label={t.step2.ownerSalary}
            tooltip={step2Copy.ownerSalaryTip}
            value={safeK(financials.normalizedOwnerSalaryK)}
            variant="currency"
            currencyCode={reportingCurrency}
            placeholder={t.step2.placeholderZero}
            ariaLabel={t.step2.ownerSalary}
            onChange={(v) => updateFinancials({ normalizedOwnerSalaryK: v })}
          />

          <SmartSlider
            label={
              <SmartFieldLabel tooltip={t.step2.growthTip} required>
                {t.step2.growth}
              </SmartFieldLabel>
            }
            value={safeK(financials.growth)}
            min={-10}
            max={50}
            step={1}
            unit="%"
            minLabel={t.step2.minGrowth}
            maxLabel={t.step2.maxGrowth}
            ariaLabel={t.step2.growth}
            onChange={(v) => updateFinancials({ growth: v })}
          />

          <SmartInput
            label={t.step2.projected2027F}
            tooltip={step2Copy.projectedForwardTip}
            value={projected2027K}
            variant="currency"
            currencyCode={reportingCurrency}
            readOnly
            placeholder={t.step2.placeholderEbitdaExample}
            ariaLabel={t.step2.projected2027F}
          />

          <SmartSlider
            label={
              <SmartFieldLabel tooltip={t.step2.capexTip}>{t.step2.capex}</SmartFieldLabel>
            }
            value={safeK(financials.capexLevelPct)}
            min={0}
            max={30}
            step={1}
            unit="%"
            minLabel="0%"
            maxLabel="30%"
            ariaLabel={t.step2.capex}
            onChange={(v) => updateFinancials({ capexLevelPct: v })}
          />

          <div className="fin-field-grid grid grid-cols-1 md:grid-cols-2">
            <SmartInput
              label={t.step2.grossDebt}
              tooltip={step2Copy.grossDebtTip}
              value={safeK(financials.grossDebtK)}
              variant="currency"
              currencyCode={reportingCurrency}
              density="compact"
              placeholder={t.step2.placeholderZero}
              ariaLabel={t.step2.grossDebt}
              onChange={(v) => updateFinancials({ grossDebtK: v })}
            />
            <SmartInput
              label={t.step2.cash}
              tooltip={step2Copy.cashTip}
              value={safeK(financials.cashK)}
              variant="currency"
              currencyCode={reportingCurrency}
              density="compact"
              placeholder={t.step2.placeholderZero}
              ariaLabel={t.step2.cash}
              onChange={(v) => updateFinancials({ cashK: v })}
            />
          </div>

          <div
            className={[
              'net-debt-banner rv eq-live-currency',
              netBridge.isNetCash ? 'net-debt-banner--surplus' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            data-currency={reportingCurrency}
          >
            <span>{netBridge.label}</span>
            <b
              className={[
                'mono eq-currency-value',
                netBridge.isNetCash ? 'text-emerald-400 font-semibold' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {netBridge.display}
            </b>
          </div>

          <div className="fin-field-grid fin-field-grid--meta grid grid-cols-1 md:grid-cols-2">
            <div className="field">
              <label>{t.step2.currency}</label>
              <select
                className="sel"
                data-currency={reportingCurrency}
                value={profile.currency}
                onChange={(e) =>
                  setReportingCurrency(e.target.value as typeof reportingCurrency)
                }
              >
                <option value="ILS">{t.step2.currencyIls}</option>
                <option value="USD">{t.step2.currencyUsd}</option>
                <option value="EUR">{t.step2.currencyEur}</option>
              </select>
            </div>
            <div className="field">
              <label>{t.step2.fiscalYear}</label>
              <input
                className="inp"
                type="number"
                placeholder="2025"
                dir="ltr"
                value={profile.fiscalYear ?? ''}
                onChange={(e) => updateProfile({ fiscalYear: e.target.value })}
              />
            </div>
          </div>
        </div>

        <LiveValuationCard variant="panel" />
      </div>

      <div className="nav-row rv">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          {backLabel}
        </button>
        <div className="nav-row-end">
          <span style={{ fontSize: 13, color: 'var(--dim)' }}>{t.common.requiredFields}</span>
          <button
            type="button"
            className={`btn btn-primary${canProceed ? '' : ' btn-primary--gated'}`}
            onClick={handleNext}
            aria-disabled={!canProceed}
          >
            {t.common.nextRisk} <span className="arr">{isHe ? '←' : '→'}</span>
          </button>
        </div>
      </div>
    </>
  );
}
