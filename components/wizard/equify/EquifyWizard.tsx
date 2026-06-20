'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ValuationLocale } from '../../../api_client';
import { saveEquifyWizardState } from '../../../lib/wizard/equify_storage';
import {
  getEquifyWizardCopy,
  getEquifyWizardSteps,
} from '../../../lib/wizard/equify_wizard_copy';
import { mapEquifyToWizardFormValues, type EquifyWizardState } from '../../../lib/wizard/map_equify_wizard';
import { resolveDisplayCompanyName } from '../../../lib/wizard/resolve_company_display';
import { fmtEquitySidebarM, fmtK } from '../../../lib/valuation';
import { EquifyLanguageToggle } from '../../shared/EquifyLanguageToggle';
import { useReducedMotion } from '../../landing/motion/useReducedMotion';
import { useValuationI18n } from '../../../valuation_i18n';
import { Step1Profile } from './steps/Step1Profile';
import { Step2Financials } from './steps/Step2Financials';
import { Step3Risk } from './steps/Step3Risk';
import { Step4Goal } from './steps/Step4Goal';
import {
  useWizardValuation,
  WizardValuationProvider,
} from './WizardValuationContext';
import { useWizardBgCanvas } from './hooks/useWizardBgCanvas';
import { useWizardStepMotion } from './hooks/useWizardStepMotion';
import './wizard-equify.css';

export interface EquifyWizardProps {
  onRunValuation?: (
    values: ReturnType<typeof mapEquifyToWizardFormValues>,
    options?: { locale?: ValuationLocale; equifyState?: EquifyWizardState },
  ) => Promise<void>;
  isSubmitting?: boolean;
  submitError?: string | null;
  locale?: ValuationLocale;
}

function EquifyWizardShell({
  onRunValuation,
  isSubmitting,
  submitError,
  locale: localeProp,
}: EquifyWizardProps) {
  const router = useRouter();
  const { locale: ctxLocale } = useValuationI18n();
  const locale = localeProp ?? ctxLocale;
  const isHe = locale === 'he';
  const copy = getEquifyWizardCopy(locale);
  const steps = getEquifyWizardSteps(locale);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const topbarRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<HTMLElement>(null);
  const [mounted, setMounted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const reducedMotion = useReducedMotion();
  const { step, setStep, computed, state } = useWizardValuation();
  const displayCompanyName = resolveDisplayCompanyName(state.profile.companyName, locale);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setRevealed(false);
  }, [step]);

  useWizardBgCanvas(canvasRef, { reducedMotion });
  useWizardStepMotion(step, reducedMotion, topbarRef, paneRef, () => {
    setRevealed(true);
  });

  const progressPct = ((step - 1) / 4) * 100;

  const goStep = useCallback(
    (n: number) => {
      if (n >= 1 && n <= 4) {
        setStep(n);
        window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
      }
    },
    [reducedMotion, setStep],
  );

  const handleGenerate = useCallback(async () => {
    const formValues = mapEquifyToWizardFormValues(state);
    saveEquifyWizardState(state);

    if (onRunValuation) {
      try {
        await onRunValuation(formValues, { locale, equifyState: state });
      } catch {
        return;
      }
    }

    router.push('/results');
  }, [locale, onRunValuation, router, state]);

  return (
    <div
      className={[
        'equify-wizard',
        mounted ? 'eqw-mounted' : '',
        mounted && !reducedMotion ? 'eqw-animate' : '',
        revealed ? 'eqw-revealed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      dir={isHe ? 'rtl' : 'ltr'}
      lang={isHe ? 'he' : 'en'}
    >
      <canvas ref={canvasRef} id="bg-canvas" aria-hidden="true" />

      <div className="shell">
        <aside className="sidebar">
          <Link href="/" className="logo" aria-label={copy.homeAria}>
            <span className="lg">
              equify<em>.</em>
            </span>
            <small>BY SBC</small>
          </Link>

          <nav className="steps" aria-label={copy.stepNavLabel}>
            {steps.map((s, i) => {
              const n = i + 1;
              const cls = [
                'stp',
                step === n ? 'active' : '',
                step > n && 'done',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <button
                  key={s.num}
                  type="button"
                  className={cls}
                  onClick={() => n < step && goStep(n)}
                  aria-current={step === n ? 'step' : undefined}
                >
                  <div className="stp-num">{s.num}</div>
                  <div className="stp-txt">
                    <div className="stp-label">{s.label}</div>
                    <div className="stp-desc">{s.desc}</div>
                  </div>
                </button>
              );
            })}
          </nav>

          <div className="lv-panel">
            <div className="lv-top">
              <span>{copy.ownerValue}</span>
              <span className="lv-dot" />
            </div>
            <div className="lv-val mono">{fmtEquitySidebarM(computed.equity, locale)}</div>
            <div className="lv-sub">{copy.liveUpdating}</div>
            {displayCompanyName ? (
              <div className="lv-sub" style={{ marginTop: 4, opacity: 0.85 }}>
                {displayCompanyName}
              </div>
            ) : null}
            <div className="lv-rows">
              <div className="lv-row">
                <span>{copy.dcfWeight}</span>
                <b className="mono">{fmtK(computed.dcf, locale)}</b>
              </div>
              <div className="lv-row">
                <span>{copy.ebitdaWeight}</span>
                <b className="mono">{fmtK(computed.ebtMult, locale)}</b>
              </div>
              <div className="lv-row">
                <span>{copy.revWeight}</span>
                <b className="mono">{fmtK(computed.revMult, locale)}</b>
              </div>
              <div className="lv-row hl">
                <span>{copy.enterpriseValue}</span>
                <b className="mono">{fmtK(computed.ev, locale)}</b>
              </div>
            </div>
          </div>
        </aside>

        <main className="main">
          <div className="prog-bar">
            <div className="prog-fill" style={{ width: `${progressPct}%` }} />
          </div>

          <div className="topbar" ref={topbarRef}>
            <span className="step-badge">
              {copy.stepBadge} <b>{step}</b> {copy.stepOf}
            </span>
            <div className="topbar-actions">
              <EquifyLanguageToggle />
              {step > 1 && (
                <button
                  type="button"
                  className="back-btn"
                  onClick={() => goStep(Math.max(1, step - 1))}
                >
                  {isHe ? `→ ${copy.backBtn}` : `← ${copy.backBtn}`}
                </button>
              )}
            </div>
          </div>

          <nav className="wizard-rail" aria-label={copy.stepNavLabel}>
            {steps.map((s, i) => {
              const n = i + 1;
              const cls = [
                'wizard-rail-btn',
                step === n ? 'on' : '',
                step > n ? 'done' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <button
                  key={s.num}
                  type="button"
                  className={cls}
                  onClick={() => n <= step && goStep(n)}
                  aria-label={`${s.label} — ${s.desc}`}
                  aria-current={step === n ? 'step' : undefined}
                />
              );
            })}
          </nav>

          <section
            key={step}
            ref={paneRef}
            className="pane active"
            aria-label={`${copy.stepBadge} ${step}`}
          >
            {step === 1 && <Step1Profile onNext={() => goStep(2)} />}
            {step === 2 && (
              <Step2Financials
                onBack={() => goStep(1)}
                onNext={() => goStep(3)}
              />
            )}
            {step === 3 && (
              <Step3Risk onBack={() => goStep(2)} onNext={() => goStep(4)} />
            )}
            {step === 4 && (
              <Step4Goal
                onBack={() => goStep(3)}
                onGenerate={handleGenerate}
                isSubmitting={isSubmitting}
                submitError={submitError}
              />
            )}
          </section>
        </main>
      </div>

      <div className="m-bar" aria-hidden={false}>
        <div className="m-bar-live">
          <span className="m-bar-label">{copy.ownerValue}</span>
          <span className="m-bar-val mono">{fmtEquitySidebarM(computed.equity, locale)}</span>
        </div>
        <span className="m-bar-step">
          {copy.stepBadge} <b>{step}</b>{copy.stepOf}
        </span>
      </div>
    </div>
  );
}

export default function EquifyWizard(props: EquifyWizardProps) {
  return (
    <WizardValuationProvider>
      <EquifyWizardShell {...props} />
    </WizardValuationProvider>
  );
}
