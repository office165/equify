'use client';

import Link from 'next/link';
import { DurationValue } from '../../shared/BidiNumberUnit';

/** קריאה לפעולה סופית לפני הפוטר */
export function FinalCtaSection() {
  return (
    <section className="final">
      <div className="wrap">
        <h2 className="f-title rv">
          שווי העסק שלך.
          <br />
          <span className="hl">בנתונים.</span>
        </h2>
        <p className="f-note rv" style={{ marginTop: '1rem', maxWidth: '32rem', marginInline: 'auto' }}>
          DCF · מכפילי שוק · ניתוח סיכון ·{' '}
          <DurationValue variant="long" />
        </p>
        <Link className="btn magnetic" href="/wizard">
          התחל הערכה <span className="arr">←</span>
        </Link>
      </div>
    </section>
  );
}
