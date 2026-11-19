'use client';

import { usePathname } from 'next/navigation';

/**
 * Round 10 (CONSENT_BANNER): "הגדרות עוגיות" at the bottom of every page. The home page has it in its own footer
 * (components/landing/equify/shared/LandingFooter.tsx), so this line is not shown there.
 */
export function CookieSettingsLink({ label = 'הגדרות עוגיות' }: { label?: string }) {
  const path = usePathname();
  if (path === '/' || path === '/en') return null;
  return (
    <div className="eq-cc-foot" dir="rtl">
      <button type="button" className="eq-cc-foot-btn" data-cookie-settings="">
        {label}
      </button>
    </div>
  );
}
