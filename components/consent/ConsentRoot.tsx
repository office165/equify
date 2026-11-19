import { analyticsEnabled } from '../analytics/SiteAnalytics';
import { ConsentGatedAnalytics } from './ConsentGatedAnalytics';
import { CookieConsent } from './CookieConsent';
import { CONSENT_TEXT_EN } from '../../lib/consent/consent_text';
import { CookieSettingsLink } from './CookieSettingsLink';

/** Round 10: what CONSENT_BANNER adds (its styles: public/site-v2/consent.css, linked from app/layout.tsx) to every page. Analytics still needs NEXT_PUBLIC_ANALYTICS=on, and then waits for consent. */
export function ConsentRoot({ lang = 'he' }: { lang?: string } = {}) {
  return (
    <>
      <CookieSettingsLink label={lang === 'he' ? undefined : CONSENT_TEXT_EN.settings} />
      <CookieConsent lang={lang} />
      {analyticsEnabled() ? <ConsentGatedAnalytics /> : null}
    </>
  );
}
