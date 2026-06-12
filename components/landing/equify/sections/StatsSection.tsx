'use client';

/** פס סטטיסטיקות — מונים מונפשים ב-GSAP */
export function StatsSection() {
  return (
    <section className="stats">
      <div className="wrap">
        <div className="stats-grid">
          <div className="stat rv">
            <div className="s-num">
              <span className="count" data-to="500">
                0
              </span>
              <em>+</em>
            </div>
            <div className="s-lab">עסקים הוערכו במערכת</div>
          </div>
          <div className="stat rv">
            <div className="s-num">
              <span className="count" data-to="11">
                0
              </span>
            </div>
            <div className="s-lab">מודלים ומכפילים פיננסיים</div>
          </div>
          <div className="stat rv">
            <div className="s-num">
              <span className="count" data-to="10">
                0
              </span>
              <em>min</em>
            </div>
            <div className="s-lab">זמן ממוצע להשלמת דוח</div>
          </div>
          <div className="stat rv">
            <div className="s-num">
              <em>20</em>
              <span className="count" data-to="26">
                0
              </span>
            </div>
            <div className="s-lab">נתוני שוק ישראלי מעודכנים</div>
          </div>
        </div>
      </div>
    </section>
  );
}
