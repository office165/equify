import { BidiNumberUnit, durationUnit } from '../../shared/BidiNumberUnit';

/**
 * פס סטטיסטיקות קבוע — עונה על התנגדויות נפוצות.
 * /api/v1/stats/public נשאר בשרת; יוחזר לכאן כשהספירה תעבור 25.
 */
export function StatsSection() {
  return (
    <section className="stats">
      <div className="wrap">
        <p className="stats-kicker">למה equify</p>
        <div className="stats-grid">
          <div className="stat rv">
            <div className="s-num">8</div>
            <div className="s-lab">עמודי דוח PDF</div>
          </div>
          <div className="stat rv">
            <div className="s-num">4</div>
            <div className="s-lab">שיטות הערכה משוקללות</div>
            <div className="s-sub">DCF · EBITDA · הכנסות · נכסים</div>
          </div>
          <div className="stat rv">
            <div className="s-num">
              <BidiNumberUnit
                number={10}
                unit={<em>{durationUnit('he', 'short')}</em>}
              />
            </div>
            <div className="s-lab">מהזנת נתונים עד דוח</div>
          </div>
          <div className="stat rv">
            <div className="s-num">
              <BidiNumberUnit number={0} unit={<em>₪</em>} />
            </div>
            <div className="s-lab">להתחלה</div>
            <div className="s-sub">תשלום רק בהפקת הדוח</div>
          </div>
        </div>
      </div>
    </section>
  );
}
