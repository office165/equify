'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useAccessibilityPreferences } from '../accessibility/accessibility_preferences';
import { useValuationI18n } from '../../valuation_i18n';

function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

interface A11yToggleRowProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  isRtl: boolean;
}

function A11yToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
  isRtl,
}: A11yToggleRowProps) {
  return (
    <div className="vb-glass-pane flex items-center justify-between gap-4 rounded-2xl px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block text-sm font-semibold text-slate-100">
          {label}
        </label>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 rounded-full border transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfa5]/60',
          checked
            ? 'border-[#00bfa5]/50 bg-[#00bfa5]/30'
            : 'border-white/15 bg-white/5',
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-300',
            isRtl
              ? checked
                ? '-translate-x-1'
                : '-translate-x-6'
              : checked
                ? 'translate-x-6'
                : 'translate-x-1',
            'mt-0.5',
          )}
          aria-hidden
        />
        <span className="sr-only">{label}</span>
      </button>
    </div>
  );
}

export function AccessibilityToolbar() {
  const { i18n } = useValuationI18n();
  const { preferences, toggle, reset } = useAccessibilityPreferences();
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKey);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, close]);

  const isRtl = i18n.isRtl;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="vb-a11y-panel"
        className={cn(
          'vb-a11y-fab fixed bottom-5 z-[90] flex h-14 w-14 items-center justify-center rounded-full',
          'border border-[#00bfa5]/35 bg-[#051c14]/80 text-2xl text-[#00bfa5]',
          'shadow-[0_0_28px_rgba(0,191,165,0.28)] backdrop-blur-xl',
          'transition-all duration-300 hover:scale-105 hover:shadow-[0_0_36px_rgba(0,191,165,0.42)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfa5]',
          isRtl ? 'start-5' : 'end-5',
        )}
        aria-label={isRtl ? 'תפריט נגישות' : 'Accessibility menu'}
        title={isRtl ? 'נגישות' : 'Accessibility'}
      >
        <span aria-hidden>♿</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[95] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            aria-label={isRtl ? 'סגור תפריט נגישות' : 'Close accessibility menu'}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={close}
          />
          <div
            ref={panelRef}
            id="vb-a11y-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            dir={i18n.dir}
            lang={isRtl ? 'he' : 'en'}
            className="vb-glass-pane vb-modal-enter relative z-10 w-full max-w-md overflow-hidden rounded-3xl p-5 sm:p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 id={titleId} className="text-lg font-bold text-white">
                  {isRtl ? 'התאמות נגישות' : 'Accessibility options'}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {isRtl
                    ? 'הגדרות פעילות בזמן אמת — ללא רענון דף'
                    : 'Live adjustments — no page reload required'}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-white/5"
              >
                {isRtl ? 'סגור' : 'Close'}
              </button>
            </div>

            <div className="space-y-3" role="group" aria-label={isRtl ? 'מתגי נגישות' : 'Accessibility toggles'}>
              <A11yToggleRow
                id="a11y-large-text"
                label={isRtl ? 'הגדלת טקסט' : 'Increase text size'}
                description={
                  isRtl
                    ? 'מגדיל את גודל הטקסט בטופס ובכרטיסים'
                    : 'Enlarges typography across the wizard'
                }
                checked={preferences.largeText}
                onChange={() => toggle('largeText')}
                isRtl={isRtl}
              />
              <A11yToggleRow
                id="a11y-high-contrast"
                label={isRtl ? 'ניגודיות גבוהה' : 'High contrast mode'}
                description={
                  isRtl
                    ? 'מגביר ניגודיות לקריאה נוחה יותר'
                    : 'Boosts contrast for clearer reading'
                }
                checked={preferences.highContrast}
                onChange={() => toggle('highContrast')}
                isRtl={isRtl}
              />
              <A11yToggleRow
                id="a11y-focus-highlight"
                label={isRtl ? 'הדגשת קישורים ופוקוס' : 'Highlight links & focus'}
                description={
                  isRtl
                    ? 'מסמן שדות וכפתורים פעילים במסגרת בולטת'
                    : 'Thick focus rings on inputs and buttons'
                }
                checked={preferences.focusHighlight}
                onChange={() => toggle('focusHighlight')}
                isRtl={isRtl}
              />
              <A11yToggleRow
                id="a11y-readable-font"
                label={isRtl ? 'גופן קריא' : 'Readable font'}
                description={
                  isRtl
                    ? 'מעבר לגופן מערכת נקי וקריא'
                    : 'Switches to a clean system sans-serif stack'
                }
                checked={preferences.readableFont}
                onChange={() => toggle('readableFont')}
                isRtl={isRtl}
              />
            </div>

            <button
              type="button"
              onClick={reset}
              className="mt-5 w-full rounded-xl border border-white/10 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/5"
            >
              {isRtl ? 'איפוס הגדרות' : 'Reset preferences'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
