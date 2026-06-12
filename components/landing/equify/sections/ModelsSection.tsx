'use client';

import { LANDING_MODELS } from '../equify-data';

/** רשת כרטיסי מודלים — DCF, מכפילים, תרחישים */
export function ModelsSection() {
  return (
    <section className="sec" id="models">
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow rv">המנוע</span>
          <h2 className="sec-title rv">
            11 מודלים. <span className="hl">דוח אחד.</span>
          </h2>
          <p className="sec-sub rv">
            כל הערכה מריצה את מלוא הסוללה הפיננסית ומשקללת לשווי משולב אחד עם טווח רגישות.
          </p>
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
