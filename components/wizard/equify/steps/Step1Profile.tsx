'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { EquifyLifecycleKey } from '../../../../lib/valuation';
import { SECTOR_SELECT_OPTIONS, coerceWizardSectorSelection, getSectorChipLabel, getSubSectorsForSector } from '../../../../lib/constants/industry_config';
import { useEquifyStrings } from '../../../../lib/i18n/use_equify_strings';
import { lockLeadPayload } from '../../../../lib/wizard/lead_wire';
import { mapEquifyToWizardFormValues } from '../../../../lib/wizard/map_equify_wizard';
import { scheduleWizardProgressSave } from '../../../../lib/wizard/wizard_progress_queue';
import { useWizardValuation } from '../WizardValuationContext';
import { IndustryInsightCard } from './IndustryInsightCard';
import { isAcceptedLogoFile, MAX_LOGO_BYTES } from '../../../../lib/utils/logo_data_url';
import {
  sanitizePhoneInput,
  validateStep1Phone,
} from '../../../../lib/wizard/step1_profile_schema';

const LIFECYCLES_HE: {
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

const LIFECYCLES_EN: {
  key: EquifyLifecycleKey;
  icon: string;
  name: string;
  desc: string;
}[] = [
  { key: 'seed', icon: '🌱', name: 'Seed', desc: 'Pre-revenue' },
  { key: 'early', icon: '🚀', name: 'Early Stage', desc: 'Initial PMF' },
  { key: 'growth', icon: '📈', name: 'Growth', desc: 'Sales acceleration' },
  { key: 'mature', icon: '🏛️', name: 'Mature', desc: 'Stable cash flow' },
];

export interface Step1ProfileProps {
  onNext: () => void;
}

export function Step1Profile({ onNext }: Step1ProfileProps) {
  const { shell, steps: t, isHe, locale } = useEquifyStrings();
  const sectors = useMemo(
    () =>
      SECTOR_SELECT_OPTIONS.map((s) => ({
        key: s.key,
        label: isHe ? s.labelHe : s.labelEn,
      })),
    [isHe],
  );
  const lifecycles = isHe ? LIFECYCLES_HE : LIFECYCLES_EN;
  const { state, updateProfile, setSector, setLifecycle } = useWizardValuation();
  const { profile } = state;
  const subSectors = getSubSectorsForSector(profile.sector);
  const showIndustryInsight = Boolean(profile.sector && profile.subSector);

  const handleSectorSelect = useCallback(
    (sector: typeof profile.sector) => {
      setSector(sector);
    },
    [setSector],
  );

  const handleSubSectorSelect = useCallback(
    (subSectorId: string) => {
      updateProfile({ subSector: subSectorId });
    },
    [updateProfile],
  );

  React.useEffect(() => {
    const coerced = coerceWizardSectorSelection(profile.sector, profile.subSector);
    if (
      coerced.sector !== profile.sector ||
      coerced.subSector !== profile.subSector
    ) {
      updateProfile(coerced);
    }
  }, [profile.sector, profile.subSector, updateProfile]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [logoError, setLogoError] = useState<string | null>(null);

  const validate = useCallback(() => {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nextErrors: Record<string, boolean> = {
      name: !profile.fullName.trim(),
      email: !emailRe.test(profile.userEmail),
      phone: validateStep1Phone(profile.userMobilePhone) !== null,
      companyName: !profile.companyName.trim(),
      sector: !profile.sector,
    };
    setErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  }, [profile]);

  const handleNext = useCallback(() => {
    if (!validate()) return;
    const formValues = mapEquifyToWizardFormValues(state);
    scheduleWizardProgressSave(lockLeadPayload(formValues, locale));
    onNext();
  }, [locale, onNext, state, validate]);

  const handleLogo = useCallback(
    (file: File | null) => {
      if (!file) return;
      setLogoError(null);
      if (!isAcceptedLogoFile(file)) {
        setLogoError(t.common.logoErrorType);
        return;
      }
      if (file.size > MAX_LOGO_BYTES) {
        setLogoError(t.common.logoErrorSize);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          updateProfile({ customLogoDataUrl: result });
        }
      };
      reader.readAsDataURL(file);
      if (fileRef.current) fileRef.current.value = '';
    },
    [t.common.logoErrorSize, t.common.logoErrorType, updateProfile],
  );

  const clearLogo = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setLogoError(null);
      updateProfile({ customLogoDataUrl: '' });
      if (fileRef.current) fileRef.current.value = '';
    },
    [updateProfile],
  );

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const sanitized = sanitizePhoneInput(e.target.value);
      updateProfile({ userMobilePhone: sanitized });
      if (errors.phone) {
        setErrors((prev) => ({ ...prev, phone: false }));
      }
    },
    [errors.phone, updateProfile],
  );

  return (
    <>
      <div className="pane-eyebrow rv">{shell.step1Eyebrow}</div>
      <h1 className="pane-title rv">
        {t.step1.titlePrefix}{' '}
        <span className="hl">{shell.step1TitleHl}</span>
      </h1>
      <p className="pane-sub rv">{shell.step1Sub}</p>

      <div className="fgroup two stagger">
        <div className="field">
          <label>
            {shell.fullName} <span className="req">*</span>
          </label>
          <input
            className={`inp${errors.name ? ' err' : profile.fullName ? ' ok' : ''}`}
            type="text"
            placeholder={t.common.placeholderName}
            autoComplete="name"
            value={profile.fullName}
            onChange={(e) => updateProfile({ fullName: e.target.value })}
          />
          {errors.name ? (
            <span className="v-msg err show">{t.common.errFullName}</span>
          ) : null}
        </div>
        <div className="field">
          <label>
            {shell.email} <span className="req">*</span>
          </label>
          <input
            className={`inp${errors.email ? ' err' : profile.userEmail ? ' ok' : ''}`}
            type="email"
            placeholder="your@company.co.il"
            value={profile.userEmail}
            onChange={(e) => updateProfile({ userEmail: e.target.value })}
          />
          {errors.email ? (
            <span className="v-msg err show">{t.common.errEmail}</span>
          ) : null}
        </div>
        <div className="field">
          <label>
            {shell.phone} <span className="req">*</span>
          </label>
          <input
            className={`inp${errors.phone ? ' err' : profile.userMobilePhone ? ' ok' : ''}`}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="050-0000000"
            dir="ltr"
            value={profile.userMobilePhone}
            onChange={handlePhoneChange}
          />
          {errors.phone ? (
            <span className="v-msg err show">{t.common.errPhone}</span>
          ) : null}
        </div>
        <div className="field">
          <label>
            {shell.companyName} <span className="req">*</span>
          </label>
          <input
            className={`inp${errors.companyName ? ' err' : profile.companyName ? ' ok' : ''}`}
            type="text"
            placeholder={shell.companyPlaceholder}
            value={profile.companyName}
            onChange={(e) => updateProfile({ companyName: e.target.value })}
          />
          {errors.companyName ? (
            <span className="v-msg err show">{t.common.errCompanyName}</span>
          ) : null}
        </div>
        <div className="field">
          <label>{shell.corporateId}</label>
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
          <label>{shell.foundedYear}</label>
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
          <label>
            {shell.sector} <span className="req">*</span>
          </label>
          <div className="chips" role="group" aria-label={t.common.selectSector}>
            {sectors.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`chip${profile.sector === s.key ? ' on' : ''}`}
                onClick={() => handleSectorSelect(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {subSectors.length > 0 ? (
          <div className="field">
            <label>
              {t.common.subSector} <span className="req">*</span>
            </label>
            <div
              className="chips chips-sub-sectors"
              role="group"
              aria-label={t.common.selectSubSector}
              dir={isHe ? 'rtl' : 'ltr'}
            >
              {subSectors.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`chip${profile.subSector === s.id ? ' on' : ''}`}
                  onClick={() => handleSubSectorSelect(s.id)}
                  dir={isHe ? 'rtl' : 'ltr'}
                  lang={isHe ? 'he' : 'en'}
                >
                  {getSectorChipLabel(profile.sector, locale)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {showIndustryInsight ? (
          <IndustryInsightCard
            sector={profile.sector}
            subSector={profile.subSector}
            locale={locale}
            copy={t.step1.industryInsight}
          />
        ) : null}

        <div className="field">
          <label>
            {shell.lifecycle} <span className="req">*</span>
          </label>
          <div className="lifecycle" role="group" aria-label={t.common.lifecycleGroup}>
            {lifecycles.map((lc) => (
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
          <label>{shell.logo}</label>
          <div
            className={`upload-zone${profile.customLogoDataUrl ? ' has-logo' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
          >
            {profile.customLogoDataUrl ? (
              <div className="upload-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.customLogoDataUrl}
                  alt=""
                  className="upload-thumb"
                />
                <button
                  type="button"
                  className="upload-remove"
                  onClick={clearLogo}
                >
                  {t.common.logoRemove}
                </button>
              </div>
            ) : (
              <>
                <div className="uz-icon">📎</div>
                <div className="uz-txt">{t.common.uploadLogo}</div>
              </>
            )}
          </div>
          {logoError ? (
            <span className="v-msg err show">{logoError}</span>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
            hidden
            onChange={(e) => handleLogo(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      <div className="nav-row rv">
        <span style={{ fontSize: 13, color: 'var(--dim)' }}>{t.common.requiredFields}</span>
        <button type="button" className="btn btn-primary" onClick={handleNext}>
          {t.common.nextFinancials} <span className="arr">{isHe ? '←' : '→'}</span>
        </button>
      </div>
    </>
  );
}
