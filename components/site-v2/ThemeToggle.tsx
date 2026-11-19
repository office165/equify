'use client';

import { useEffect } from 'react';
import { THEME_COLORS, THEME_KEY } from './theme_boot';

/**
 * Round 11 (SITE_V2): the day and night switch, the SBC site's button (components/Nav.tsx, .theme-toggle): a sun at night, a moon by day.
 * A click sets the theme and keeps it; until then the page follows the device, also when the device changes while the page is open.
 */
function apply(t: 'light' | 'dark', save: boolean): void {
  const root = document.documentElement;
  root.setAttribute('data-eq-theme', t);
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => (m.content = THEME_COLORS[t]));
  if (save) {
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {}
  }
  window.dispatchEvent(new CustomEvent('equify-theme', { detail: t }));
}

export function ThemeToggle({ lang = 'he', className = '' }: { lang?: 'he' | 'en'; className?: string }) {
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_KEY);
    } catch {}
    if (stored === 'light' || stored === 'dark') return;
    const mq = window.matchMedia?.('(prefers-color-scheme: light)');
    const onChange = (e: MediaQueryListEvent) => {
      let now: string | null = null;
      try {
        now = localStorage.getItem(THEME_KEY);
      } catch {}
      if (now !== 'light' && now !== 'dark') apply(e.matches ? 'light' : 'dark', false);
    };
    mq?.addEventListener?.('change', onChange);
    return () => mq?.removeEventListener?.('change', onChange);
  }, []);

  const onClick = () => {
    const cur = document.documentElement.getAttribute('data-eq-theme') === 'light' ? 'light' : 'dark';
    apply(cur === 'light' ? 'dark' : 'light', true);
  };

  return (
    <button
      className={`theme-toggle ${className}`.trim()}
      id="themeToggle"
      type="button"
      onClick={onClick}
      aria-label={lang === 'he' ? 'החלפה בין מצב כהה למצב בהיר' : 'Switch between dark and light mode'}
    >
      <svg className="ic-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
      </svg>
      <svg className="ic-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    </button>
  );
}
