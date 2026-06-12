'use client';

import { useEffect, useState } from 'react';

export interface MobileViewportState {
  /** Viewport width in CSS pixels */
  width: number;
  /** Viewport height in CSS pixels */
  height: number;
  /** True when width is below the mobile breakpoint (default 768px) */
  isMobile: boolean;
  /** True when width is below the narrow breakpoint (default 640px) */
  isNarrowViewport: boolean;
  /** Safe-area inset top for notched devices (px) */
  safeAreaTop: number;
}

const MOBILE_BREAKPOINT_PX = 768;
const NARROW_BREAKPOINT_PX = 640;

function readViewport(): MobileViewportState {
  if (typeof window === 'undefined') {
    return {
      width: 1024,
      height: 768,
      isMobile: false,
      isNarrowViewport: false,
      safeAreaTop: 0,
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const safeAreaTop = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0',
  );

  return {
    width,
    height,
    isMobile: width < MOBILE_BREAKPOINT_PX,
    isNarrowViewport: width < NARROW_BREAKPOINT_PX,
    safeAreaTop: Number.isFinite(safeAreaTop) ? safeAreaTop : 0,
  };
}

/**
 * Tracks viewport dimensions for responsive wizard / native-shell layouts.
 */
export function useMobileViewport(): MobileViewportState {
  const [viewport, setViewport] = useState<MobileViewportState>(readViewport);

  useEffect(() => {
    const update = () => setViewport(readViewport());
    update();
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return viewport;
}
