'use client';

import { useSiteFlags } from '../../../shared/SiteFlagsContext';
import { HUB_NAV } from '../../../../lib/content/hub_nav';
import Link from 'next/link';
import { AccessibilityStatementLink } from '../../../AccessibilityStatementDialog';
import { LEGAL_ROUTES } from '../../../../lib/legal/routes';
import { FooterFeedback } from './FooterFeedback';

/** פוטר דף הנחיתה */
export function LandingFooter() {
  const { consentBanner, contentHub } = useSiteFlags();
  return (
    <footer>
      <div className="wrap">
        <div className="foot">
          <Link href="/" className="logo">
            equify<em>.</em>
            <small>BY SBC</small>
          </Link>
          <div className="f-links">
            <Link href="/wizard">התחל הערכה</Link>
            {contentHub ? HUB_NAV.map(([href, label]) => <Link key={href} href={href}>{label}</Link>) : null}
            <Link href={LEGAL_ROUTES.terms}>תנאי שימוש</Link>
            <Link href={LEGAL_ROUTES.privacy}>פרטיות</Link>
            <AccessibilityStatementLink />
            <a href="mailto:hello@equify.co.il">hello@equify.co.il</a>
            {consentBanner ? (
              <button type="button" className="eq-cc-foot-btn" data-cookie-settings="">
                הגדרות עוגיות
              </button>
            ) : null}
          </div>
          <span className="copy">© {new Date().getFullYear()} equify BY SBC</span>
        </div>
        <FooterFeedback />
      </div>
    </footer>
  );
}
