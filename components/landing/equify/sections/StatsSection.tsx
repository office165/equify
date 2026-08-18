'use client';

import { useEffect, useState } from 'react';
import { BidiNumberUnit, durationUnit } from '../../shared/BidiNumberUnit';

const REPORT_COUNT_MIN = 25;

/** פס סטטיסטיקות — מונים מונפשים ב-GSAP + ספירת דוחות אמיתית */
export function StatsSection() {
  const [reportCount, setReportCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/v1/stats/public', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { count?: number } | null) => {
        if (cancelled) return;
        const n = typeof data?.count === 'number' ? data.count : 0;
        setReportCount(n);
      })
      .catch(() => {
        if (!cancelled) setReportCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const showReportCount =
    reportCount !== null && reportCount >= REPORT_COUNT_MIN;

  return (
    <section className="stats">
      <div className="wrap">
        <div className="stats-grid">
          <div className="stat rv">
            <div className="s-num">
              {showReportCount ? (
                <BidiNumberUnit
                  number={
                    <span className="count font-mono tabular-nums" data-to={reportCount}>
                      {reportCount}
                    </span>
                  }
                  unit={<em>+</em>}
                />
              ) : (
                <span className="s-early">בגרסת הרצה · הקצאות מוגבלות</span>
              )}
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
              <span className="font-mono tabular-nums">12</span>
            </div>
            <div className="s-lab">עסקאות M&A ישראל במדגם הכיול</div>
          </div>
        </div>
      </div>
    </section>
  );
}
