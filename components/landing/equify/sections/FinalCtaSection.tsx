'use client';

import Link from 'next/link';

/** קריאה לפעולה סופית לפני הפוטר */
export function FinalCtaSection() {
  return (
    <section className="final">
      <div className="wrap">
        <h2 className="f-title rv">
          מוכן לדעת
          <br />
          כמה <span className="hl">שווה העסק שלך?</span>
        </h2>
        <Link className="btn magnetic" href="/wizard">
          התחל עכשיו <span className="arr">←</span>
        </Link>
        <p className="f-note">ממוצע 12 דקות · ללא התחייבות · ללא כרטיס אשראי</p>
      </div>
    </section>
  );
}
