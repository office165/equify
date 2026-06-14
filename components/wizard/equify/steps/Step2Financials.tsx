'use client';

import React, { useMemo } from 'react';
import { fmtEquitySidebarM, fmtK } from '../../../../lib/valuation';
import { computeNetDebtK } from '../../../../lib/wizard/map_equify_wizard';
import { useEquifyStrings } from '../../../../lib/i18n/use_equify_strings';
import { FieldTooltip } from '../../ui/FieldTooltip';
import { SmartSlider } from '../../ui/SmartSlider';
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
        <div className="fin-sliders stagger">
          <SmartSlider
            label={
              <>
                {t.step2.revenue}
                <FieldTooltip text={t.step2.revenueTip} />
              </>
            }
            value={financials.rev}
            min={500}
            max={200000}
            step={500}
            unit="₪K"
            required
            ariaLabel={t.step2.revenue}
            minLabel={t.step2.minRev}
            maxLabel={t.step2.maxRev}
            onChange={(v) => updateFinancials({ rev: v })}
          />
          <SmartSlider
            label={
              <>
                {t.step2.margin}
                <FieldTooltip text={t.step2.marginTip} />
              </>
            }
            value={financials.margin}
            min={0}
            max={60}
            step={0.5}
            unit="%"
            required
            ariaLabel={t.step2.margin}
            minLabel="0%"
            maxLabel="60%"
            onChange={(v) => updateFinancials({ margin: v })}
          />
          <SmartSlider
            label={
              <>
                {t.step2.ownerSalary}
                <FieldTooltip text={t.step2.ownerSalaryTip} />
              </>
            }
            value={financials.normalizedOwnerSalaryK}
            min={0}
            max={3000}
            step={50}
            unit="₪K"
            ariaLabel={t.step2.ownerSalary}
            minLabel={t.step2.minZero}
            maxLabel={t.step2.maxOwnerSalary}
            onChange={(v) => updateFinancials({ normalizedOwnerSalaryK: v })}
          />
          <SmartSlider
            label={
              <>
                {t.step2.capex}
                <FieldTooltip text={t.step2.capexTip} />
              </>
            }
            value={financials.capexLevelPct}
            min={0}
            max={25}
            step={1}
            unit="%"
            ariaLabel={t.step2.capex}
            minLabel="0%"
            maxLabel="25%"
            onChange={(v) => updateFinancials({ capexLevelPct: v })}
          />
          <SmartSlider
            label={
              <>
                {t.step2.growth}
                <FieldTooltip text={t.step2.growthTip} />
              </>
            }
            value={financials.growth}
            min={-10}
            max={50}
            step={1}
            unit="%"
            required
            ariaLabel={t.step2.growth}
            minLabel={t.step2.minGrowth}
            maxLabel={t.step2.maxGrowth}
            onChange={(v) => updateFinancials({ growth: v })}
          />
          <SmartSlider
            label={
              <>
                {t.step2.grossDebt}
                <FieldTooltip text={t.step2.grossDebtTip} />
              </>
            }
            value={financials.grossDebtK}
            min={0}
            max={50000}
            step={100}
            unit="₪K"
            ariaLabel={t.step2.grossDebt}
            minLabel={t.step2.minZero}
            maxLabel={t.step2.maxGrossDebt}
            onChange={(v) => updateFinancials({ grossDebtK: v })}
          />
          <SmartSlider
            label={
              <>
                {t.step2.cash}
                <FieldTooltip text={t.step2.cashTip} />
              </>
            }
            value={financials.cashK}
            min={0}
            max={20000}
            step={50}
            unit="₪K"
            ariaLabel={t.step2.cash}
            minLabel={t.step2.minZero}
            maxLabel={t.step2.maxCash}
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
          <div className="cl-models">
            <div className="cl-row">
              <span>{t.step2.modelDcf}</span>
              <div className="cl-bar-wrap">
                <div className="cl-bar-fill" style={{ width: barPct(computed.dcf) }} />
              </div>
              <b className="mono">{fmtK(computed.dcf, locale)}</b>
            </div>
            <div className="cl-row">
              <span>{t.step2.modelEbitda}</span>
              <div className="cl-bar-wrap">
                <div
                  className="cl-bar-fill"
                  style={{ width: barPct(computed.ebtMult) }}
                />
              </div>
              <b className="mono">{fmtK(computed.ebtMult, locale)}</b>
            </div>
            <div className="cl-row">
              <span>{t.step2.modelRevenue}</span>
              <div className="cl-bar-wrap">
                <div
                  className="cl-bar-fill"
                  style={{ width: barPct(computed.revMult) }}
                />
              </div>
              <b className="mono">{fmtK(computed.revMult, locale)}</b>
            </div>
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
