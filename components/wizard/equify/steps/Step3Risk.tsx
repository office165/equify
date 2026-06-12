'use client';

import React from 'react';
import { SmartSlider } from '../../ui/SmartSlider';
import { useWizardValuation } from '../WizardValuationContext';

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
  const { state, updateRisk, updateProfile } = useWizardValuation();
  const { risk, profile } = state;

  return (
    <>
      <div className="pane-eyebrow rv">שלב 3 · סיכון ורגישות</div>
      <h2 className="pane-title rv">
        מה <span className="hl">מייחד את העסק שלך.</span>
      </h2>
      <p className="pane-sub rv">
        הגורמים האיכותיים שמכיילים את עלות ההון ואת מכפיל האיכות.
      </p>

      <div className="fgroup stagger">
        <div className="risk-section">
          <h4>הכנסות ויציבות</h4>
          <div className="risk-fields">
            <SmartSlider
              label="הכנסות חוזרות (MRR/ARR)"
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
              label="ריכוז — לקוח הגדול ביותר"
              value={risk.topCustomer}
              min={0}
              max={100}
              step={5}
              unit="%"
              fillClassName="sn-fill-conc"
              minLabel="0% (פיזור מלא)"
              maxLabel="100% (לקוח יחיד)"
              onChange={(v) => updateRisk({ topCustomer: v })}
            />
          </div>
        </div>

        <div className="risk-section">
          <h4>ניהול ותחרות</h4>
          <div className="risk-fields">
            <ToggleRow
              label="תלות גבוהה במייסד / איש מפתח"
              hint="מוריד את ה-Quality Score"
              checked={risk.founderDep}
              onChange={(v) => updateRisk({ founderDep: v })}
            />
            <ToggleRow
              label="תחרות אינטנסיבית בשוק"
              hint="מעלה את פרמיית הסיכון"
              checked={risk.competition}
              onChange={(v) => updateRisk({ competition: v })}
            />
            <ToggleRow
              label="IP / קניין רוחני מוגן"
              hint="מעלה את המכפיל"
              checked={risk.ip}
              onChange={(v) => updateRisk({ ip: v })}
            />
            <ToggleRow
              label="חוזים עם לקוחות ארוכי-טווח"
              hint="מייצב תחזית התזרים"
              checked={risk.contracts}
              onChange={(v) => updateRisk({ contracts: v })}
            />
          </div>
        </div>

        <div className="field">
          <label>הערות / יתרון תחרותי ייחודי</label>
          <textarea
            className="textarea"
            placeholder="תאר את המעמד התחרותי, נכסים ייחודיים, חסמי כניסה..."
            value={profile.qualitativeDescription}
            onChange={(e) =>
              updateProfile({ qualitativeDescription: e.target.value })
            }
          />
        </div>
      </div>

      <div className="nav-row rv">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          → חזרה
        </button>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          המשך למטרת ההערכה <span className="arr">←</span>
        </button>
      </div>
    </>
  );
}
