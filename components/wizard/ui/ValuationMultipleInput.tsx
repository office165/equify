'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { SmartFieldLabel } from './SmartFieldLabel';

export type ValuationMultipleType = 'EBITDA' | 'Revenue';

export interface ValuationMultipleInputCopy {
  autoBadge: string;
  manualBadge: string;
  reset: string;
  multipleEntered?: (value: string) => string;
  multipleAfterDlom?: (pct: number, value: string) => string;
  multipleAfterScale?: (value: string) => string;
  multipleEffective?: (value: string) => string;
}

export interface MultipleNormalizationBreakdownView {
  rawMultiple: number;
  dlomAdjusted: number;
  scaleAdjusted: number;
  finalMultiple: number;
  dlomFactor: number;
}

export interface ValuationMultipleInputProps {
  label: string;
  tooltip?: string;
  multipleType: ValuationMultipleType;
  /** Engine-computed sector multiple (no manual override). */
  automaticMultiple: number;
  customMultiple: number | null;
  isManualMultiple: boolean;
  onManualMultipleChange: (params: {
    customMultiple: number | null;
    isManualMultiple: boolean;
  }) => void;
  copy: ValuationMultipleInputCopy;
  locale?: 'he' | 'en';
  ariaLabel?: string;
  normalizationBreakdown?: MultipleNormalizationBreakdownView | null;
}

function formatMultipleDisplay(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '';
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}

function formatMultipleWithSuffix(value: number): string {
  const core = formatMultipleDisplay(value);
  return core ? `${core}x` : '';
}

function parseMultipleInput(raw: string): number | null {
  const cleaned = raw.replace(/[×x]/gi, '').replace(',', '.').trim();
  if (!cleaned) return null;
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) return null;
  return Math.round(parsed * 10) / 10;
}

/** Expert manual override for sector EBITDA / Revenue multiple — RTL-first. */
export function ValuationMultipleInput({
  label,
  tooltip,
  multipleType,
  automaticMultiple,
  customMultiple,
  isManualMultiple,
  onManualMultipleChange,
  copy,
  locale = 'he',
  ariaLabel,
  normalizationBreakdown,
}: ValuationMultipleInputProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const displayMultiple =
    isManualMultiple && customMultiple != null ? customMultiple : automaticMultiple;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => formatMultipleDisplay(displayMultiple));

  useEffect(() => {
    if (!editing) {
      setDraft(formatMultipleDisplay(displayMultiple));
    }
  }, [displayMultiple, editing]);

  const commitDraft = useCallback(
    (raw: string, forceManual: boolean) => {
      const parsed = parseMultipleInput(raw);
      if (parsed == null) {
        if (!raw.trim()) {
          onManualMultipleChange({ customMultiple: null, isManualMultiple: false });
        }
        return;
      }

      const autoRounded = Math.round(automaticMultiple * 10) / 10;
      const parsedRounded = Math.round(parsed * 10) / 10;

      if (forceManual || parsedRounded !== autoRounded) {
        onManualMultipleChange({
          customMultiple: parsedRounded,
          isManualMultiple: true,
        });
        return;
      }

      onManualMultipleChange({ customMultiple: null, isManualMultiple: false });
    },
    [automaticMultiple, onManualMultipleChange],
  );

  const handleFocus = useCallback(() => {
    setEditing(true);
    setDraft(formatMultipleDisplay(displayMultiple));
    requestAnimationFrame(() => inputRef.current?.select());
  }, [displayMultiple]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value.replace(/[^\d.,×x]/gi, '');
      setEditing(true);
      setDraft(next);
      commitDraft(next, true);
    },
    [commitDraft],
  );

  const handleBlur = useCallback(() => {
    setEditing(false);
    setDraft(formatMultipleDisplay(displayMultiple));
  }, [displayMultiple]);

  const handleReset = useCallback(() => {
    onManualMultipleChange({ customMultiple: null, isManualMultiple: false });
    setEditing(false);
    setDraft(formatMultipleDisplay(automaticMultiple));
  }, [automaticMultiple, onManualMultipleChange]);

  const badgeText = isManualMultiple ? copy.manualBadge : copy.autoBadge;
  const badgeClass = isManualMultiple
    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
    : 'bg-teal-500/10 text-teal-400 border border-teal-500/20';

  const controlRingClass = isManualMultiple
    ? 'border-amber-500/35 shadow-[0_0_0_1px_rgba(245,158,11,0.22)] focus-within:border-amber-400/50 focus-within:shadow-[0_0_0_2px_rgba(245,158,11,0.18)]'
    : 'border-teal-500/25 shadow-[0_0_0_1px_rgba(20,184,166,0.18)] focus-within:border-teal-400/45 focus-within:shadow-[0_0_0_2px_rgba(45,212,191,0.15)]';

  const suffixLabel = multipleType === 'Revenue' ? 'EV/Rev' : 'EV/EBITDA';

  return (
    <div
      className="vm-mult-input smart-input flex w-full min-w-0 max-w-full flex-col gap-2"
      dir={locale === 'he' ? 'rtl' : 'ltr'}
    >
      <SmartFieldLabel tooltip={tooltip} htmlFor={inputId}>
        {label}
      </SmartFieldLabel>

      <div className="flex w-full min-w-0 flex-col gap-2">
        <div
          dir="ltr"
          className={[
            'si-control vm-mult-control relative flex w-full min-w-0 max-w-full flex-row items-center justify-between gap-2 rounded-xl border px-4 py-2 transition-all duration-300 ease-in-out',
            controlRingClass,
            editing ? 'is-editing' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="vm-mult-input-field relative min-w-0 flex-1 basis-20">
            <input
              id={inputId}
              ref={inputRef}
              type="text"
              inputMode="decimal"
              enterKeyHint="done"
              autoComplete="off"
              spellCheck={false}
              dir="ltr"
              className="si-input vm-mult-input mono w-full min-w-0 border-0 bg-transparent px-2 py-1 text-right text-base md:text-sm text-teal-50/95 outline-none ring-0 focus:ring-0"
              value={
                editing ? draft : formatMultipleWithSuffix(displayMultiple)
              }
              aria-label={ariaLabel ?? label}
              onFocus={handleFocus}
              onChange={handleChange}
              onBlur={handleBlur}
            />
          </div>

          <span
            className={[
              'max-w-[11rem] shrink-0 truncate whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium transition-all duration-300 ease-in-out sm:max-w-none',
              badgeClass,
            ].join(' ')}
            title={badgeText}
          >
            {badgeText}
          </span>

          <span
            className="hidden min-w-fit flex-shrink-0 pl-1 text-left font-mono text-[10px] uppercase tracking-wider text-teal-500/50 select-none sm:inline sm:text-xs"
            dir="ltr"
            aria-hidden
          >
            {suffixLabel}
          </span>
        </div>

        {isManualMultiple ? (
          <div className="flex w-full flex-col gap-1">
            {normalizationBreakdown && copy.multipleEntered ? (
              <div className="vm-mult-breakdown mono text-xs text-gray-400 leading-relaxed">
                <div>{copy.multipleEntered(formatMultipleWithSuffix(normalizationBreakdown.rawMultiple))}</div>
                {copy.multipleAfterDlom ? (
                  <div>
                    {copy.multipleAfterDlom(
                      Math.round((1 - normalizationBreakdown.dlomFactor) * 100),
                      formatMultipleWithSuffix(normalizationBreakdown.dlomAdjusted),
                    )}
                  </div>
                ) : null}
                {copy.multipleAfterScale ? (
                  <div>
                    {copy.multipleAfterScale(
                      formatMultipleWithSuffix(normalizationBreakdown.scaleAdjusted),
                    )}
                  </div>
                ) : null}
                {copy.multipleEffective ? (
                  <div>
                    {copy.multipleEffective(
                      formatMultipleWithSuffix(normalizationBreakdown.finalMultiple),
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="flex w-full justify-start">
              <button
                type="button"
                className="shrink-0 whitespace-nowrap text-xs text-gray-500 transition-colors duration-300 ease-in-out hover:text-teal-400 cursor-pointer"
                onClick={handleReset}
              >
                {copy.reset}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
