'use client';

import { useSiteFlags } from '../../../shared/SiteFlagsContext';
import { HUB_NAV } from '../../../../lib/content/hub_nav';
import Link from 'next/link';
import type { RefObject } from 'react';
import { EquifyLogo } from '../../../brand/EquifyLogo';
import { useIsMobile } from '../../../landing/motion/useReducedMotion';

interface LandingNavProps {
  navRef: RefObject<HTMLElement>;
  menuOpen: boolean;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
}

const NAV_LINKS = [
  ['#how', 'איך זה עובד'],
  ['#calc', 'סימולטור שווי'],
  ['#models', 'המודלים'],
  ['#price', 'תמחור'],
  ['#faq', 'שאלות'],
] as const;

/** ניווט קבוע + תפריט מובייל */
export function LandingNav({ navRef, menuOpen, onOpenMenu, onCloseMenu }: LandingNavProps) {
  const mobile = useIsMobile();
  // Round 12: the guides and articles are linked only when CONTENT_HUB is on.
  const { contentHub } = useSiteFlags();
  const links = contentHub ? [...NAV_LINKS, ...HUB_NAV] : NAV_LINKS;

  return (
    <>
      <header className="nav" id="nav" ref={navRef}>
        <div className="wrap nav-in">
          <Link href="/" className="logo" aria-label="equify BY SBC, דף הבית">
            <EquifyLogo variant="dark-bg" compact={mobile} decorative />
          </Link>
          <nav className="nav-links" aria-label="ניווט ראשי">
            {links.map(([href, label]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3.5">
            <Link className="btn magnetic" href="/wizard">
              התחל הערכה <span className="arr">←</span>
            </Link>
            <button type="button" className="burger" aria-label="פתח תפריט" onClick={onOpenMenu}>
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <div
        className={`mmenu${menuOpen ? ' open' : ''}`}
        id="mmenu"
        aria-hidden={!menuOpen}
      >
        <button type="button" className="close" aria-label="סגור" onClick={onCloseMenu}>
          ✕
        </button>
        {links.map(([href, label]) => (
          <a key={href} href={href} onClick={onCloseMenu}>
            {label}
          </a>
        ))}
      </div>
    </>
  );
}
