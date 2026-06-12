'use client';

import React, { useCallback, useRef, useState } from 'react';
import type { EquifyLifecycleKey, EquifySectorKey } from '../../../../lib/valuation';
import { useWizardValuation } from '../WizardValuationContext';

const SECTORS: { key: EquifySectorKey; label: string }[] = [
  { key: 'saas', label: 'הייטק / SaaS' },
  { key: 'fintech', label: 'פינטק' },
  { key: 'cyber', label: 'סייבר' },
  { key: 'health', label: 'רפואה / Biotech' },
  { key: 'services', label: 'שירותים מקצועיים' },
  { key: 'industry', label: 'תעשייה' },
  { key: 'ecom', label: 'קמעונאות / איקומרס' },
  { key: 'energy', label: 'אנרגיה' },
  { key: 'other', label: 'אחר' },
];

const LIFECYCLES: {
  key: EquifyLifecycleKey;
  icon: string;
  name: string;
  desc: string;
}[] = [
  { key: 'seed', icon: '🌱', name: 'Seed', desc: 'לפני הכנסות' },
  { key: 'early', icon: '🚀', name: 'Early Stage', desc: 'PMF ראשוני' },
  { key: 'growth', icon: '📈', name: 'Growth', desc: 'האצת מכירות' },
  { key: 'mature', icon: '🏛️', name: 'Mature', desc: 'תזרים יציב' },
];

export interface Step1ProfileProps {
  onNext: () => void;
}

export function Step1Profile({ onNext }: Step1ProfileProps) {
  const { state, updateProfile, setSector, setLifecycle } = useWizardValuation();
  const { profile } = state;
  const fileRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const validate = useCallback(() => {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nextErrors: Record<string, boolean> = {
      name: !profile.fullName.trim(),
      email: !emailRe.test(profile.userEmail),
      phone: !profile.userMobilePhone.trim(),
      company: !profile.companyName.trim(),
      sector: !profile.sector,
    };
    setErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  }, [profile]);

  const handleNext = useCallback(() => {
    if (validate()) onNext();
  }, [onNext, validate]);

  const handleLogo = useCallback(
    (file: File | null) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        updateProfile({ customLogoDataUrl: String(reader.result ?? '') });
      };
      reader.readAsDataURL(file);
    },
    [updateProfile],
  );

  return (
    <>
      <div className="pane-eyebrow rv">שלב 1 · פרופיל החברה</div>
      <h1 className="pane-title rv">
        ספר לנו על <span className="hl">העסק שלך.</span>
      </h1>
      <p className="pane-sub rv">
        הפרטים מגדירים את ההקשר המשפטי והעסקי של הדוח.
      </p>

      <div className="fgroup two stagger">
        <div className="field">
          <label>שם מלא <span className="req">*</span></label>
          <input
            className={`inp${errors.name ? ' err' : profile.fullName ? ' ok' : ''}`}
            type="text"
            placeholder="ישראל ישראלי"
            autoComplete="name"
            value={profile.fullName}
            onChange={(e) => updateProfile({ fullName: e.target.value })}
          />
          {errors.name && <span className="v-msg err show">נא להזין שם מלא</span>}
        </div>
        <div className="field">
          <label>אימייל <span className="req">*</span></label>
          <input
            className={`inp${errors.email ? ' err' : profile.userEmail ? ' ok' : ''}`}
            type="email"
            placeholder="your@company.co.il"
            value={profile.userEmail}
            onChange={(e) => updateProfile({ userEmail: e.target.value })}
          />
          {errors.email && (
            <span className="v-msg err show">כתובת אימייל לא תקינה</span>
          )}
        </div>
        <div className="field">
          <label>טלפון / WhatsApp <span className="req">*</span></label>
          <input
            className={`inp${errors.phone ? ' err' : profile.userMobilePhone ? ' ok' : ''}`}
            type="tel"
            placeholder="050-0000000"
            dir="ltr"
            value={profile.userMobilePhone}
            onChange={(e) => updateProfile({ userMobilePhone: e.target.value })}
          />
          <span className="hint">הדוח יישלח לכאן ב-WhatsApp</span>
        </div>
        <div className="field">
          <label>שם חברה <span className="req">*</span></label>
          <input
            className={`inp${errors.company ? ' err' : profile.companyName ? ' ok' : ''}`}
            type="text"
            placeholder='אוריון טכנולוגיות בע"מ'
            value={profile.companyName}
            onChange={(e) => updateProfile({ companyName: e.target.value })}
          />
        </div>
        <div className="field">
          <label>ח.פ / ת.ז</label>
          <input
            className="inp"
            type="text"
            placeholder="51-623-4187"
            dir="ltr"
            value={profile.userCorporateTaxId || profile.userNationalId}
            onChange={(e) =>
              updateProfile({
                userCorporateTaxId: e.target.value,
                userNationalId: e.target.value,
              })
            }
          />
        </div>
        <div className="field">
          <label>שנת הקמה</label>
          <input
            className="inp"
            type="number"
            placeholder="2018"
            min={1900}
            max={2026}
            dir="ltr"
            value={profile.foundedYear}
            onChange={(e) => updateProfile({ foundedYear: e.target.value })}
          />
        </div>
      </div>

      <div className="fgroup stagger" style={{ marginTop: 28 }}>
        <div className="field">
          <label>ענף פעילות <span className="req">*</span></label>
          <div className="chips" role="group" aria-label="בחר ענף">
            {SECTORS.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`chip${profile.sector === s.key ? ' on' : ''}`}
                onClick={() => setSector(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>שלב מחזור חיים <span className="req">*</span></label>
          <div className="lifecycle" role="group" aria-label="שלב חיים">
            {LIFECYCLES.map((lc) => (
              <button
                key={lc.key}
                type="button"
                className={`lc-card${profile.lifecycle === lc.key ? ' on' : ''}`}
                onClick={() => setLifecycle(lc.key)}
              >
                <div className="lc-icon">{lc.icon}</div>
                <div className="lc-name">{lc.name}</div>
                <div className="lc-desc">{lc.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>לוגו חברה (אופציונלי)</label>
          <div
            className="upload-zone"
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
          >
            <div className="uz-icon">📎</div>
            <div className="uz-txt">
              גרור לכאן או <b>לחץ להעלאה</b> · PNG/JPG
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => handleLogo(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      <div className="nav-row rv">
        <span style={{ fontSize: 13, color: 'var(--dim)' }}>* שדות חובה</span>
        <button type="button" className="btn btn-primary" onClick={handleNext}>
          המשך לנתונים פיננסיים <span className="arr">←</span>
        </button>
      </div>
    </>
  );
}
