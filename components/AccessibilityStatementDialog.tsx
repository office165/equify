'use client';

import Link from 'next/link';
import { LEGAL_ROUTES } from '../lib/legal/routes';

export interface AccessibilityStatementLinkProps {
  className?: string;
}

/** Footer link to full accessibility statement page */
export function AccessibilityStatementLink({
  className,
  label = 'הצהרת נגישות',
}: AccessibilityStatementLinkProps & { label?: string }) {
  return (
    <Link
      href={LEGAL_ROUTES.accessibility}
      className={
        className ??
        'text-xs text-mint-400 underline-offset-2 transition hover:text-mint-400 hover:underline'
      }
      hrefLang={label === 'הצהרת נגישות' ? undefined : 'he'}
    >
      {label}
    </Link>
  );
}
