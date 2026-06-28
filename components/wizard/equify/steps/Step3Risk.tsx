'use client';

import React from 'react';
import { useEquifyStrings } from '../../../../lib/i18n/use_equify_strings';
import { SmartFieldLabel } from '../../ui/SmartFieldLabel';
import { SmartSlider } from '../../ui/SmartSlider';
import { useReportingCurrency, useWizardValuation } from '../WizardValuationContext';

export interface Step3RiskProps {
  onBack: () => void;
  onNext: () => void;
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="toggle-row">
      <div className="tl">
        <span>{label}</span>
        <small>{hint}</small>
      </div>
      <label className="toggle">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="slider" />
      </label>
    </div>
  );
}

export function Step3Risk({ onBack, onNext }: Step3RiskProps) {
  const { shell, steps: t, isHe } = useEquifyStrings();
  const { state, computed, updateRisk, updateProfile } = useWizardValuation();
  const { reportingCurrency, currencySymbol } = useReportingCurrency();
  const { risk, profile } = state;

  const concWaccBps = risk.topCustomer > 40 ? 80 : risk.topCustomer > 20 ? 40 : 0;
  const recurWaccBps = Math.round((1 - risk.recurring / 100) * 80);
  const backLabel = isHe ? `→ ${t.common.back}` : `← ${t.common.back}`;

  return (
    <>
      <div className="pane-eyebrow rv">{shell.step3Eyebrow}</div>
      <h2 className="pane-title rv">
        {t.step3.titlePrefix} <span className="hl">{t.step3.titleHl}</span>
      </h2>
      <p className="pane-sub rv">{t.step3.sub}</p>

      <div
        className="eq-reporting-currency-pill rv mono"
        data-currency={reportingCurrency}
        aria-live="polite"
      >
        <span className="eq-reporting-currency-pill-label">{t.step2.currency}</span>
        <span className="eq-currency-symbol eq-reporting-currency-pill-value">
          {currencySymbol}
        </span>
        <span className="eq-reporting-currency-pill-code">{reportingCurrency}</span>
      </div>

      <div className="fgroup stagger">
        <div className="risk-section">
          <h4>{t.step3.revenueStability}</h4>
          <div className="risk-fields">
            <SmartSlider
            label={
              <SmartFieldLabel tooltip={t.step3.recurringTip}>
                {t.step3.recurring}
              </SmartFieldLabel>
            }
              value={risk.recurring}
              min={0}
              max={100}
              step={5}
              unit="%"
              minLabel="0%"
              maxLabel="100%"
              onChange={(v) => updateRisk({ recurring: v })}
            />
            <SmartSlider
            label={
              <SmartFieldLabel tooltip={t.step3.concentrationTip(concWaccBps)}>
                {t.step3.concentration}
              </SmartFieldLabel>
            }
              value={risk.topCustomer}
              min={0}
              max={100}
              step={5}
              unit="%"
              fillClassName="sn-fill-conc"
              minLabel={t.step3.minConc}
              maxLabel={t.step3.maxConc}
              onChange={(v) => updateRisk({ topCustomer: v })}
            />
          </div>
        </div>

        <div className="risk-section">
          <h4>{t.step3.management}</h4>
          <div className="risk-fields">
            <ToggleRow
              label={t.step3.founderDep}
              hint={t.step3.founderDepHint}
              checked={risk.founderDep}
              onChange={(v) => updateRisk({ founderDep: v })}
            />
            <ToggleRow
              label={t.step3.competition}
              hint={t.step3.competitionHint}
              checked={risk.competition}
              onChange={(v) => updateRisk({ competition: v })}
            />
            <ToggleRow
              label={t.step3.ip}
              hint={t.step3.ipHint}
              checked={risk.ip}
              onChange={(v) => updateRisk({ ip: v })}
            />
            <ToggleRow
              label={t.step3.contracts}
              hint={t.step3.contractsHint}
              checked={risk.contracts}
              onChange={(v) => updateRisk({ contracts: v })}
            />
          </div>
        </div>

        <p className="risk-mod-hint rv">
          {t.step3.riskHint(
            computed.wacc.toFixed(1),
            concWaccBps,
            recurWaccBps,
            risk.founderDep,
          )}
        </p>

        <div className="field">
          <label>{t.step3.moatLabel}</label>
          <textarea
            className="textarea"
            placeholder={t.step3.moatPlaceholder}
            value={profile.qualitativeDescription}
            onChange={(e) =>
              updateProfile({ qualitativeDescription: e.target.value })
            }
          />
        </div>
      </div>

      <div className="nav-row rv">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          {backLabel}
        </button>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          {t.common.nextGoal} <span className="arr">{isHe ? '←' : '→'}</span>
        </button>
      </div>
    </>
  );
}
