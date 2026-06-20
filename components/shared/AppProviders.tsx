'use client';

import { useEffect } from 'react';
import { AccessibilityPreferencesProvider, useAccessibilityPreferences } from '../../lib/accessibility/accessibility_preferences';
import { AccessibilityToolbar } from '../../lib/components/AccessibilityToolbar';
import { ValuationI18nProvider } from '../../valuation_i18n';

/** Applies a11y preference data attributes to documentElement for global CSS hooks */
function DocumentA11yAttributes() {
  const { rootDataAttributes } = useAccessibilityPreferences();

  useEffect(() => {
    const el = document.documentElement;
    for (const [key, value] of Object.entries(rootDataAttributes)) {
      el.setAttribute(key, value);
    }
    return () => {
      for (const key of Object.keys(rootDataAttributes)) {
        el.removeAttribute(key);
      }
    };
  }, [rootDataAttributes]);

  return null;
}

/** Global providers + floating accessibility widget on all app routes */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ValuationI18nProvider>
      <AccessibilityPreferencesProvider>
        <DocumentA11yAttributes />
        {children}
        <AccessibilityToolbar />
      </AccessibilityPreferencesProvider>
    </ValuationI18nProvider>
  );
}
