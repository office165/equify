'use client';

import React from 'react';
import { fmtEquitySidebarM, fmtK } from '../../../../lib/valuation';
import { SmartSlider } from '../../ui/SmartSlider';
import { useWizardValuation } from '../WizardValuationContext';

export interface Step2FinancialsProps {
  onBack: () => void;
  onNext: () => void;
}

export function Step2Financials({ onBack, onNext }: Step2FinancialsProps) {
  const { state, computed, scenarios, updateFinancials, updateProfile } =
    useWizardValuation();
  const { financials, profile } = state;

  const maxEv = Math.max(computed.dcf, computed.ebtMult, computed.revMult, 1);
  const barPct = (v: number) => `${(v / maxEv) * 90}%`;
  const qsArc = (computed.qs / 100) * 163.4;

  return (
    <>
      <div className="pane-eyebrow rv">שלב 2 · נתונים פיננסיים</div>
      <h2 className="pane-title rv">
        המספרים שמפעילים <span className="hl">את המודל.</span>
      </h2>
      <p className="pane-sub rv">
        כל שינוי מחשב מחדש את השווי בזמן אמת — ראה את הפאנל משמאל מתעדכן.
      </p>

      <div className="fin-layout">
        <div className="fin-sliders stagger">
          <SmartSlider
            label="הכנסות שנתיות"
            value={financials.rev}
            min={500}
            max={200000}
            step={500}
            unit="₪K"
            required
            ariaLabel="הכנסות שנתיות"
            minLabel="₪500K"
            maxLabel="₪200M"
            onChange={(v) => updateFinancials({ rev: v })}
          />
          <SmartSlider
            label="שיעור EBITDA"
            value={financials.margin}
            min={0}
            max={60}
            step={1}
            unit="%"
            required
            ariaLabel="EBITDA"
            minLabel="0%"
            maxLabel="60%"
            onChange={(v) => updateFinancials({ margin: v })}
          />
          <SmartSlider
            label="צמיחה שנתית צפויה"
            value={financials.growth}
            min={-10}
            max={50}
            step={1}
            unit="%"
            required
            ariaLabel="צמיחה"
            minLabel="−10%"
            maxLabel="+50%"
            onChange={(v) => updateFinancials({ growth: v })}
          />
          <SmartSlider
            label="חוב נטו"
            value={financials.debt}
            min={0}
            max={50000}
            step={100}
            unit="₪K"
            ariaLabel="חוב נטו"
            minLabel="₪0"
            maxLabel="₪50M"
            onChange={(v) => updateFinancials({ debt: v })}
          />

          <div className="fgroup two" style={{ marginTop: 8 }}>
            <div className="field">
              <label>מטבע דיווח</label>
              <select
                className="sel"
                value={profile.currency}
                onChange={(e) =>
                  updateProfile({
                    currency: e.target.value as 'ILS' | 'USD' | 'EUR',
                  })
                }
              >
                <option value="ILS">₪ שקל (ILS)</option>
                <option value="USD">$ דולר (USD)</option>
                <option value="EUR">€ אירו (EUR)</option>
              </select>
            </div>
            <div className="field">
              <label>שנת דיווח אחרונה</label>
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
          <div className="cl-hd">שווי לבעלים · LIVE</div>
          <div className="cl-val mono">{fmtEquitySidebarM(computed.equity)}</div>
          <div className="cl-models">
            <div className="cl-row">
              <span>DCF</span>
              <div className="cl-bar-wrap">
                <div className="cl-bar-fill" style={{ width: barPct(computed.dcf) }} />
              </div>
              <b className="mono">{fmtK(computed.dcf)}</b>
            </div>
            <div className="cl-row">
              <span>EBITDA ×</span>
              <div className="cl-bar-wrap">
                <div
                  className="cl-bar-fill"
                  style={{ width: barPct(computed.ebtMult) }}
                />
              </div>
              <b className="mono">{fmtK(computed.ebtMult)}</b>
            </div>
            <div className="cl-row">
              <span>Revenue ×</span>
              <div className="cl-bar-wrap">
                <div
                  className="cl-bar-fill"
                  style={{ width: barPct(computed.revMult) }}
                />
              </div>
              <b className="mono">{fmtK(computed.revMult)}</b>
            </div>
          </div>
          <div className="scen-row">
            <div className="scen-badge bear">
              <span style={{ color: 'var(--dim)', fontSize: 10 }}>Bear</span>
              <span className="sv mono">{fmtK(scenarios.bearEq)}</span>
            </div>
            <div className="scen-badge base">
              <span style={{ color: 'var(--dim)', fontSize: 10 }}>Base</span>
              <span className="sv mono">{fmtK(scenarios.baseEq)}</span>
            </div>
            <div className="scen-badge bull">
              <span style={{ color: 'var(--dim)', fontSize: 10 }}>Bull</span>
              <span className="sv mono">{fmtK(scenarios.bullEq)}</span>
            </div>
          </div>
          <div className="qs-wrap">
            <div className="qs-ring" style={{ width: 64, height: 64 }}>
              <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  fill="none"
                  stroke="#0F2E29"
                  strokeWidth="6"
                />
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
              <div className="qs-label">Quality Score</div>
            </div>
          </div>
        </div>
      </div>

      <div className="nav-row rv">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          → חזרה
        </button>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          המשך לסיכון <span className="arr">←</span>
        </button>
      </div>
    </>
  );
}
