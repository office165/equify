'use client';

import React, { useCallback, useEffect, useId, useRef } from 'react';
import { ACCESSIBILITY_STATEMENT_HE } from '../lib/legal/accessibility_statement';

export interface AccessibilityStatementDialogProps {
  open: boolean;
  onClose: () => void;
}

function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function AccessibilityStatementDialog({
  open,
  onClose,
}: AccessibilityStatementDialogProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="סגור הצהרת נגישות"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        lang="he"
        dir="rtl"
        className="relative z-10 max-h-[min(85vh,720px)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-mint-400/25 bg-slate-900 p-6 shadow-2xl shadow-black/40 sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-xl font-semibold text-mint-400">
              {ACCESSIBILITY_STATEMENT_HE.title}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {ACCESSIBILITY_STATEMENT_HE.updated}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-800"
          >
            סגור
          </button>
        </div>
        <div className="space-y-5">
          {ACCESSIBILITY_STATEMENT_HE.sections.map((section) => (
            <section key={section.heading}>
              <h3 className="text-sm font-semibold text-slate-100">
                {section.heading}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export interface AccessibilityStatementLinkProps {
  className?: string;
}

export function AccessibilityStatementLink({
  className,
}: AccessibilityStatementLinkProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'text-xs text-mint-400 underline-offset-2 transition hover:text-mint-400 hover:underline',
          className,
        )}
      >
        הצהרת נגישות
      </button>
      <AccessibilityStatementDialog
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
