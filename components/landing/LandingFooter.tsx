'use client';

import Link from 'next/link';
import { BRAND_NAME } from '../../lib/brand/brand-identity';
import { AccessibilityStatementLink } from '../AccessibilityStatementDialog';
import { SectionReveal } from '../motion/SectionReveal';

const SOCIAL = [
  { label: 'LinkedIn', href: '#', icon: 'M6 6h3v12H6zm1.5-10a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM13 6h2.8v1.7h.04c.39-.74 1.35-1.52 2.78-1.52 2.97 0 3.52 1.95 3.52 4.48V18H19v-5.6c0-1.34-.03-3.07-1.87-3.07-1.87 0-2.16 1.46-2.16 2.97V18h-3V6z' },
  { label: 'WhatsApp', href: '#', icon: 'M12 2C6.48 2 2 6.03 2 11c0 1.74.5 3.36 1.36 4.74L2 22l6.45-1.28A9.9 9.9 0 0 0 12 20c5.52 0 10-4.03 10-9S17.52 2 12 2z' },
  { label: 'Email', href: 'mailto:hello@equify.co.il', icon: 'M4 6h16v12H4V6zm2 2 6 4 6-4' },
] as const;

export function LandingFooter() {
  return (
    <SectionReveal>
      <footer className="landing-section border-t border-[var(--eq-border-dark)] py-16">
        <div className="mb-10 flex items-center justify-center gap-0">
          {SOCIAL.map((item, i) => (
            <div key={item.label} className="flex items-center">
              <a
                href={item.href}
                aria-label={item.label}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--eq-border-dark)] bg-[var(--eq-surface)] text-[var(--eq-muted-on-dark)] transition hover:border-[var(--eq-accent-mint)]/30 hover:text-[var(--eq-accent-mint)]"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d={item.icon} />
                </svg>
              </a>
              {i < SOCIAL.length - 1 ? (
                <span
                  className="mx-2 hidden h-px w-8 border-t border-dotted border-[var(--eq-border-dark)] sm:block"
                  aria-hidden
                />
              ) : null}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-[var(--eq-muted-on-dark)]">
          © {new Date().getFullYear()} {BRAND_NAME}. כל הזכויות שמורות.
        </p>
        <nav
          className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs"
          aria-label="קישורי תחתית"
        >
          <Link href="/wizard" className="text-[var(--eq-muted-on-dark)] transition hover:text-[var(--eq-accent-mint)]">
            התחל הערכה
          </Link>
          <span aria-hidden className="text-[var(--eq-border-dark)]">
            |
          </span>
          <a href="#" className="text-[var(--eq-muted-on-dark)] transition hover:text-[var(--eq-accent-mint)]">
            תנאי שימוש
          </a>
          <span aria-hidden className="text-[var(--eq-border-dark)]">
            |
          </span>
          <a href="#" className="text-[var(--eq-muted-on-dark)] transition hover:text-[var(--eq-accent-mint)]">
            פרטיות
          </a>
          <span aria-hidden className="text-[var(--eq-border-dark)]">
            |
          </span>
          <AccessibilityStatementLink className="!text-xs !text-[var(--eq-muted-on-dark)] hover:!text-[var(--eq-accent-mint)]" />
        </nav>
      </footer>
    </SectionReveal>
  );
}
