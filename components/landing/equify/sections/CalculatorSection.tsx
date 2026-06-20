'use client';

import { MicroCalculator } from '../../v2/MicroCalculator';

/** סימולטור שווי חינמי — סליידרים + חישוב בזמן אמת */
export function CalculatorSection() {
  return (
    <section className="sec calc" id="calc">
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow rv">אינדיקציה מהירה</span>
          <h2 className="sec-title rv">
            מכפיל EBITDA
            <br />
            <span className="hl">לפי ענף.</span>
          </h2>
          <p className="sec-sub rv">
            הערכת שווי ראשונית לפי מכפילי שוק. הדוח המלא כולל DCF, מטריצות רגישות ותרחישי Bear/Base/Bull.
          </p>
        </div>
        <MicroCalculator />
      </div>
    </section>
  );
}
