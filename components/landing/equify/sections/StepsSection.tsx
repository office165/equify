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
          <span className="eyebrow rv">איך זה עובד</span>
          <h2 className="sec-title rv">
            מארבעה שלבים
            <br />
            ל<span className="hl">דוח מקצועי.</span>
          </h2>
          <p className="sec-sub rv">
            אשף מונחה שאוסף נתונים, מריץ את המודלים ומפיק דוח PDF — בלי יועץ חיצוני ובלי אקסל.
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
