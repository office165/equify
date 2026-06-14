'use client';

import React from 'react';
import type { EquifyGoalKey } from '../../../../lib/valuation';
import { useEquifyStrings } from '../../../../lib/i18n/use_equify_strings';
import { useWizardValuation } from '../WizardValuationContext';

const GOAL_KEYS: EquifyGoalKey[] = [
  'negotiation',
  'fundraise',
  'partner',
  'bank',
  'internal',
  'legal',
];

const GOAL_ICONS: Record<EquifyGoalKey, string> = {
  negotiation: '🤝',
  fundraise: '💰',
  partner: '👥',
  bank: '🏦',
  internal: '📊',
  legal: '⚖️',
  '': '📋',
};

export interface Step4GoalProps {
  onBack: () => void;
  onGenerate: () => void;
  isSubmitting?: boolean;
  submitError?: string | null;
}

export function Step4Goal({
  onBack,
  onGenerate,
  isSubmitting,
  submitError,
}: Step4GoalProps) {
  const { shell, steps: t, isHe } = useEquifyStrings();
  const { state, setGoal, setAgreedToTerms } = useWizardValuation();
  const [shake, setShake] = React.useState(false);
  const backLabel = isHe ? `→ ${t.common.back}` : `← ${t.common.back}`;

  const handleGenerate = () => {
    if (!state.agreedToTerms) {
      setShake(true);
      window.setTimeout(() => setShake(false), 500);
      return;
    }
    onGenerate();
  };

  return (
    <>
      <div className={`pane-goal${shake ? ' shake' : ''}`}>
        <div className="pane-eyebrow rv">{shell.step4Eyebrow}</div>
        <h2 className="pane-title rv">
          {t.step4.titlePrefix} <span className="hl">{t.step4.titleHl}</span>
        </h2>
        <p className="pane-sub rv">{t.step4.sub}</p>

        <div className="goals stagger" role="group" aria-label={t.step4.goalGroup}>
          {GOAL_KEYS.map((key) => {
            const goal = t.step4.goals[key as keyof typeof t.step4.goals];
            return (
              <button
                key={key}
                type="button"
                className={`goal-card${state.goal === key ? ' on' : ''}`}
                onClick={() => setGoal(key)}
              >
                <div className="gc-check">✓</div>
                <div className="gc-icon">{GOAL_ICONS[key]}</div>
                <div className="gc-name">{goal.name}</div>
                <div className="gc-desc">{goal.desc}</div>
              </button>
            );
          })}
        </div>

        <div className="fgroup" style={{ marginTop: 28 }}>
          <div className="field">
            <label>
              {t.step4.termsLabel} <span className="req">*</span>
            </label>
            <label className="agree-box">
              <input
                type="checkbox"
                checked={state.agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
              />
              <span>
                {(() => {
                  const body = t.step4.termsBody;
                  const bold = t.step4.termsBold;
                  const idx = body.indexOf(bold);
                  if (idx < 0) return body;
                  return (
                    <>
                      {body.slice(0, idx)}
                      <b>{bold}</b>
                      {body.slice(idx + bold.length)}
                    </>
                  );
                })()}
              </span>
            </label>
          </div>
        </div>

        {submitError ? (
          <p className="v-msg err show" style={{ marginTop: 12 }}>
            {submitError}
          </p>
        ) : null}
      </div>

      <div className="nav-row rv">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          {backLabel}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={isSubmitting}
        >
          {isSubmitting ? t.step4.computing : `${t.step4.generate} ${isHe ? '←' : '→'}`}
        </button>
      </div>

      <p className="disclaimer">{t.step4.disclaimer}</p>
    </>
  );
}
