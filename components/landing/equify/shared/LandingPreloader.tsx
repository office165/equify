'use client';

import type { RefObject } from 'react';

interface LandingPreloaderProps {
  loaderRef: RefObject<HTMLDivElement>;
  visible: boolean;
}

/** מסך טעינה ראשוני — אנימציית progress bar */
export function LandingPreloader({ loaderRef, visible }: LandingPreloaderProps) {
  if (!visible) return null;

  return (
    <div id="loader" ref={loaderRef} role="status" aria-label="טוען">
      <div className="l-logo">
        equify<em>.</em>
      </div>
      <div className="l-bar">
        <i />
      </div>
      <div className="l-num">0%</div>
    </div>
  );
}
