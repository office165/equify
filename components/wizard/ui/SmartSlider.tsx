'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

export type SmartSliderUnit = '%' | '₪K' | '';

export interface SmartSliderProps {
  label: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: SmartSliderUnit;
  onChange: (value: number) => void;
  ariaLabel?: string;
  minLabel?: string;
  maxLabel?: string;
  fillClassName?: string;
  required?: boolean;
}

function formatDisplay(v: number, unit: SmartSliderUnit): string {
  if (unit === '₪K') {
    return v >= 1000
      ? `₪${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}M`
      : `₪${v}K`;
  }
  if (unit === '%') return `${v}%`;
  return String(v);
}

/** סליידר מספרי חכם — תומך RTL (מדידה מימין) */
export function SmartSlider({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  onChange,
  ariaLabel,
  minLabel,
  maxLabel,
  fillClassName,
  required,
}: SmartSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const pct = useCallback(
    (v: number) => ((v - min) / (max - min)) * 100,
    [min, max],
  );

  const snap = useCallback(
    (v: number) => Math.round(v / step) * step,
    [step],
  );

  const getValFromPointer = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return value;
      const rect = track.getBoundingClientRect();
      const raw = (rect.right - clientX) / rect.width;
      const clamped = Math.max(0, Math.min(1, raw));
      return snap(min + clamped * (max - min));
    },
    [min, max, snap, value],
  );

  const handlePointerDownTrack = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).classList.contains('sn-thumb')) return;
      const v = getValFromPointer(e.clientX);
      onChange(v);
    },
    [getValFromPointer, onChange],
  );

  const handleThumbPointerDown = useCallback(() => {
    setDragging(true);
    document.body.style.userSelect = 'none';
  }, []);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragging) return;
      e.preventDefault();
      onChange(getValFromPointer(e.clientX));
    },
    [dragging, getValFromPointer, onChange],
  );

  const handlePointerUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    document.body.style.userSelect = '';
  }, [dragging]);

  useEffect(() => {
    if (!dragging) return undefined;
    document.addEventListener('pointermove', handlePointerMove, { passive: false });
    document.addEventListener('pointerup', handlePointerUp);
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragging, handlePointerMove, handlePointerUp]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let next = value;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(max, value + step);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(min, value - step);
      if (next !== value) {
        e.preventDefault();
        onChange(next);
      }
    },
    [max, min, onChange, step, value],
  );

  const p = pct(value);
  const trackStyle = { '--p': `${p}%` } as React.CSSProperties;

  return (
    <div className="smart-num">
      <div className="sn-top">
        <label>
          {label}
          {required ? <span className="req"> *</span> : null}
        </label>
        <span className="sn-live mono">{formatDisplay(value, unit)}</span>
      </div>
      <div
        className="sn-track"
        ref={trackRef}
        style={trackStyle}
        onPointerDown={handlePointerDownTrack}
        role="presentation"
      >
        <div
          className={fillClassName ? `sn-fill ${fillClassName}` : 'sn-fill'}
        />
        <div
          className={`sn-thumb${dragging ? ' dragging' : ''}`}
          style={{ insetInlineEnd: `${100 - p}%` }}
          tabIndex={0}
          role="slider"
          aria-label={ariaLabel}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          onPointerDown={handleThumbPointerDown}
          onKeyDown={handleKeyDown}
        />
      </div>
      {(minLabel || maxLabel) && (
        <div className="sn-range">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  );
}
