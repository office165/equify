import { analyticsEnabled } from '../analytics/SiteAnalytics';
import { ConsentGatedAnalytics } from './ConsentGatedAnalytics';
import { CookieConsent } from './CookieConsent';
import { CookieSettingsLink } from './CookieSettingsLink';
import './consent.css';

/** Round 10: what CONSENT_BANNER adds to every page. Analytics still needs NEXT_PUBLIC_ANALYTICS=on, and then waits for consent. */
export function ConsentRoot() {
  return (
    <>
      <CookieSettingsLink />
      <CookieConsent />
      {analyticsEnabled() ? <ConsentGatedAnalytics /> : null}
    </>
  );
}
