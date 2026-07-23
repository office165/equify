'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { ValuationLocale } from '../../../api_client';
import { postMondayLeadUpdate } from '../../../lib/crm/update_lead_monday_client';
import { readLeadSession } from '../../../lib/crm/lead_session';
import {
  buildEquifyValuationSnapshot,
  persistEquifyValuationState,
} from '../../../lib/wizard/equify_valuation_persistence';
import { saveEquifyWizardState } from '../../../lib/wizard/equify_storage';
import {
  getEquifyWizardCopy,
  getEquifyWizardSteps,
} from '../../../lib/wizard/equify_wizard_copy';
import { mapEquifyToWizardFormValues, type EquifyWizardState } from '../../../lib/wizard/map_equify_wizard';
import { resolveDisplayCompanyName } from '../../../lib/wizard/resolve_company_display';
import {
  formatLiveAmountEmpty,
  hasMeaningfulFinancialInputs,
} from '../../../lib/wizard/financial_input_state';
import { fmtEquitySidebarM } from '../../../lib/valuation';
import { useReportingCurrency } from './WizardValuationContext';
import { EquifyLanguageToggle } from '../../shared/EquifyLanguageToggle';
import { EquifyLogo } from '../../brand/EquifyLogo';
import { useReducedMotion } from '../../landing/motion/useReducedMotion';
import { useValuationI18n } from '../../../valuation_i18n';
import { Step1Profile } from './steps/Step1Profile';
import { Step2Financials } from './steps/Step2Financials';
import { Step3Risk } from './steps/Step3Risk';
import { Step4Goal, type Step4SubmitPhase } from './steps/Step4Goal';
import { LiveValuationCard } from './LiveValuationCard';
import {
  useWizardValuation,
  WizardValuationProvider,
} from './WizardValuationContext';
import { postValidatePromoCode } from '../../../lib/payments/promo_client';
import { postEnsureWizardUser } from '../../../lib/payments/ensure_wizard_user_client';
import { HOSTED_BUTTON_ID_FULL } from '../../../lib/payments/paypal_hosted_button_ids';
import { normalizePromoCode } from '../../../lib/wizard/vip_promo';
import { EQUIFY_DISPATCH_TOKEN_KEY } from '../../../lib/payments/dispatch_token_storage';
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
  const [localSubmitting, setLocalSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<Step4SubmitPhase>('idle');
  const [localSubmitError, setLocalSubmitError] = useState<string | null>(null);
  const [promoNotice, setPromoNotice] = useState<string | null>(null);
  const [hostedButtonId, setHostedButtonId] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const { step, setStep, computed, state } = useWizardValuation();
  const { reportingCurrency } = useReportingCurrency();
  const displayCompanyName = resolveDisplayCompanyName(state.profile.companyName, locale);
  const hasLiveFinancials = hasMeaningfulFinancialInputs(state.financials);

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
        if (step === 2 && n === 3 && !hasMeaningfulFinancialInputs(state.financials)) {
          return;
        }
        setStep(n);
        window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
      }
    },
    [reducedMotion, setStep, state.financials, step],
  );

  const handleGenerate = useCallback(
    async (promoCode: string) => {
      const normalizedPromo = normalizePromoCode(promoCode);
      const leadSession = readLeadSession();
      setLocalSubmitError(null);
      setPromoNotice(null);
      setHostedButtonId(null);

      let freeDispatchToken: string | null = null;

      if (normalizedPromo) {
        setLocalSubmitting(true);
        setSubmitPhase('validating-vip');
        const validated = await postValidatePromoCode({
          code: normalizedPromo,
          email: state.profile.userEmail,
        });
        if (!validated.valid || !validated.dispatchToken) {
          if (validated.reason === 'server_error') {
            setLocalSubmitError(
              isHe
                ? 'שגיאת שרת זמנית — נסו שוב בעוד רגע'
                : 'Temporary server error — please try again',
            );
          } else {
            setLocalSubmitError(isHe ? 'הקוד אינו תקף' : 'Invalid code');
          }
          // Fall through to FULL PayPal — never PROMO / never free without server token.
        } else {
          freeDispatchToken = validated.dispatchToken;
        }
      }

      if (freeDispatchToken) {
        const snapshot = buildEquifyValuationSnapshot(state, computed, {
          promoCode: normalizedPromo || null,
          paymentPath: 'promo_free',
          mondayStatus: 'Free promo redeemed',
        });
        persistEquifyValuationState(snapshot);
        saveEquifyWizardState(state);

        try {
          sessionStorage.setItem(EQUIFY_DISPATCH_TOKEN_KEY, freeDispatchToken);
        } catch {
          // quota / private mode — deliver path still works via DB entitlement
        }

        setLocalSubmitting(true);
        try {
          setSubmitPhase('promo-free-ready');
          setPromoNotice(
            isHe
              ? 'הקוד אומת — הדוח שלך בהכנה'
              : 'Code verified — preparing your report',
          );
          await postMondayLeadUpdate({
            status: 'Free promo redeemed',
            mondayItemId: leadSession.mondayItemId,
            leadId: leadSession.leadId,
            sessionId: leadSession.sessionId,
            userEmail: state.profile.userEmail,
            aiNotes: normalizedPromo
              ? `Free promo redeemed: ${normalizedPromo}`
              : undefined,
          }).catch((err) => {
            console.warn('[wizard] Free promo Monday update failed', err);
          });

          window.location.assign('/results');
        } catch {
          setSubmitPhase('idle');
          setHostedButtonId(null);
        } finally {
          setLocalSubmitting(false);
        }
        return;
      }

      const snapshot = buildEquifyValuationSnapshot(state, computed, {
        promoCode: null,
        paymentPath: 'paypal',
        mondayStatus: 'Redirected to PayPal',
      });
      persistEquifyValuationState(snapshot);
      saveEquifyWizardState(state);

      setLocalSubmitting(true);
      try {
        setSubmitPhase('redirecting-paypal');
        const ensured = await postEnsureWizardUser({
          email: state.profile.userEmail,
          fullName: state.profile.fullName,
        });
        if (!ensured.ok) {
          setLocalSubmitError(
            isHe
              ? 'לא ניתן להכין את התשלום. בדקו את כתובת המייל ונסו שוב.'
              : 'Could not prepare checkout. Check your email and try again.',
          );
          setSubmitPhase('idle');
          setHostedButtonId(null);
          return;
        }

        await postMondayLeadUpdate({
          status: 'Redirected to PayPal',
          mondayItemId: leadSession.mondayItemId,
          leadId: leadSession.leadId,
          sessionId: leadSession.sessionId,
          userEmail: state.profile.userEmail,
        }).catch((err) => {
          console.warn('[wizard] PayPal Monday update failed', err);
        });

        setHostedButtonId(HOSTED_BUTTON_ID_FULL);
        setSubmitPhase('checkout-ready');
      } catch {
        setSubmitPhase('idle');
        setHostedButtonId(null);
      } finally {
        setLocalSubmitting(false);
      }
    },
    [computed, isHe, state],
  );

  return (
    <div
      className={[
        'equify-wizard',
        mounted ? 'eqw-mounted' : '',
        mounted && !reducedMotion ? 'eqw-animate' : '',
        revealed ? 'eqw-revealed' : '',
        step === 2 ? 'eqw-step-financials' : '',
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
            <EquifyLogo variant="dark-bg" compact decorative />
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

          {step !== 2 && step !== 3 ? (
            <LiveValuationCard variant="sidebar" companyName={displayCompanyName || undefined} />
          ) : null}
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
                isSubmitting={isSubmitting || localSubmitting}
                submitPhase={submitPhase}
                submitError={localSubmitError ?? submitError}
                promoNotice={promoNotice}
                hostedButtonId={hostedButtonId}
              />
            )}
          </section>
        </main>
      </div>

      <div className="m-bar" aria-hidden={false}>
        <div className="m-bar-live">
          <span className="m-bar-label">{copy.ownerValue}</span>
          <span className="m-bar-val mono eq-currency-value" data-currency={reportingCurrency}>
            {hasLiveFinancials
              ? fmtEquitySidebarM(computed.equity, locale, reportingCurrency)
              : formatLiveAmountEmpty(locale, reportingCurrency)}
          </span>
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
