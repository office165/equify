'use client';

import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export interface FieldHelpTooltipProps {
  content: string;
  helpAria: string;
  label?: string;
  isRtl?: boolean;
  children?: React.ReactNode;
}

interface PanelPosition {
  top: number;
  left: number;
  width: number;
  ready: boolean;
}

const HOVER_CLOSE_MS = 140;
const PANEL_Z = 9999;

export function FieldHelpTooltip({
  content,
  helpAria,
  label,
  isRtl = true,
  children,
}: FieldHelpTooltipProps) {
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [hoverOpen, setHoverOpen] = useState(false);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [panelPos, setPanelPos] = useState<PanelPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();

  useEffect(() => {
    const mqCoarse = window.matchMedia('(pointer: coarse)');
    const mqNarrow = window.matchMedia('(max-width: 639px)');
    const sync = () => setIsCoarsePointer(mqCoarse.matches || mqNarrow.matches);
    sync();
    mqCoarse.addEventListener('change', sync);
    mqNarrow.addEventListener('change', sync);
    return () => {
      mqCoarse.removeEventListener('change', sync);
      mqNarrow.removeEventListener('change', sync);
    };
  }, []);

  const visible = pinnedOpen || hoverOpen;

  const cancelScheduledClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    if (pinnedOpen) return;
    cancelScheduledClose();
    closeTimerRef.current = setTimeout(() => setHoverOpen(false), HOVER_CLOSE_MS);
  }, [cancelScheduledClose, pinnedOpen]);

  const openHover = useCallback(() => {
    if (isCoarsePointer) return;
    cancelScheduledClose();
    setHoverOpen(true);
  }, [cancelScheduledClose, isCoarsePointer]);

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || !visible) {
      setPanelPos(null);
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const margin = 12;
    const width = Math.min(300, window.innerWidth - margin * 2);
    let left = isRtl ? rect.right - width : rect.left;
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

    const panelHeightEstimate = 120;
    const below = rect.bottom + 8;
    const above = rect.top - panelHeightEstimate - 8;
    const top =
      below + panelHeightEstimate > window.innerHeight - margin && above > margin
        ? above
        : below;

    setPanelPos({ top, left, width, ready: true });
  }, [isRtl, visible]);

  useLayoutEffect(() => {
    updatePanelPosition();
  }, [updatePanelPosition, content, label]);

  useEffect(() => {
    if (!visible) return;
    const onScrollOrResize = () => updatePanelPosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [visible, updatePanelPosition]);

  useEffect(() => {
    if (!visible) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target) ||
        rootRef.current?.contains(target)
      ) {
        return;
      }
      setPinnedOpen(false);
      setHoverOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [visible]);

  useEffect(() => () => cancelScheduledClose(), [cancelScheduledClose]);

  const handleToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    cancelScheduledClose();
    setPinnedOpen((prev) => {
      const next = !prev;
      if (next) setHoverOpen(true);
      else setHoverOpen(false);
      return next;
    });
  };

  const panel =
    visible && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={panelRef}
            id={tooltipId}
            role="tooltip"
            dir={isRtl ? 'rtl' : 'ltr'}
            className={cn(
              'vb-field-help-panel vb-field-help-panel--open pointer-events-auto fixed flex flex-col whitespace-normal break-words text-end',
              !panelPos?.ready && 'opacity-0',
            )}
            style={{
              zIndex: PANEL_Z,
              top: panelPos?.top ?? -9999,
              left: panelPos?.left ?? marginFallback(isRtl),
              width: panelPos?.width ?? Math.min(300, window.innerWidth - 24),
              maxWidth: 'min(300px, calc(100vw - 24px))',
            }}
            onPointerEnter={openHover}
            onPointerLeave={scheduleClose}
          >
            {label ? (
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-mint-400/90">
                {label}
              </span>
            ) : null}
            <span className="text-xs leading-relaxed text-slate-200">{content}</span>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      ref={rootRef}
      className={cn(
        'vb-field-help relative z-[1] min-w-0 pointer-events-auto',
        children ? 'w-full max-w-full' : 'inline-flex shrink-0',
      )}
      onPointerEnter={openHover}
      onPointerLeave={scheduleClose}
    >
      <div
        className={cn(
          'pointer-events-auto flex min-w-0 items-center gap-2',
          children ? 'w-full max-w-full' : 'shrink-0',
        )}
      >
        {children}
        <button
          ref={triggerRef}
          type="button"
          aria-label={`${label ? `${label} ` : ''}${helpAria}`.trim()}
          aria-expanded={visible}
          aria-describedby={visible ? tooltipId : undefined}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={handleToggle}
          onPointerEnter={openHover}
          onPointerLeave={scheduleClose}
          className="pointer-events-auto inline-flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 touch-manipulation items-center justify-center rounded-full border border-emerald-500/20 bg-[#0B1311]/80 text-xs font-semibold text-[#00F5A0] shadow-sm transition hover:border-emerald-500/40 hover:text-[#05D38A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F5A0]/40 active:scale-[0.98]"
        >
          ?
        </button>
      </div>
      {panel}
    </div>
  );
}

function marginFallback(isRtl: boolean): number {
  if (typeof window === 'undefined') return 12;
  const width = Math.min(300, window.innerWidth - 24);
  return isRtl ? window.innerWidth - width - 12 : 12;
}
