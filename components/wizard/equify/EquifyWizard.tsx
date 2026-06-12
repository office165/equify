'use client';

import React, { useCallback, useRef, useState } from 'react';
import type { ValuationLocale } from '../../../api_client';
import { mapEquifyToWizardFormValues } from '../../../lib/wizard/map_equify_wizard';
import {
  fmtEquitySidebarM,
  fmtK,
} from '../../../lib/valuation';
import { useReducedMotion } from '../../landing/motion/useReducedMotion';
import { ResultsScreen } from './ResultsScreen';
import { Step1Profile } from './steps/Step1Profile';
import { Step2Financials } from './steps/Step2Financials';
import { Step3Risk } from './steps/Step3Risk';
import { Step4Goal } from './steps/Step4Goal';
import {
  useWizardValuation,
  WizardValuationProvider,
} from './WizardValuationContext';
import { useWizardBgCanvas } from './hooks/useWizardBgCanvas';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();
  useWizardBgCanvas(canvasRef, { reducedMotion });

  const {
    step,
    setStep,
    showResults,
    setShowResults,
    computed,
    resetWizard,
    state,
  } = useWizardValuation();

  const [pdfDownloading, setPdfDownloading] = useState(false);

  const progressPct = showResults ? 100 : ((step - 1) / 4) * 100;

  const goStep = useCallback(
    (n: number) => {
      if (n >= 1 && n <= 4) {
        setStep(n);
        setShowResults(false);
        window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
      }
    },
    [reducedMotion, setShowResults, setStep],
  );

  const handleGenerate = useCallback(async () => {
    setShowResults(true);
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });

    const formValues = mapEquifyToWizardFormValues(state);
    if (onRunValuation) {
      try {
        await onRunValuation(formValues, { locale });
      } catch {
        // שגיאה מוצגת ב-Step4Goal דרך submitError
      }
    }
  }, [locale, onRunValuation, reducedMotion, setShowResults, state]);

  const fetchPdf = useCallback(async () => {
    const res = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    });
    if (!res.ok) throw new Error('PDF generation failed');
    return res.blob();
  }, [state]);

  const handleDownloadPdf = useCallback(async () => {
    setPdfDownloading(true);
    try {
      const blob = await fetchPdf();
      const url = URL.createObjectURL(blob);
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      if (!opened) {
        const a = document.createElement('a');
        a.href = url;
        a.download = 'equify-valuation-report.pdf';
        a.rel = 'noopener';
        a.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      console.error('[wizard] PDF download failed', err);
    } finally {
      setPdfDownloading(false);
    }
  }, [fetchPdf]);

  const handleNewValuation = useCallback(() => {
    resetWizard();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [resetWizard]);

  return (
    <div className="equify-wizard" dir="rtl" lang="he">
      <canvas ref={canvasRef} id="bg-canvas" aria-hidden="true" />

      <div className="shell">
        <aside className="sidebar">
          <div className="logo">
            <span className="lg">
              equify<em>.</em>
            </span>
            <small>BY SBC</small>
          </div>

          <nav className="steps" aria-label="שלבי האשף">
            {STEPS.map((s, i) => {
              const n = i + 1;
              const cls = [
                'stp',
                step === n && !showResults ? 'active' : '',
                (step > n || showResults) && 'done',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <button
                  key={s.num}
                  type="button"
                  className={cls}
                  onClick={() => n < step && goStep(n)}
                  aria-current={step === n && !showResults ? 'step' : undefined}
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

          <div className="topbar">
            <span className="step-badge">
              שלב <b>{showResults ? '✓' : step}</b> / 4
            </span>
            {(step > 1 || showResults) && (
              <button
                type="button"
                className="back-btn"
                onClick={() =>
                  showResults ? goStep(4) : goStep(Math.max(1, step - 1))
                }
              >
                → חזרה
              </button>
            )}
          </div>

          {showResults ? (
            <ResultsScreen
              onDownloadPdf={handleDownloadPdf}
              onNewValuation={handleNewValuation}
              isDownloadingPdf={pdfDownloading}
            />
          ) : (
            <section className="pane active" aria-label={`שלב ${step}`}>
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
          )}
        </main>
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
