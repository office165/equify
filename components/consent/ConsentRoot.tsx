import { analyticsEnabled } from '../analytics/SiteAnalytics';
import { ConsentGatedAnalytics } from './ConsentGatedAnalytics';
import { CookieConsent } from './CookieConsent';
import { CookieSettingsLink } from './CookieSettingsLink';

/** Round 10: what CONSENT_BANNER adds (its styles: public/site-v2/consent.css, linked from app/layout.tsx) to every page. Analytics still needs NEXT_PUBLIC_ANALYTICS=on, and then waits for consent. */
export function ConsentRoot() {
  return (
    <>
      <CookieSettingsLink />
      <CookieConsent />
      {analyticsEnabled() ? <ConsentGatedAnalytics /> : null}
    </>
  );
}
