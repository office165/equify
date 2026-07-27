'use client';

import { useEffect } from 'react';
import { readSavedScroll, saveScroll } from '../../lib/navigation/session_ui';

/** Debounced scroll save while on `path`; optional one-time restore on return. */
export function useSessionScrollPersistence(path: string, restore: boolean): void {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => saveScroll(path, window.scrollY), 120);
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    const onNavigateClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const anchor = target?.closest('a[href]');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('#')) {
        return;
      }
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
      saveScroll(path, window.scrollY);
    };
    document.addEventListener('click', onNavigateClick, true);

    return () => {
      document.removeEventListener('click', onNavigateClick, true);
      window.removeEventListener('scroll', onScroll);
      if (timer) clearTimeout(timer);
    };
  }, [path]);

  useEffect(() => {
    if (!restore || typeof window === 'undefined') return undefined;
    const y = readSavedScroll(path);
    if (y == null || y <= 0) return undefined;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.scrollTo(0, y));
    });
    return undefined;
  }, [path, restore]);
}
