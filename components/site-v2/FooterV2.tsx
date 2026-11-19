'use client';

import Link from 'next/link';
import { LEGAL_ROUTES } from '../../lib/legal/routes';
import { AccessibilityStatementLink } from '../AccessibilityStatementDialog';
import { FooterFeedback } from '../landing/equify/shared/FooterFeedback';
import { V2Logo } from './V2Logo';
import type { NavItem } from './NavV2';
import { langPrefix, siteLanguage } from '../../lib/i18n/site';

/** Round 11 (SITE_V2): the footer in the SBC site's columns (components/Footer.tsx there), with today's links. Shared by the hub (round 12). */
export function FooterV2({ items, consentBanner = false, lang = 'he' }: { items: readonly NavItem[]; consentBanner?: boolean; lang?: string }) {
  const L = siteLanguage(lang);
  const t = L.dict(true).footer;
  const home = L.dict(true).homeAria;
  const prefix = langPrefix(lang);
  return (
    <footer className="v2-foot">
      <div className="v2-foot-grid">
        <div className="v2-foot-brand">
          <Link href={prefix || '/'} className="v2-logo">
            <V2Logo suffix={home.replace(/^equify BY SBC/, '')} />
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
          <Link href={`${prefix}/wizard`}>{t.start}</Link>
          <Link href={LEGAL_ROUTES.terms} hrefLang={lang === 'he' ? undefined : 'he'}>
            {t.terms}
          </Link>
          <Link href={LEGAL_ROUTES.privacy} hrefLang={lang === 'he' ? undefined : 'he'}>
            {t.privacy}
          </Link>
          <AccessibilityStatementLink label={lang === 'he' ? undefined : 'Accessibility statement (Hebrew)'} />
          {consentBanner ? (
            <button type="button" className="eq-cc-foot-btn" data-cookie-settings="">
              {t.cookies}
            </button>
          ) : null}
        </div>
        <div>
          <a href="mailto:hello@equify.co.il">hello@equify.co.il</a>
        </div>
      </div>
      <div className="ff">
        <FooterFeedback lang={lang} />
      </div>
      <div className="v2-foot-legal">
        <span>© {new Date().getFullYear()} equify BY SBC</span>
      </div>
    </footer>
  );
}
