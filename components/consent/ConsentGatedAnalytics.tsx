'use client';

import { useEffect, useState } from 'react';
import { CONSENT_EVENT, readConsent, type Consent } from '../../lib/consent/consent';

/**
 * Round 10 (CONSENT_BANNER): Vercel Analytics and Speed Insights load only after consent to measurement, in the same visit (no reload).
 * Before that nothing of theirs is requested: the packages are imported only once consent is given. A later "רק הכרחיות" stops them on
 * the next page load (the scripts already running in this tab are not unloaded).
 */
type Loaded = { Analytics: React.ComponentType; SpeedInsights: React.ComponentType };

export function ConsentGatedAnalytics() {
  const [allowed, setAllowed] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    setAllowed(readConsent()?.a === true);
    const on = (e: Event) => setAllowed((e as CustomEvent<Consent>).detail?.a === true);
    window.addEventListener(CONSENT_EVENT, on);
    return () => window.removeEventListener(CONSENT_EVENT, on);
  }, []);

  useEffect(() => {
    if (!allowed || loaded) return;
    let cancelled = false;
    void Promise.all([import('@vercel/analytics/next'), import('@vercel/speed-insights/next')]).then(([a, s]) => {
      if (!cancelled) setLoaded({ Analytics: a.Analytics, SpeedInsights: s.SpeedInsights });
    });
    return () => {
      cancelled = true;
    };
  }, [allowed, loaded]);

  if (!allowed || !loaded) return null;
  const { Analytics, SpeedInsights } = loaded;
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
