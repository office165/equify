'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { AccessibilityStatementLink } from '../../AccessibilityStatementDialog';
import { LEGAL_ROUTES } from '../../../lib/legal/routes';
import { useReducedMotion } from '../motion/useReducedMotion';
import { MicroCalculator } from './MicroCalculator';
import { useCashFlowTerrain } from './useCashFlowTerrain';
import { BidiNumberUnit, DurationValue, durationUnit } from '../shared/BidiNumberUnit';
import { SectionEyebrow } from '../equify/shared/SectionEyebrow';
import { useLandingMotion } from './useLandingMotion';
import './landing-v2.css';

const MARQUEE_ITEMS = [
  'DCF + WACC',
  'מכפיל EBITDA',
  'מכפיל הכנסות',
  'פרמיית סיכון מדינה — Damodaran',
  'תרחישי Bear / Base / Bull',
  'נתוני M&A ישראל 2023–2026',
  'Quality Score',
  'שווי משולב',
];

const MODELS = [
  {
    title: 'DCF + WACC',
    body: 'היוון תזרימי מזומנים עם עלות הון 12%–22%, כולל פרמיית סיכון מדינה לפי Damodaran.',
  },
  {
    title: 'מכפיל EBITDA',
    body: 'מכויל מול 12 עסקאות M&A ישראליות אמיתיות מהשנים 2023–2026.',
  },
  {
    title: 'מכפיל הכנסות',
    body: 'לעסקים בצמיחה מהירה או לפני רווחיות — עם התאמת ענף ושלב.',
  },
  {
    title: 'שווי נכסי',
    body: 'רצפת שווי על בסיס נכסים מוחשיים, מלאי והון חוזר.',
  },
  {
    title: 'Quality Score',
    body: 'הכנסות חוזרות, ריכוז לקוחות ותלות במייסד — מתורגמים לציון איכות שמכייל את המודל.',
  },
  {
    title: 'Bear / Base / Bull',
    body: 'שלושה תרחישים מלאים בכל דוח, כדי שתדע לא רק כמה — אלא באיזה טווח.',
  },
];

const FAQ = [
  {
    q: 'כמה זמן לוקחת ההערכה?',
    a: '10–12 דקות בממוצע. האשף מחולק לארבעה שלבים קצרים, ואפשר לעצור ולחזור בכל רגע. הדוח מופק מיידית בסיום.',
  },
  {
    q: 'האם הדוח מוכר משפטית?',
    a: 'הדוח הוא אינדיקציית שווי אלגוריתמית מקצועית — מצוין למשא ומתן, גיוס, שותפויות והבנת העסק. הוא אינו חוות דעת חשבונאית חתומה לצרכי בית משפט או רשות המסים.',
  },
  {
    q: 'אילו נתונים צריך להכין?',
    a: 'הכנסות שנתיות, EBITDA (או רווח תפעולי), חוב נטו ותחזית צמיחה. אם יש דוח רווח והפסד — מצוין. אם אין, האשף ידריך אתכם להערכות סבירות.',
  },
  {
    q: 'האם הנתונים שלי מאובטחים?',
    a: 'כן. הנתונים מוצפנים בתעבורה ובאחסון, אינם נמכרים ואינם משותפים עם צד שלישי. הדוח נגיש רק לכם.',
  },
  {
    q: 'מה ההבדל בין DCF למכפילים?',
    a: 'DCF מהוון את תזרימי המזומנים העתידיים לפי עלות הון (WACC) — מבט קדימה. מכפילים משווים אתכם לעסקאות אמיתיות בשוק — מבט הצידה. הדוח משקלל את שניהם לשווי משולב אחד.',
  },
];

export function LandingPageV2() {
  const reducedMotion = useReducedMotion();
  const [loaderVisible, setLoaderVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const terrainRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const heroValRef = useRef<HTMLSpanElement>(null);
  const sparkLineRef = useRef<SVGPathElement>(null);
  const sparkFillRef = useRef<SVGPathElement>(null);
  const tiltCardRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const stepsGridRef = useRef<HTMLDivElement>(null);
  const beamRef = useRef<HTMLElement>(null);
  const priceCardRef = useRef<HTMLDivElement>(null);
  const quotaNumRef = useRef<HTMLSpanElement>(null);
  const quotaBarRef = useRef<HTMLElement>(null);

  const onPreloadComplete = useCallback(() => setLoaderVisible(false), []);

  useCashFlowTerrain(terrainRef, { enabled: !reducedMotion, reducedMotion });
  useLandingMotion({
    reducedMotion,
    onPreloadComplete,
    heroValRef,
    sparkLineRef,
    sparkFillRef,
    loaderRef,
    navRef,
    beamRef,
    stepsGridRef,
    priceCardRef,
    quotaNumRef,
    quotaBarRef,
    marqueeRef,
    tiltCardRef,
  });

  const closeMenu = () => setMenuOpen(false);

  return (
    <div
      className="landing-v2-root relative min-h-[100dvh] overflow-x-clip pb-safe text-right"
      dir="rtl"
      lang="he"
    >
      {loaderVisible ? (
        <div id="loader" ref={loaderRef} role="status" aria-label="טוען">
          <div className="l-logo">
            equify<em>.</em>
          </div>
          <div className="l-bar">
            <i />
          </div>
          <div className="l-num">0%</div>
        </div>
      ) : null}

      <header className="nav" id="nav" ref={navRef}>
        <div className="wrap nav-in">
          <Link href="/" className="logo">
            equify<em>.</em>
            <small>BY SBC</small>
          </Link>
          <nav className="nav-links" aria-label="ניווט ראשי">
            <a href="#how">איך זה עובד</a>
            <a href="#calc">סימולטור שווי</a>
            <a href="#models">המודלים</a>
            <a href="#price">תמחור</a>
            <a href="#faq">שאלות</a>
          </nav>
          <div className="flex items-center gap-3.5">
            <Link className="btn magnetic" href="/wizard">
              התחל הערכה <span className="arr">←</span>
            </Link>
            <button
              type="button"
              className="burger"
              aria-label="פתח תפריט"
              onClick={() => setMenuOpen(true)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <div className={`mmenu${menuOpen ? ' open' : ''}`} id="mmenu">
        <button type="button" className="close" aria-label="סגור" onClick={closeMenu}>
          ✕
        </button>
        <a href="#how" onClick={closeMenu}>
          איך זה עובד
        </a>
        <a href="#calc" onClick={closeMenu}>
          סימולטור שווי
        </a>
        <a href="#models" onClick={closeMenu}>
          המודלים
        </a>
        <a href="#price" onClick={closeMenu}>
          תמחור
        </a>
        <a href="#faq" onClick={closeMenu}>
          שאלות
        </a>
      </div>

      <section className="hero">
        <div id="terrain" ref={terrainRef} aria-hidden="true" />
        <div className="wrap hero-in">
          <div>
            <span className="eyebrow rv">equify BY SBC · שוק ישראל 2026</span>
            <h1 className="h-title">
              <span className="ln">
                <span>שווי העסק שלך.</span>
              </span>
              <span className="ln">
                <span className="hl">בנתונים.</span>
              </span>
            </h1>
            <p className="h-sub rv">
              שלוש שיטות הערכה — DCF, מכפילי שוק וניתוח סיכון — ממד אחד. דוח עם מתודולוגיה ברורה, טבלאות
              רגישות וציון איכות.
            </p>
            <div className="h-cta rv">
              <Link className="btn magnetic" href="/wizard">
                התחל הערכת שווי <span className="arr">←</span>
              </Link>
              <a className="btn btn-ghost magnetic" href="#calc">
                נסה את הסימולטור
              </a>
            </div>
            <div className="h-note rv">
              <span>
                <i />ללא כרטיס אשראי
              </span>
              <span>
                <i />
                <DurationValue variant="long" />
              </span>
              <span>
                <i />PDF להורדה מיידית
              </span>
            </div>
          </div>

          <div className="tick-card rv-l" id="tiltCard" ref={tiltCardRef}>
            <span className="tc-badge">דוח לדוגמה · 7 עמודים</span>
            <div className="tc-top">
              <span>שווי לבעלים · תרחיש בסיס</span>
              <span className="tc-live">
                <i />
                LIVE
              </span>
            </div>
            <div className="tc-val">
              <span id="heroVal" ref={heroValRef}>
                0.0
              </span>
              M ₪
            </div>
            <div className="tc-cap">שווי משולב — DCF + מכפילים ישראליים</div>
            <svg className="tc-spark" viewBox="0 0 400 90" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#00C2B8" stopOpacity=".35" />
                  <stop offset="1" stopColor="#00C2B8" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path className="fill" ref={sparkFillRef} d="" />
              <path className="line" ref={sparkLineRef} d="" />
            </svg>
            <div className="tc-rows">
              <div className="tc-row">
                <span>שווי פעילות (EV)</span>
                <b>₪24.5M</b>
              </div>
              <div className="tc-row">
                <span>חוב נטו</span>
                <b className="neg">−₪4.4M</b>
              </div>
              <div className="tc-row total">
                <span>שווי לבעלים</span>
                <b>₪20.1M</b>
              </div>
            </div>
          </div>
        </div>
        <div className="scroll-hint" aria-hidden="true">
          SCROLL
          <i />
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="mq-track" id="mq" ref={marqueeRef}>
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={`${item}-${i}`}>{item}</span>
          ))}
        </div>
      </div>

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
              <div className="s-lab">עסקים הוערכו במערכת</div>
            </div>
            <div className="stat rv">
              <div className="s-num">
                <span className="count bidi-num-unit__num" data-to="11">
                  0
                </span>
              </div>
              <div className="s-lab">מודלים ומכפילים פיננסיים</div>
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
              <div className="s-lab">זמן ממוצע להשלמת דוח</div>
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
              <div className="s-lab">נתוני שוק ישראלי מעודכנים</div>
            </div>
          </div>
        </div>
      </section>

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
            {[
              ['01', 'פרופיל וזיהוי', 'שם, חברה, ח.פ., טלפון ואימייל — הבסיס לדוח ולגישה מאובטחת.', '~2 דקות'],
              ['02', 'נתונים פיננסיים', 'הכנסות, EBITDA, חוב נטו ותחזיות — המנוע בונה DCF ומכפילים.', '~4 דקות'],
              ['03', 'סיכון ורגישות', 'הכנסות חוזרות, ריכוז לקוחות, תחרות ותלות במייסד — מכיילים את עלות ההון.', '~3 דקות'],
              ['04', 'דוח והורדה', 'בחירת מטרת ההערכה, אישור תנאים — וקבלת PDF עם שווי משולב.', '~1 דקה'],
            ].map(([num, title, body, tag]) => (
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

      <section className="sec calc" id="calc">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow rv">סימולטור שווי · חינם</span>
            <h2 className="sec-title rv">
              הזז את הסליידרים.
              <br />
              <span className="hl">ראה את השווי זז.</span>
            </h2>
            <p className="sec-sub rv">
              אינדיקציה ראשונית בזמן אמת על בסיס מכפילי שוק ישראליים. הדוח המלא מריץ 11 מודלים — זה רק
              הטיזר.
            </p>
          </div>
          <MicroCalculator />
        </div>
      </section>

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
            {MODELS.map((m) => (
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

      <section className="sec price" id="price">
        <div className="wrap">
          <div className="sec-head sec-head--center">
            <SectionEyebrow centered>תמחור</SectionEyebrow>
            <h2 className="sec-title rv">
              דוח אחד. <span className="hl">מחיר אחד.</span>
            </h2>
          </div>
          <div className="price-card rv" id="priceCard" ref={priceCardRef}>
            <div className="price-in">
              <span className="p-flag">מומלץ · סבב נוכחי</span>
              <h3 className="p-name">דוח Pro מלא</h3>
              <div className="p-row">
                <span className="p-old">₪1,990</span>
                <span className="p-new">₪999</span>
                <span className="p-per">חד־פעמי</span>
              </div>
              <ul className="p-list">
                {[
                  'DCF + WACC + מכפילים ישראליים 2026',
                  'שווי משולב (DCF + מכפילים) עם טווח רגישות',
                  'ניתוח AI + דוח PDF מקצועי של 7 עמודים',
                  'תרחישי Bear / Base / Bull מלאים',
                ].map((item) => (
                  <li key={item}>
                    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                      <path
                        d="M3 9.5l4 4 8-9"
                        stroke="#00C2B8"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                      />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link className="btn magnetic" href="/wizard" style={{ width: '100%', justifyContent: 'center' }}>
                נצל את המחיר <span className="arr">←</span>
              </Link>
              <div className="p-quota">
                <div className="q-top">
                  <span>הקצאות לסבב הנוכחי</span>
                  <b>
                    <span id="qNum" ref={quotaNumRef}>
                      0
                    </span>
                    /100 נתפסו
                  </b>
                </div>
                <div className="q-bar">
                  <i id="qBar" ref={quotaBarRef} />
                </div>
              </div>
              <p className="p-disc">אינדיקציה אלגוריתמית בלבד · לא ייעוץ השקעות</p>
            </div>
          </div>
        </div>
      </section>

      <section className="sec" id="faq">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow rv">שאלות נפוצות</span>
            <h2 className="sec-title rv">
              מה שכולם <span className="hl">שואלים.</span>
            </h2>
          </div>
          <div className="faq-list">
            {FAQ.map((item) => (
              <details key={item.q} className="faq rv">
                <summary>
                  {item.q}
                  <span className="fx" />
                </summary>
                <div className="fa-body">
                  <p>{item.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="final">
        <div className="wrap">
          <h2 className="f-title rv">
            מוכן לדעת
            <br />
            כמה <span className="hl">שווה העסק שלך?</span>
          </h2>
          <Link className="btn magnetic" href="/wizard">
            התחל עכשיו <span className="arr">←</span>
          </Link>
          <p className="f-note">ממוצע 12 דקות · ללא התחייבות · ללא כרטיס אשראי</p>
        </div>
      </section>

      <footer>
        <div className="wrap foot">
          <Link href="/" className="logo">
            equify<em>.</em>
            <small>BY SBC</small>
          </Link>
          <div className="f-links">
            <Link href="/wizard">התחל הערכה</Link>
            <Link href={LEGAL_ROUTES.terms}>תנאי שימוש</Link>
            <Link href={LEGAL_ROUTES.privacy}>פרטיות</Link>
            <AccessibilityStatementLink />
            <a href="mailto:hello@equify.co.il">hello@equify.co.il</a>
          </div>
          <span className="copy">© {new Date().getFullYear()} equify BY SBC</span>
        </div>
      </footer>
    </div>
  );
}
