import { INDUSTRY_CONFIG } from '../../../../lib/constants/industry_config';
import { useSiteFlags } from '../../../shared/SiteFlagsContext';
import { BidiNumberUnit, durationUnit } from '../../shared/BidiNumberUnit';

/** Unique sub-sector ids across INDUSTRY_CONFIG (read-only; no calibration edits). */
function countUniqueSubSectorIds(): number {
  const ids = new Set<string>();
  for (const entry of Object.values(INDUSTRY_CONFIG)) {
    for (const sub of entry.subSectors) {
      ids.add(sub.id);
    }
  }
  return ids.size;
}

const CALIBRATED_SUB_SECTOR_COUNT = countUniqueSubSectorIds();

/**
 * פס סטטיסטיקות קבוע — עונה על התנגדויות נפוצות.
 * /api/v1/stats/public נשאר בשרת; יוחזר לכאן כשהספירה תעבור 25.
 */
export function StatsSection() {
  const { copyV2 } = useSiteFlags();
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
            <div className="s-num">{copyV2 ? 3 : 4}</div>
            <div className="s-lab">שיטות הערכה משוקללות</div>
            <div className="s-sub">{copyV2 ? 'DCF, EBITDA והכנסות' : 'DCF · EBITDA · הכנסות · נכסים'}</div>
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
            <div className="s-num">{CALIBRATED_SUB_SECTOR_COUNT}</div>
            <div className="s-lab">{copyV2 ? 'תתי ענפים' : 'תתי-ענפים מכוילים בנפרד'}</div>
            <div className="s-sub">{copyV2 ? 'לכל תת ענף פרופיל מכפילים משלו' : 'פרופיל מכפילים לכל תת-ענף'}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
