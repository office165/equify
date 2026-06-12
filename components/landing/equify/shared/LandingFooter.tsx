'use client';

import Link from 'next/link';
import { AccessibilityStatementLink } from '../../../AccessibilityStatementDialog';

/** פוטר דף הנחיתה */
export function LandingFooter() {
  return (
    <footer>
      <div className="wrap foot">
        <Link href="/" className="logo">
          equify<em>.</em>
          <small>BY SBC</small>
        </Link>
        <div className="f-links">
          <Link href="/wizard">התחל הערכה</Link>
          <a href="#">תנאי שימוש</a>
          <a href="#">פרטיות</a>
          <AccessibilityStatementLink />
          <a href="mailto:hello@equify.co.il">hello@equify.co.il</a>
        </div>
        <span className="copy">© {new Date().getFullYear()} equify BY SBC</span>
      </div>
    </footer>
  );
}
