'use client';

import React, { useMemo } from 'react';
import { fmtEquitySidebarM, fmtK } from '../../../../lib/valuation';
import { BLENDED_EBITDA_WEIGHTS } from '../../../../lib/valuation/blended_ebitda';
import { computeNetDebtK } from '../../../../lib/wizard/map_equify_wizard';
import { useEquifyStrings } from '../../../../lib/i18n/use_equify_strings';
import { EbitdaSmartInput } from '../../ui/EbitdaSmartInput';
import { SmartInput } from '../../ui/SmartInput';
import { useWizardValuation } from '../WizardValuationContext';

export interface Step2FinancialsProps {
  onBack: () => void;
  onNext: () => void;
}

export function Step2Financials({ onBack, onNext }: Step2FinancialsProps) {
  const { shell, steps: t, isHe, locale } = useEquifyStrings();
  const { state, computed, scenarios, updateFinancials, updateProfile } =
    useWizardValuation();
  const { financials, profile } = state;

  const netDebtK = useMemo(() => computeNetDebtK(financials), [financials]);

  const { blendWeights, ebitdaBlend } = computed;
  const weightLabel = (base: string, w: number) =>
    w > 0 ? `${base} · ${Math.round(w * 100)}%` : base;
  const wEbitda = BLENDED_EBITDA_WEIGHTS;
  const maxEv = Math.max(computed.dcf, computed.ebtMult, computed.revMult, 1);
  const barPct = (v: number) => `${(v / maxEv) * 90}%`;
  const qsArc = (computed.qs / 100) * 163.4;
  const backLabel = isHe ? `→ ${t.common.back}` : `← ${t.common.back}`;

  return (
    <>
      <div className="pane-eyebrow rv">{shell.step2Eyebrow}</div>
      <h2 className="pane-title rv">
        {shell.step2TitleBefore}{' '}
        <span className="hl">{shell.step2TitleHl}</span>
      </h2>
      <p className="pane-sub rv">{t.step2.sub}</p>

      <div className="fin-layout">
        <div className="fin-inputs stagger w-full min-w-0 max-w-full overflow-x-clip">
          <SmartInput
            label={t.step2.revenue}
            tooltip={t.step2.revenueTip}
            value={financials.rev}
            variant="currency"
            required
            ariaLabel={t.step2.revenue}
            onChange={(v) => updateFinancials({ rev: v })}
          />
          <EbitdaSmartInput
            label={t.step2.margin}
            tooltip={t.step2.marginTip}
            marginPct={financials.margin}
            revenueK={financials.rev}
            amountLabel={t.step2.ebitdaAmount}
            percentLabel={t.step2.ebitdaPercent}
            required
            ariaLabel={t.step2.margin}
            onChangeMargin={(v) => updateFinancials({ margin: v })}
          />
          <SmartInput
            label={t.step2.ownerSalary}
            tooltip={t.step2.ownerSalaryTip}
            value={financials.normalizedOwnerSalaryK}
            variant="currency"
            ariaLabel={t.step2.ownerSalary}
            onChange={(v) => updateFinancials({ normalizedOwnerSalaryK: v })}
          />
          <SmartInput
            label={t.step2.capex}
            tooltip={t.step2.capexTip}
            value={financials.capexLevelPct}
            variant="percent"
            showMultipliers={false}
            ariaLabel={t.step2.capex}
            onChange={(v) => updateFinancials({ capexLevelPct: v })}
          />
          <SmartInput
            label={t.step2.growth}
            tooltip={t.step2.growthTip}
            value={financials.growth}
            variant="percent"
            showMultipliers={false}
            required
            ariaLabel={t.step2.growth}
            onChange={(v) => updateFinancials({ growth: v })}
          />
          <SmartInput
            label={t.step2.grossDebt}
            tooltip={t.step2.grossDebtTip}
            value={financials.grossDebtK}
            variant="currency"
            ariaLabel={t.step2.grossDebt}
            onChange={(v) => updateFinancials({ grossDebtK: v })}
          />
          <SmartInput
            label={t.step2.cash}
            tooltip={t.step2.cashTip}
            value={financials.cashK}
            variant="currency"
            ariaLabel={t.step2.cash}
            onChange={(v) => updateFinancials({ cashK: v })}
          />

          <div className="net-debt-banner rv">
            <span>{t.step2.netDebt}</span>
            <b className="mono">{fmtK(netDebtK, locale)}</b>
          </div>

          <div className="fgroup two" style={{ marginTop: 8 }}>
            <div className="field">
              <label>{t.step2.currency}</label>
              <select
                className="sel"
                value={profile.currency}
                onChange={(e) =>
                  updateProfile({
                    currency: e.target.value as 'ILS' | 'USD' | 'EUR',
                  })
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
                value={profile.fiscalYear}
                onChange={(e) => updateProfile({ fiscalYear: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="calc-live rv-r">
          <div className="cl-hd">{t.step2.livePanel}</div>
          <div className="cl-val mono">{fmtEquitySidebarM(computed.equity, locale)}</div>
          <div className="cl-sub mono">
            {t.step2.waccQuality(computed.wacc.toFixed(1), computed.qsGrade)}
          </div>
          <div className="cl-ebitda-blend">
            <div className="cl-ebitda-blend-hd">{t.step2.blendedEbitdaTitle}</div>
            <div className="cl-ebitda-blend-row">
              {t.step2.blendedEbitdaPast(
                Math.round(wEbitda.past * 100),
                fmtK(ebitdaBlend.past, locale),
              )}
            </div>
            <div className="cl-ebitda-blend-row">
              {t.step2.blendedEbitdaCurrent(
                Math.round(wEbitda.current * 100),
                fmtK(ebitdaBlend.current, locale),
              )}
            </div>
            <div className="cl-ebitda-blend-row">
              {t.step2.blendedEbitdaProjected(
                Math.round(wEbitda.projected * 100),
                fmtK(ebitdaBlend.projected, locale),
                ebitdaBlend.dcfGrowthPct.toFixed(1),
              )}
            </div>
            <div className="cl-ebitda-blend-total mono">
              {t.step2.blendedEbitdaTotal(fmtK(ebitdaBlend.blended, locale))}
            </div>
          </div>
          <div className="cl-models">
            <div className="cl-row">
              <span>{weightLabel(t.step2.modelDcf, blendWeights.dcf)}</span>
              <div className="cl-bar-wrap">
                <div className="cl-bar-fill" style={{ width: barPct(computed.dcf) }} />
              </div>
              <b className="mono">{fmtK(computed.dcf, locale)}</b>
            </div>
            <div className="cl-row">
              <span>{weightLabel(t.step2.modelEbitda, blendWeights.ebitda)}</span>
              <div className="cl-bar-wrap">
                <div
                  className="cl-bar-fill"
                  style={{ width: barPct(computed.ebtMult) }}
                />
              </div>
              <b className="mono">{fmtK(computed.ebtMult, locale)}</b>
            </div>
            {blendWeights.rev > 0 ? (
              <div className="cl-row">
                <span>{weightLabel(t.step2.modelRevenue, blendWeights.rev)}</span>
                <div className="cl-bar-wrap">
                  <div
                    className="cl-bar-fill"
                    style={{ width: barPct(computed.revMult) }}
                  />
                </div>
                <b className="mono">{fmtK(computed.revMult, locale)}</b>
              </div>
            ) : null}
          </div>
          <div className="scen-row">
            <div className="scen-badge bear">
              <span style={{ color: 'var(--dim)', fontSize: 10 }}>{t.step2.scenarioBear}</span>
              <span className="sv mono">{fmtK(scenarios.bearEq, locale)}</span>
            </div>
            <div className="scen-badge base">
              <span style={{ color: 'var(--dim)', fontSize: 10 }}>{t.step2.scenarioBase}</span>
              <span className="sv mono">{fmtK(scenarios.baseEq, locale)}</span>
            </div>
            <div className="scen-badge bull">
              <span style={{ color: 'var(--dim)', fontSize: 10 }}>{t.step2.scenarioBull}</span>
              <span className="sv mono">{fmtK(scenarios.bullEq, locale)}</span>
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
                  stroke="url(#qg)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${qsArc} 164`}
                  transform="rotate(-90 32 32)"
                />
                <defs>
                  <linearGradient id="qg" x1="0" y1="0" x2="1" y2="0">
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
      </div>

      <div className="nav-row rv">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          {backLabel}
        </button>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          {t.common.nextRisk} <span className="arr">{isHe ? '←' : '→'}</span>
        </button>
      </div>
    </>
  );
}
