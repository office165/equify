'use client';

import type { RefObject } from 'react';
import { LANDING_STEPS } from '../equify-data';

interface StepsSectionProps {
  stepsGridRef: RefObject<HTMLDivElement>;
  beamRef: RefObject<HTMLElement>;
}

/** ארבעה שלבי האשף — עם קרן התקדמות מונפשת */
export function StepsSection({ stepsGridRef, beamRef }: StepsSectionProps) {
  return (
    <section className="sec steps" id="how">
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow rv">תהליך הקלט</span>
          <h2 className="sec-title rv">
            ארבעה שלבי קלט
            <br />
            ל<span className="hl">דוח הערכה מובנה.</span>
          </h2>
          <p className="sec-sub rv">
            פרופיל, נתונים פיננסיים, מדדי סיכון ומטרת ההערכה. הדוח מופק בסיום ללא ייצוא ידני.
          </p>
        </div>
        <div className="steps-grid" id="stepsGrid" ref={stepsGridRef}>
          <div className="steps-beam">
            <i id="beam" ref={beamRef} />
          </div>
          {LANDING_STEPS.map(([num, title, body, tag]) => (
            <div key={num} className="step rv" data-step={num}>
              <span className="st-num">{num}</span>
              <h3>{title}</h3>
              <p>{body}</p>
              <span className="st-tag">{tag}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
