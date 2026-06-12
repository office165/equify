'use client';

import React, { useCallback, useId, useState } from 'react';
import {
  requestWhatsAppOtp,
  verifyWhatsAppOtp,
  readAuthSession,
  clearAuthSession,
  type AuthSessionResponse,
} from '../../api_client';
import type { ValuationTranslations } from '../../valuation_i18n';
import { AccessibilityRegion, LiveStatus } from './accessibility';

export interface WhatsAppOtpAuthPanelProps {
  i18n: ValuationTranslations;
  onSessionChange?: (session: AuthSessionResponse | null) => void;
  compact?: boolean;
}

type OtpPhase = 'phone' | 'code' | 'verified';

function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function WhatsAppOtpAuthPanel({
  i18n,
  onSessionChange,
  compact = false,
}: WhatsAppOtpAuthPanelProps) {
  const phoneId = useId();
  const codeId = useId();
  const [phase, setPhase] = useState<OtpPhase>(() =>
    readAuthSession() ? 'verified' : 'phone',
  );
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [session, setSession] = useState<AuthSessionResponse | null>(() =>
    readAuthSession(),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const applySession = useCallback(
    (next: AuthSessionResponse | null) => {
      setSession(next);
      onSessionChange?.(next);
      setPhase(next ? 'verified' : 'phone');
    },
    [onSessionChange],
  );

  const handleRequestOtp = async () => {
    setError(null);
    setStatusMessage(null);
    if (!phone.trim()) {
      setError(i18n.t('whatsappErrPhone'));
      return;
    }
    setBusy(true);
    try {
      await requestWhatsAppOtp(phone.trim());
      setPhase('code');
      setStatusMessage(i18n.t('whatsappOtpSent'));
    } catch (err) {
      setError(err instanceof Error ? err.message : i18n.t('whatsappErrOtp'));
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError(null);
    setStatusMessage(null);
    if (!code.trim()) {
      setError(i18n.t('whatsappErrCode'));
      return;
    }
    setBusy(true);
    try {
      const verified = await verifyWhatsAppOtp(phone.trim(), code.trim());
      applySession(verified);
      setStatusMessage(i18n.t('whatsappAuthSuccess'));
    } catch (err) {
      setError(err instanceof Error ? err.message : i18n.t('whatsappErrVerify'));
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = () => {
    clearAuthSession();
    applySession(null);
    setPhone('');
    setCode('');
    setError(null);
    setStatusMessage(null);
  };

  return (
    <AccessibilityRegion
      label={i18n.t('whatsappAuthAria')}
      className={cn(
        'rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4',
        compact && 'p-3',
      )}
    >
      <h2 className="text-sm font-semibold text-slate-100">
        {i18n.t('whatsappAuthTitle')}
      </h2>
      <p className="mt-1 text-xs text-slate-400">{i18n.t('whatsappAuthDesc')}</p>

      {phase === 'verified' && session ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-emerald-300">
            {i18n.tf('whatsappVerifiedAs', {
              phone: session.user.phoneE164,
            })}
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            {i18n.t('whatsappSignOut')}
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div>
            <label
              htmlFor={phoneId}
              className="text-xs font-medium uppercase tracking-wider text-slate-400"
            >
              {i18n.t('whatsappPhoneLabel')}
            </label>
            <input
              id={phoneId}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={i18n.t('whatsappPhonePlaceholder')}
              disabled={busy || phase === 'code'}
              aria-required="true"
              aria-invalid={error ? true : undefined}
              className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-100"
            />
          </div>

          {phase === 'code' && (
            <div>
              <label
                htmlFor={codeId}
                className="text-xs font-medium uppercase tracking-wider text-slate-400"
              >
                {i18n.t('whatsappOtpLabel')}
              </label>
              <input
                id={codeId}
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 4))
                }
                placeholder="0000"
                disabled={busy}
                aria-required="true"
                aria-label={i18n.t('whatsappOtpLabel')}
                className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-800/60 px-3 py-2.5 text-sm tracking-[0.3em] text-slate-100"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {phase === 'phone' ? (
              <button
                type="button"
                onClick={() => void handleRequestOtp()}
                disabled={busy}
                className="rounded-xl bg-mint-500 px-4 py-2 text-xs font-semibold text-charcoal-950 hover:bg-mint-400 disabled:opacity-50"
              >
                {busy ? i18n.t('whatsappSending') : i18n.t('whatsappRequestOtp')}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void handleVerifyOtp()}
                  disabled={busy}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {busy ? i18n.t('whatsappVerifying') : i18n.t('whatsappVerifyOtp')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhase('phone');
                    setCode('');
                  }}
                  disabled={busy}
                  className="rounded-xl border border-slate-600 px-4 py-2 text-xs text-slate-300"
                >
                  {i18n.t('back')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {statusMessage && (
        <LiveStatus
          message={statusMessage}
          className="mt-3 text-xs text-mint-400"
        />
      )}
      {error && (
        <p role="alert" className="mt-3 text-xs text-rose-300">
          {error}
        </p>
      )}
    </AccessibilityRegion>
  );
}
