'use client';

import { BidiNumberUnit, durationUnit } from '../../shared/BidiNumberUnit';

/** פס סטטיסטיקות — מונים מונפשים ב-GSAP */
export function StatsSection() {
  return (
    <section className="stats">
      <div className="wrap">
        <div className="stats-grid">
          <div className="stat rv">
            <div className="s-num">
              <BidiNumberUnit
                number={
                  <span className="count" data-to="500">
                    0
                  </span>
                }
                unit={<em>+</em>}
              />
            </div>
            <div className="s-lab">הערכות שהושלמו במערכת</div>
          </div>
          <div className="stat rv">
            <div className="s-num">
              <span className="count bidi-num-unit__num" data-to="11">
                0
              </span>
            </div>
            <div className="s-lab">גזרי ערך במשקלול (DCF + מכפילים)</div>
          </div>
          <div className="stat rv">
            <div className="s-num">
              <BidiNumberUnit
                number={
                  <span className="count" data-to="10">
                    0
                  </span>
                }
                unit={<em>{durationUnit('he', 'short')}</em>}
              />
            </div>
            <div className="s-lab">זמן ממוצע להשלמת קלט</div>
          </div>
          <div className="stat rv">
            <div className="s-num">
              <BidiNumberUnit
                prefix={<em>20</em>}
                number={
                  <span className="count" data-to="26">
                    0
                  </span>
                }
              />
            </div>
            <div className="s-lab">עסקאות M&A ישראל במדגם הכיול</div>
          </div>
        </div>
      </div>
    </section>
  );
}
