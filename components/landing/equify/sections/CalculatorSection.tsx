'use client';

import { MicroCalculator } from '../../v2/MicroCalculator';

/** סימולטור שווי חינמי — סליידרים + חישוב בזמן אמת */
export function CalculatorSection() {
  return (
    <section className="sec calc" id="calc">
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow rv">סימולטור שווי · חינם</span>
          <h2 className="sec-title rv">
            הזז את הסליידרים.
            <br />
            <span className="hl">ראה את השווי זז.</span>
          </h2>
          <p className="sec-sub rv">
            אינדיקציה ראשונית בזמן אמת על בסיס מכפילי שוק ישראליים. הדוח המלא מריץ 11 מודלים — זה רק
            הטיזר.
          </p>
        </div>
        <MicroCalculator />
      </div>
    </section>
  );
}
