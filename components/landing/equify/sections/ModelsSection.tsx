'use client';

import { LANDING_MODELS, VALUATION_METHODOLOGY_COPY } from '../equify-data';

/** רשת כרטיסי מודלים — DCF, מכפילים, תרחישים */
export function ModelsSection() {
  return (
    <section className="sec" id="models">
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow rv">מתודולוגיה</span>
          <h2 className="sec-title rv">
            שלוש יסודות.
            <span className="hl"> שווי משוקלל.</span>
          </h2>
          <p className="sec-sub rv">{VALUATION_METHODOLOGY_COPY}</p>
        </div>
        <div className="models-grid">
          {LANDING_MODELS.map((m) => (
            <div key={m.title} className="mcard rv">
              <div className="mc-glow" />
              <h4>
                <i />
                {m.title}
              </h4>
              <p>{m.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
