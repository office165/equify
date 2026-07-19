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

export type Step4SubmitPhase =
  | 'idle'
  | 'validating-vip'
  | 'redirecting-paypal'
  | 'computing';

export interface Step4GoalProps {
  onBack: () => void;
  onGenerate: (promoCode: string) => void | Promise<void>;
  isSubmitting?: boolean;
  submitPhase?: Step4SubmitPhase;
  submitError?: string | null;
  promoNotice?: string | null;
}

export function Step4Goal({
  onBack,
  onGenerate,
  isSubmitting,
  submitPhase = 'idle',
  submitError,
  promoNotice,
}: Step4GoalProps) {
  const { shell, steps: t, isHe } = useEquifyStrings();
  const { state, setGoal, setAgreedToTerms } = useWizardValuation();
  const [shake, setShake] = React.useState(false);
  const [showPromoInput, setShowPromoInput] = React.useState(false);
  const [promoCode, setPromoCode] = React.useState('');
  const [termsError, setTermsError] = React.useState<string | null>(null);
  const backLabel = isHe ? `→ ${t.common.back}` : `← ${t.common.back}`;

  const handleGenerate = () => {
    if (!state.agreedToTerms) {
      setTermsError(t.step4.termsRequired);
      setShake(true);
      window.setTimeout(() => setShake(false), 500);
      return;
    }
    setTermsError(null);
    void onGenerate(promoCode);
  };

  const submitLabel = (() => {
    if (!isSubmitting) return t.step4.generate;
    if (submitPhase === 'validating-vip') return t.step4.validatingVip;
    if (submitPhase === 'redirecting-paypal') return t.step4.redirectingPaypal;
    return t.step4.computing;
  })();

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
                onChange={(e) => {
                  setAgreedToTerms(e.target.checked);
                  if (e.target.checked) setTermsError(null);
                }}
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
            {termsError ? (
              <p className="v-msg err show promo-terms-error" role="alert">
                {termsError}
              </p>
            ) : null}
          </div>
        </div>

        <div className="promo-gate rv">
          {!showPromoInput ? (
            <button
              type="button"
              className="promo-gate-toggle"
              onClick={() => setShowPromoInput(true)}
            >
              {t.step4.promoToggle}
            </button>
          ) : (
            <div className="promo-gate-panel">
              <input
                type="text"
                className="promo-gate-input"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder={t.step4.promoPlaceholder}
                autoComplete="off"
                spellCheck={false}
                dir="ltr"
                aria-label={t.step4.promoPlaceholder}
              />
              {promoNotice ? (
                <p
                  className="promo-gate-ok"
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: 'rgba(0, 194, 184, 0.85)',
                  }}
                  role="status"
                >
                  {promoNotice}
                </p>
              ) : null}
            </div>
          )}
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
          {submitLabel} {!isSubmitting && (isHe ? '←' : '→')}
        </button>
      </div>

      <p className="disclaimer">{t.step4.disclaimer}</p>
    </>
  );
}
