'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { V2Logo } from './V2Logo';

/**
 * Round 11 (SITE_V2): the header of the SBC site (components/Nav.tsx and SiteChrome.tsx there): the logo, the links, then on one line
 * the theme switch and the one call to action, and a phone menu that keeps the page behind it out of reach while it is open.
 * The links and their words are today's (components/landing/equify/shared/LandingNav.tsx).
 */
export type NavItem = readonly [href: string, label: string];

export function NavV2({
  items,
  cta,
  ctaHref = '/wizard',
  homeHref = '/',
  homeAria = 'equify BY SBC, דף הבית',
  lang = 'he',
  extra,
}: {
  items: readonly NavItem[];
  cta: string;
  ctaHref?: string;
  homeHref?: string;
  homeAria?: string;
  lang?: 'he' | 'en';
  extra?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const he = lang === 'he';

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        setScrolled(window.scrollY > 40);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.querySelectorAll('main, footer').forEach((el) => el.toggleAttribute('inert', open));
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) menuRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <nav id="eqv2-nav" className={scrolled ? 'scrolled' : ''} aria-label={he ? 'ניווט ראשי' : 'Main navigation'}>
        <Link href={homeHref} className="v2-logo">
          <V2Logo suffix={homeAria.replace(/^equify BY SBC/, '')} />
        </Link>
        <div className="v2-links">
          {items.map(([href, label]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </div>
        <div className="v2-actions">
          {extra}
          <ThemeToggle lang={lang} />
          <Link className="v2-btn" href={ctaHref}>
            {cta} <span className="arr">{he ? '←' : '→'}</span>
          </Link>
          <button
            id="eqv2-burger"
            type="button"
            aria-label={open ? (he ? 'סגירת תפריט' : 'Close menu') : he ? 'פתיחת תפריט' : 'Open menu'}
            aria-expanded={open}
            aria-controls="eqv2-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>
      <div
        id="eqv2-menu"
        ref={menuRef}
        className={open ? 'open' : ''}
        role="dialog"
        aria-modal="true"
        aria-label={he ? 'תפריט' : 'Menu'}
        {...(open ? {} : { inert: '' as unknown as boolean })}
      >
        {items.map(([href, label]) => (
          <a key={href} href={href} onClick={() => setOpen(false)}>
            {label}
          </a>
        ))}
        <Link href={ctaHref} onClick={() => setOpen(false)}>
          {cta}
        </Link>
      </div>
    </>
  );
}
