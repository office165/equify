'use client';

import React, { useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ValuationLocale } from '../../../api_client';
import { saveEquifyWizardState } from '../../../lib/wizard/equify_storage';
import { mapEquifyToWizardFormValues } from '../../../lib/wizard/map_equify_wizard';
import { fmtEquitySidebarM, fmtK } from '../../../lib/valuation';
import { useReducedMotion } from '../../landing/motion/useReducedMotion';
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

const STEPS = [
  { num: '01', label: 'פרופיל החברה', desc: 'פרטים משפטיים ועסקיים' },
  { num: '02', label: 'נתונים פיננסיים', desc: 'הכנסות, EBITDA, תחזית' },
  { num: '03', label: 'סיכון ורגישות', desc: 'מאפייני עסק ואיכות' },
  { num: '04', label: 'מטרת ההערכה', desc: 'הפקת דוח PDF' },
];

export interface EquifyWizardProps {
  onRunValuation?: (
    values: ReturnType<typeof mapEquifyToWizardFormValues>,
    options?: { locale?: ValuationLocale },
  ) => Promise<void>;
  isSubmitting?: boolean;
  submitError?: string | null;
  locale?: ValuationLocale;
}

function EquifyWizardShell({
  onRunValuation,
  isSubmitting,
  submitError,
  locale = 'he',
}: EquifyWizardProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const topbarRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { step, setStep, computed, state } = useWizardValuation();
  useWizardBgCanvas(canvasRef, { reducedMotion });
  useWizardStepMotion(step, reducedMotion, topbarRef);

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
        await onRunValuation(formValues, { locale });
      } catch {
        return;
      }
    }

    router.push('/results');
  }, [locale, onRunValuation, router, state]);

  return (
    <div className="equify-wizard" dir="rtl" lang="he">
      <canvas ref={canvasRef} id="bg-canvas" aria-hidden="true" />

      <div className="shell">
        <aside className="sidebar">
          <Link href="/" className="logo" aria-label="equify BY SBC — דף הבית">
            <span className="lg">
              equify<em>.</em>
            </span>
            <small>BY SBC</small>
          </Link>

          <nav className="steps" aria-label="שלבי האשף">
            {STEPS.map((s, i) => {
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
              <span>שווי לבעלים</span>
              <span className="lv-dot" />
            </div>
            <div className="lv-val mono">{fmtEquitySidebarM(computed.equity)}</div>
            <div className="lv-sub">תרחיש בסיס · מתעדכן בזמן אמת</div>
            <div className="lv-rows">
              <div className="lv-row">
                <span>DCF (50%)</span>
                <b className="mono">{fmtK(computed.dcf)}</b>
              </div>
              <div className="lv-row">
                <span>EBITDA ×(30%)</span>
                <b className="mono">{fmtK(computed.ebtMult)}</b>
              </div>
              <div className="lv-row">
                <span>הכנסות ×(20%)</span>
                <b className="mono">{fmtK(computed.revMult)}</b>
              </div>
              <div className="lv-row hl">
                <span>שווי פעילות</span>
                <b className="mono">{fmtK(computed.ev)}</b>
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
              שלב <b>{step}</b> / 4
            </span>
            {step > 1 && (
              <button
                type="button"
                className="back-btn"
                onClick={() => goStep(Math.max(1, step - 1))}
              >
                → חזרה
              </button>
            )}
          </div>

          <section
            key={step}
            className="pane active"
            aria-label={`שלב ${step}`}
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
          <span className="m-bar-label">שווי לבעלים</span>
          <span className="m-bar-val mono">{fmtEquitySidebarM(computed.equity)}</span>
        </div>
        <span className="m-bar-step">
          שלב <b>{step}</b>/4
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
