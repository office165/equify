'use client';

import Link from 'next/link';
import { LEGAL_ROUTES } from '../../lib/legal/routes';
import { AccessibilityStatementLink } from '../AccessibilityStatementDialog';
import { FooterFeedback } from '../landing/equify/shared/FooterFeedback';
import { V2Logo } from './V2Logo';
import type { NavItem } from './NavV2';

/** Round 11 (SITE_V2): the footer in the SBC site's columns (components/Footer.tsx there), with today's links. Shared by the hub (round 12). */
export function FooterV2({ items, consentBanner = false }: { items: readonly NavItem[]; consentBanner?: boolean }) {
  return (
    <footer className="v2-foot">
      <div className="v2-foot-grid">
        <div className="v2-foot-brand">
          <Link href="/" className="v2-logo">
            <V2Logo suffix=", דף הבית" />
          </Link>
        </div>
        <div>
          {items.map(([href, label]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </div>
        <div>
          <Link href="/wizard">התחל הערכה</Link>
          <Link href={LEGAL_ROUTES.terms}>תנאי שימוש</Link>
          <Link href={LEGAL_ROUTES.privacy}>פרטיות</Link>
          <AccessibilityStatementLink />
          {consentBanner ? (
            <button type="button" className="eq-cc-foot-btn" data-cookie-settings="">
              הגדרות עוגיות
            </button>
          ) : null}
        </div>
        <div>
          <a href="mailto:hello@equify.co.il">hello@equify.co.il</a>
        </div>
      </div>
      <div className="ff">
        <FooterFeedback />
      </div>
      <div className="v2-foot-legal">
        <span>© {new Date().getFullYear()} equify BY SBC</span>
      </div>
    </footer>
  );
}
