'use client';

import React from 'react';
import type { EquifyGoalKey } from '../../../../lib/valuation';
import { useWizardValuation } from '../WizardValuationContext';

const GOALS: { key: EquifyGoalKey; icon: string; name: string; desc: string }[] =
  [
    {
      key: 'negotiation',
      icon: '🤝',
      name: 'משא ומתן אסטרטגי',
      desc: 'מכירת החברה, מיזוג, רכישה',
    },
    {
      key: 'fundraise',
      icon: '💰',
      name: 'גיוס הון',
      desc: 'VCs, Angels, קרנות',
    },
    {
      key: 'partner',
      icon: '👥',
      name: 'שותפות עסקית',
      desc: 'הכנסת שותף, חלוקת מניות',
    },
    {
      key: 'bank',
      icon: '🏦',
      name: 'מימון בנקאי',
      desc: 'הלוואות, ערבויות, אשראי',
    },
    {
      key: 'internal',
      icon: '📊',
      name: 'שימוש פנימי',
      desc: 'אסטרטגיה, דיווח, תכנון',
    },
    {
      key: 'legal',
      icon: '⚖️',
      name: 'הליך משפטי / ירושה',
      desc: 'גירושין, עיזבון, בוררות',
    },
  ];

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
  const { state, setGoal, setAgreedToTerms } = useWizardValuation();
  const [shake, setShake] = React.useState(false);

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
        <div className="pane-eyebrow rv">שלב 4 · מטרת ההערכה</div>
        <h2 className="pane-title rv">
          להשתמש בדוח <span className="hl">לשם מה?</span>
        </h2>
        <p className="pane-sub rv">
          המטרה קובעת את הדגשים, הניסוח ורמת הפירוט בדוח ה-PDF.
        </p>

        <div className="goals stagger" role="group" aria-label="מטרת ההערכה">
          {GOALS.map((g) => (
            <button
              key={g.key}
              type="button"
              className={`goal-card${state.goal === g.key ? ' on' : ''}`}
              onClick={() => setGoal(g.key)}
            >
              <div className="gc-check">✓</div>
              <div className="gc-icon">{g.icon}</div>
              <div className="gc-name">{g.name}</div>
              <div className="gc-desc">{g.desc}</div>
            </button>
          ))}
        </div>

        <div className="fgroup" style={{ marginTop: 28 }}>
          <div className="field">
            <label>הסכמה לתנאי שימוש <span className="req">*</span></label>
            <label className="agree-box">
              <input
                type="checkbox"
                checked={state.agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
              />
              <span>
                קראתי והסכמתי כי equify BY SBC מספקת{' '}
                <b>אינדיקציית שווי אלגוריתמית בלבד</b> ואינה ייעוץ השקעות או
                חוות דעת חשבונאית.
              </span>
            </label>
          </div>
        </div>

        {submitError && (
          <p className="v-msg err show" style={{ marginTop: 12 }}>
            {submitError}
          </p>
        )}
      </div>

      <div className="nav-row rv">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          → חזרה
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'מפיק דוח...' : 'הפק דוח PDF ←'}
        </button>
      </div>

      <p className="disclaimer">
        הערכה זו הינה אינדיקציה אלגוריתמית בלבד. אין לראות בה ייעוץ השקעות,
        ייעוץ פיננסי, חוות דעת חשבונאית או תחליף להערכת שווי מקצועית. © 2026
        equify BY SBC.
      </p>
    </>
  );
}
