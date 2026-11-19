'use client';

import { NavV2 } from '../site-v2/NavV2';
import { FooterV2 } from '../site-v2/FooterV2';
import { useSiteFlags } from '../shared/SiteFlagsContext';
import { HUB_NAV } from '../../lib/content/hub_nav';

/** Round 12 (CONTENT_HUB): the header and footer of the hub pages, the same as the new home page (round 11), in equify's colours. */
const HOME_ITEMS = [
  ['/#how', 'איך זה עובד'],
  ['/#calc', 'סימולטור שווי'],
  ['/#price', 'תמחור'],
  ['/#faq', 'שאלות'],
] as const;

export function HubShell({ children }: { children: React.ReactNode }) {
  const { consentBanner } = useSiteFlags();
  const items = [...HOME_ITEMS, ...HUB_NAV];
  return (
    <div className="v2 eq-hub" dir="rtl" lang="he">
      <a className="v2-skip" href="#main">
        דלג לתוכן הראשי
      </a>
      <NavV2 items={items} cta="התחל הערכה" />
      <main id="main" className="hub-page">
        {children}
      </main>
      <FooterV2 items={items} consentBanner={consentBanner} />
    </div>
  );
}
