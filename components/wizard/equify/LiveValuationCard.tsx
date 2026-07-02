'use client';

import React, { useCallback, useMemo, useRef } from 'react';
import { fmtEquitySidebarM, fmtK } from '../../../lib/valuation';
import { BLENDED_EBITDA_WEIGHTS } from '../../../lib/valuation/blended_ebitda';
import { useEquifyStrings } from '../../../lib/i18n/use_equify_strings';
import {
  formatLiveAmountEmpty,
  hasMeaningfulFinancialInputs,
} from '../../../lib/wizard/financial_input_state';
import { resolveDisplayWeights } from '../../../lib/valuation/resolve_display_weights';
import { ValuationMultipleInput } from '../ui/ValuationMultipleInput';
import { useReportingCurrency, useWizardValuation } from './WizardValuationContext';
import { WaccBreakdownPopover } from './WaccBreakdownPopover';

export type LiveValuationCardVariant = 'sidebar' | 'panel';

export interface LiveValuationCardProps {
  variant: LiveValuationCardVariant;
  companyName?: string;
}

/** Shared live valuation readout — currency-aware, instant sync with reporting currency. */
export function LiveValuationCard({ variant, companyName }: LiveValuationCardProps) {
  const { locale, steps: t, shell } = useEquifyStrings();
  const { state, computed, scenarios, updateFinancials } = useWizardValuation();
  const { reportingCurrency, currencySymbol } = useReportingCurrency();
  const { financials, profile } = state;
  const liveCardRef = useRef<HTMLDivElement>(null);

  const hasLiveInputs = useMemo(
    () => hasMeaningfulFinancialInputs(financials),
    [financials],
  );

  const fmtLiveK = useCallback(
    (k: number) =>
      hasLiveInputs
        ? fmtK(k, locale, reportingCurrency)
        : formatLiveAmountEmpty(locale, reportingCurrency),
    [hasLiveInputs, locale, reportingCurrency],
  );

  const displayWeights = useMemo(() => {
    if (hasLiveInputs) {
      return {
        dcf: computed.blendWeights.dcf,
        ebitdaMultiple: computed.blendWeights.ebitda,
        revenueMultiple: computed.blendWeights.rev,
        regimeLabel:
          computed.normalizedEbitda?.isCurrentYearAnomalous &&
          (computed.normalizedEbitda.spotEbitdaK ?? 0) < 0 &&
          (computed.normalizedEbitda.normalizedEbitdaK ?? 0) > 0
            ? computed.profitabilityRegime?.labelHe ?? null
            : computed.profitabilityRegime?.regime !== 'healthy'
              ? computed.profitabilityRegime?.labelHe ?? null
              : null,
      };
    }
    return resolveDisplayWeights({
      sectorKey: profile.sector,
      subSectorKey: profile.subSector,
      financials: null,
    });
  }, [
    computed.blendWeights.dcf,
    computed.blendWeights.ebitda,
    computed.blendWeights.rev,
    computed.profitabilityRegime,
    hasLiveInputs,
    profile.sector,
    profile.subSector,
  ]);

  const blendWeights = {
    dcf: displayWeights.dcf,
    ebitda: displayWeights.ebitdaMultiple,
    rev: displayWeights.revenueMultiple,
  };
  const { ebitdaBlend } = computed;
  const dcfWeightPct = Math.round(blendWeights.dcf * 100);
  const ebitdaWeightPct = Math.round(blendWeights.ebitda * 100);
  const revWeightPct = Math.round(blendWeights.rev * 100);
  const weightLabel = (base: string, w: number) =>
    w > 0 ? `${base} · ${Math.round(w * 100)}%` : base;
  const weightBarWidth = (w: number) => `${Math.round(w * 100)}%`;
  const wEbitda = BLENDED_EBITDA_WEIGHTS;
  const qsArc = (computed.qs / 100) * 163.4;
  const usesRevenueMultipleLeg = blendWeights.rev > blendWeights.ebitda;
  const multipleType =
    computed.methodologyStrategy === 'current_run_rate_revenue' || usesRevenueMultipleLeg
      ? 'Revenue'
      : 'EBITDA';
  const inflectionMultipleLabel = usesRevenueMultipleLeg
    ? t.step2.modelRevenue.replace(/\s*×\s*$/, '').trim()
    : t.step2.modelEbitda.replace(/\s*×\s*$/, '').trim();
  const inflectionMultiplePct = usesRevenueMultipleLeg ? revWeightPct : ebitdaWeightPct;

  const equityDisplay = hasLiveInputs
    ? fmtEquitySidebarM(computed.equity, locale, reportingCurrency)
    : formatLiveAmountEmpty(locale, reportingCurrency);

  const currencyAttrs = {
    'data-currency': reportingCurrency,
    'data-currency-symbol': currencySymbol,
  };

  if (variant === 'sidebar') {
    return (
      <div className="lv-panel eq-live-currency" {...currencyAttrs}>
        <div className="lv-top">
          <span>{shell.ownerValue}</span>
          <span className="lv-dot" />
        </div>
        <div className={`lv-val mono eq-currency-value${hasLiveInputs ? '' : ' cl-val--empty'}`}>
          {equityDisplay}
        </div>
        <div className="lv-sub">
          {hasLiveInputs ? shell.liveUpdating : shell.liveEmptyFinancials}
        </div>
        {companyName ? (
          <div className="lv-sub" style={{ marginTop: 4, opacity: 0.85 }}>
            {companyName}
          </div>
        ) : null}
        <div className="lv-rows">
          <div className="lv-row">
            <span>{weightLabel(t.step2.modelDcf, blendWeights.dcf)}</span>
            <b className="mono eq-currency-value">{fmtLiveK(computed.dcf)}</b>
          </div>
          {blendWeights.ebitda > 0 ? (
            <div className="lv-row">
              <span>{weightLabel(t.step2.modelEbitda, blendWeights.ebitda)}</span>
              <b className="mono eq-currency-value">{fmtLiveK(computed.ebtMult)}</b>
            </div>
          ) : null}
          {blendWeights.rev > 0 ? (
            <div className="lv-row">
              <span>{weightLabel(t.step2.modelRevenue, blendWeights.rev)}</span>
              <b className="mono eq-currency-value">{fmtLiveK(computed.revMult)}</b>
            </div>
          ) : null}
          <div className="lv-row hl">
            <span>{shell.enterpriseValue}</span>
            <b
              className={`mono eq-currency-value${hasLiveInputs ? '' : ' cl-val--empty'}`}
            >
              {fmtLiveK(computed.ev)}
            </b>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={liveCardRef} className="calc-live rv-r eq-live-currency" {...currencyAttrs}>
      <div className="cl-hd">{t.step2.livePanel}</div>
      <div className={`cl-val mono eq-currency-value${hasLiveInputs ? '' : ' cl-val--empty'}`}>
        {equityDisplay}
      </div>
      <div className="cl-sub mono flex flex-wrap items-center gap-x-0.5">
        {hasLiveInputs ? (
          <>
            <WaccBreakdownPopover
              wacc={computed.wacc}
              breakdown={computed.waccBreakdown}
              topCustomerPct={state.risk.topCustomer}
              locale={locale}
              boundaryRef={liveCardRef}
              copy={{
                waccBreakdownAria: t.step2.waccBreakdownAria,
                waccBreakdownTitle: t.step2.waccBreakdownTitle,
                waccBreakdownRf: t.step2.waccBreakdownRf,
                waccBreakdownBeta: t.step2.waccBreakdownBeta,
                waccBreakdownErp: t.step2.waccBreakdownErp,
                waccBreakdownAlpha: t.step2.waccBreakdownAlpha,
                waccBreakdownSpecificRisk: t.step2.waccBreakdownSpecificRisk,
                waccBreakdownProfitabilityLoss: t.step2.waccBreakdownProfitabilityLoss,
                waccBreakdownSpecificRiskConcentration:
                  t.step2.waccBreakdownSpecificRiskConcentration,
                waccBreakdownSpecificRiskFounder: t.step2.waccBreakdownSpecificRiskFounder,
                waccBreakdownSpecificRiskIpProtected:
                  t.step2.waccBreakdownSpecificRiskIpProtected,
                waccBreakdownSpecificRiskIpUnprotected:
                  t.step2.waccBreakdownSpecificRiskIpUnprotected,
                waccBreakdownSpecificRiskContractsYes:
                  t.step2.waccBreakdownSpecificRiskContractsYes,
                waccBreakdownSpecificRiskContractsNo:
                  t.step2.waccBreakdownSpecificRiskContractsNo,
                waccBreakdownKe: t.step2.waccBreakdownKe,
                waccBreakdownFormula: t.step2.waccBreakdownFormula,
              }}
            />
            <span>{t.step2.waccQualityGrade(computed.qsGrade)}</span>
          </>
        ) : (
          t.step2.liveEmptyHint
        )}
      </div>
      {computed.backlogInflectionActive ? (
        <div className="cl-inflection-note mono">
          {t.step2.inflectionActive(
            Math.round((computed.backlogRatio ?? 0) * 100),
            dcfWeightPct,
            inflectionMultipleLabel,
            inflectionMultiplePct,
          )}
        </div>
      ) : null}
      {computed.backlogEquityUpliftK != null && computed.backlogEquityUpliftK > 0 ? (
        <div className="cl-row" style={{ marginTop: 8 }}>
          <span>{t.step2.backlogEquityUpliftLabel}</span>
          <b className="mono eq-currency-value">
            {t.step2.backlogEquityUplift(
              computed.backlogEquityUpliftPct ?? 0,
              fmtLiveK(computed.backlogEquityUpliftK),
            )}
          </b>
        </div>
      ) : null}
      {computed.normalizedEbitda &&
      computed.normalizedEbitda.yearsAvailable > 1 &&
      computed.normalizedEbitda.explanationHe ? (
        <div className="cl-inflection-note mono" style={{ marginTop: 8 }}>
          {computed.normalizedEbitda.explanationHe}
        </div>
      ) : null}
      <div className="cl-mult-override rv mb-4">
        <ValuationMultipleInput
          label={t.step2.effectiveMultiple}
          tooltip={t.step2.effectiveMultipleTip}
          multipleType={multipleType}
          automaticMultiple={computed.configuredDefaultMultiple}
          customMultiple={financials.customMultiple ?? null}
          isManualMultiple={financials.isManualMultiple ?? false}
          onManualMultipleChange={({ customMultiple, isManualMultiple }) =>
            updateFinancials({ customMultiple, isManualMultiple })
          }
          copy={{
            autoBadge: t.step2.multipleAutoBadge,
            manualBadge: t.step2.multipleManualBadge,
            reset: t.step2.multipleReset,
            multipleEntered: t.step2.multipleEntered,
            multipleAfterDlom: t.step2.multipleAfterDlom,
            multipleAfterScale: t.step2.multipleAfterScale,
            multipleEffective: t.step2.multipleEffective,
          }}
          normalizationBreakdown={
            financials.isManualMultiple ? computed.multipleNormalizationBreakdown : null
          }
          locale={locale}
          ariaLabel={t.step2.effectiveMultiple}
        />
      </div>
      <div className="cl-ebitda-blend">
        <div className="cl-ebitda-blend-hd">{t.step2.blendedEbitdaTitle}</div>
        <div className="cl-ebitda-blend-row">
          {t.step2.blendedEbitdaPast(
            Math.round(wEbitda.past * 100),
            fmtLiveK(ebitdaBlend?.past ?? 0),
          )}
        </div>
        <div className="cl-ebitda-blend-row">
          {t.step2.blendedEbitdaCurrent(
            Math.round(wEbitda.current * 100),
            fmtLiveK(ebitdaBlend?.current ?? 0),
          )}
        </div>
        <div className="cl-ebitda-blend-row">
          {t.step2.blendedEbitdaProjected(
            Math.round(wEbitda.projected * 100),
            fmtLiveK(ebitdaBlend?.projected ?? 0),
            (ebitdaBlend?.dcfGrowthPct ?? 0).toFixed(1),
          )}
        </div>
        <div className="cl-ebitda-blend-total mono eq-currency-value">
          {t.step2.blendedEbitdaTotal(fmtLiveK(ebitdaBlend?.blended ?? 0))}
        </div>
      </div>
      <div className="cl-models">
        <div className="cl-row">
          <span>{weightLabel(t.step2.modelDcf, blendWeights.dcf)}</span>
          <div className="cl-bar-wrap">
            <div
              className="cl-bar-fill"
              style={{ width: weightBarWidth(blendWeights.dcf) }}
            />
          </div>
          <b className="mono eq-currency-value">{fmtLiveK(computed.dcf)}</b>
        </div>
        {blendWeights.ebitda > 0 ? (
          <div className="cl-row">
            <span>{weightLabel(t.step2.modelEbitda, blendWeights.ebitda)}</span>
            <div className="cl-bar-wrap">
              <div
                className="cl-bar-fill"
                style={{ width: weightBarWidth(blendWeights.ebitda) }}
              />
            </div>
            <b className="mono eq-currency-value">{fmtLiveK(computed.ebtMult)}</b>
          </div>
        ) : null}
        {blendWeights.rev > 0 ? (
          <div className="cl-row">
            <span>{weightLabel(t.step2.modelRevenue, blendWeights.rev)}</span>
            <div className="cl-bar-wrap">
              <div
                className="cl-bar-fill"
                style={{ width: weightBarWidth(blendWeights.rev) }}
              />
            </div>
            <b className="mono eq-currency-value">{fmtLiveK(computed.revMult)}</b>
          </div>
        ) : null}
      </div>
      <div className="scen-row">
        <div className="scen-badge bear">
          <span style={{ color: 'var(--dim)', fontSize: 10 }}>{t.step2.scenarioBear}</span>
          <span className="sv mono eq-currency-value">{fmtLiveK(scenarios.bearEq)}</span>
        </div>
        <div className="scen-badge base">
          <span style={{ color: 'var(--dim)', fontSize: 10 }}>{t.step2.scenarioBase}</span>
          <span className="sv mono eq-currency-value">{fmtLiveK(scenarios.baseEq)}</span>
        </div>
        <div className="scen-badge bull">
          <span style={{ color: 'var(--dim)', fontSize: 10 }}>{t.step2.scenarioBull}</span>
          <span className="sv mono eq-currency-value">{fmtLiveK(scenarios.bullEq)}</span>
        </div>
      </div>
      <div className="qs-wrap">
        <div className="qs-ring" style={{ width: 64, height: 64 }}>
          <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r="26" fill="none" stroke="#0F2E29" strokeWidth="6" />
            <circle
              cx="32"
              cy="32"
              r="26"
              fill="none"
              stroke="url(#qg-live-panel)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${qsArc} 164`}
              transform="rotate(-90 32 32)"
            />
            <defs>
              <linearGradient id="qg-live-panel" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#00C2B8" />
                <stop offset="1" stopColor="#C49A3C" />
              </linearGradient>
            </defs>
          </svg>
          <div className="qv mono">{computed.qs}</div>
        </div>
        <div className="qs-detail">
          <div className="qs-grade">{computed.qsGrade}</div>
          <div className="qs-label">{t.step2.qualityScore}</div>
        </div>
      </div>
    </div>
  );
}
