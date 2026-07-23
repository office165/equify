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
import type { PromoValidateResponse } from '../../../lib/payments/promo_client';
import { postEnsureWizardUser } from '../../../lib/payments/ensure_wizard_user_client';
import { HOSTED_BUTTON_ID_FULL } from '../../../lib/payments/paypal_hosted_button_ids';
import { normalizePromoCode } from '../../../lib/wizard/vip_promo';
import { EQUIFY_DISPATCH_TOKEN_KEY } from '../../../lib/payments/dispatch_token_storage';
import {
  clearWizardDraft,
  useWizardDraftPersistence,
} from '../hooks/useWizardDraftPersistence';
import { useWizardBgCanvas } from './hooks/useWizardBgCanvas';
import { useWizardStepMotion } from './hooks/useWizardStepMotion';
import './wizard-equify.css';

function promoDenyMessage(
  validated: PromoValidateResponse,
  isHe: boolean,
): string {
  if (validated.rateLimited) {
    return isHe
      ? 'יותר מדי ניסיונות, נסה שוב בעוד מספר דקות'
      : 'Too many attempts — try again in a few minutes';
  }
  if (validated.reason === 'server_error') {
    return isHe
      ? 'שגיאה זמנית, נסה שוב או פנה אלינו'
      : 'Temporary error — try again or contact us';
  }
  if (validated.reason === 'expired') {
    return isHe ? 'תוקף הקוד פג' : 'This code has expired';
  }
  if (validated.reason === 'max_uses_reached') {
    return isHe ? 'הקוד נוצל במלואו' : 'This code has been fully used';
  }
  return isHe ? 'הקוד אינו תקף' : 'Invalid code';
}

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
  const { step, setStep, computed, state, replaceWizardState, resetWizard } =
    useWizardValuation();
  const { reportingCurrency } = useReportingCurrency();
  const displayCompanyName = resolveDisplayCompanyName(state.profile.companyName, locale);
  const hasLiveFinancials = hasMeaningfulFinancialInputs(state.financials);

  const draftUi = useWizardDraftPersistence({
    state,
    onRestore: (draftState) => {
      replaceWizardState(draftState);
    },
    onStartFresh: () => {
      resetWizard();
    },
  });

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
          setLocalSubmitError(promoDenyMessage(validated, isHe));
          // Fall through to FULL PayPal — never PROMO / never free without server token.
        } else {
          freeDispatchToken = validated.dispatchToken;
        }
      }

      if (freeDispatchToken) {
        clearWizardDraft();
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

        clearWizardDraft();
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

  /** Apply promo while FULL checkout is visible — keep PayPal available on failure. */
  const handleApplyPromo = useCallback(
    async (promoCode: string) => {
      const normalizedPromo = normalizePromoCode(promoCode);
      if (!normalizedPromo) {
        setLocalSubmitError(isHe ? 'יש להזין קוד' : 'Enter a promo code');
        return;
      }
      setLocalSubmitError(null);
      setPromoNotice(null);
      setLocalSubmitting(true);
      setSubmitPhase('validating-vip');
      try {
        const validated = await postValidatePromoCode({
          code: normalizedPromo,
          email: state.profile.userEmail,
        });
        if (!validated.valid || !validated.dispatchToken) {
          setLocalSubmitError(promoDenyMessage(validated, isHe));
          setSubmitPhase('checkout-ready');
          // Keep hostedButtonId — PayPal remains available.
          return;
        }

        clearWizardDraft();
        const leadSession = readLeadSession();
        const snapshot = buildEquifyValuationSnapshot(state, computed, {
          promoCode: normalizedPromo,
          paymentPath: 'promo_free',
          mondayStatus: 'Free promo redeemed',
        });
        persistEquifyValuationState(snapshot);
        saveEquifyWizardState(state);

        try {
          sessionStorage.setItem(
            EQUIFY_DISPATCH_TOKEN_KEY,
            validated.dispatchToken,
          );
        } catch {
          // quota / private mode
        }

        setHostedButtonId(null);
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
          aiNotes: `Free promo redeemed: ${normalizedPromo}`,
        }).catch((err) => {
          console.warn('[wizard] Free promo Monday update failed', err);
        });

        window.location.assign('/results');
      } catch {
        setLocalSubmitError(promoDenyMessage({ valid: false, reason: 'server_error' }, isHe));
        setSubmitPhase('checkout-ready');
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

          {draftUi.restoredNotice ? (
            <div
              className="eqw-draft-banner"
              role="status"
              style={{
                margin: '0 0 12px',
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(0, 194, 184, 0.08)',
                border: '1px solid rgba(0, 194, 184, 0.28)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 10,
                justifyContent: 'space-between',
                fontSize: 13,
              }}
            >
              <span>
                {isHe
                  ? 'שחזרנו טיוטה שמורה מהפעם הקודמת.'
                  : 'We restored your previous draft.'}
              </span>
              <button
                type="button"
                className="back-btn"
                onClick={() => {
                  draftUi.startFreshDraft();
                  setHostedButtonId(null);
                  setSubmitPhase('idle');
                  setLocalSubmitError(null);
                  setPromoNotice(null);
                }}
              >
                {isHe ? 'התחל טיוטה חדשה' : 'Start a new draft'}
              </button>
            </div>
          ) : null}

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
                onApplyPromo={handleApplyPromo}
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
