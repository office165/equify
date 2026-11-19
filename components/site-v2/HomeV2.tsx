'use client';

import Link from 'next/link';
import { INDUSTRY_CONFIG } from '../../lib/constants/industry_config';
import { useSiteFlags } from '../shared/SiteFlagsContext';
import { BidiNumberUnit, DurationValue, durationUnit } from '../landing/shared/BidiNumberUnit';
import { MicroCalculator } from '../landing/v2/MicroCalculator';
import { VALUATION_METHODOLOGY_COPY } from '../landing/equify/equify-data';
import { useLandingCopy } from '../landing/equify/use_landing_copy';
import { NavV2 } from './NavV2';
import { FooterV2 } from './FooterV2';
import { HUB_NAV } from '../../lib/content/hub_nav';

/**
 * Round 11 (SITE_V2): the home page in the structure of the SBC site (bands with straight edges, section heads with a hairline,
 * numbers as rows, the steps as an index, cards with one radius, the footer in columns), in equify's colours, day and night.
 * Every section, word, number, price and link is today's (components/landing/equify/*, through useLandingCopy, so COPY_V2 applies
 * here too). Nothing is added and nothing is removed; the moving band, the 3D terrain, the glow and the "SCROLL" hint are not part of
 * this design language (sbc-brand), so their content is shown still: the band's items as one quiet line.
 */
const NAV_ITEMS = [
  ['#how', 'איך זה עובד'],
  ['#calc', 'סימולטור שווי'],
  ['#models', 'המודלים'],
  ['#price', 'תמחור'],
  ['#faq', 'שאלות'],
] as const;

function countUniqueSubSectorIds(): number {
  const ids = new Set<string>();
  for (const entry of Object.values(INDUSTRY_CONFIG)) for (const sub of entry.subSectors) ids.add(sub.id);
  return ids.size;
}
const SUB_SECTORS = countUniqueSubSectorIds();

/** The hero card's line: a fixed illustration (today it is drawn by the motion script from the same rising series). */
const SPARK = 'M0 70 L40 64 L80 66 L120 58 L160 55 L200 50 L240 52 L280 41 L320 37 L360 30 L400 22';

export function HomeV2() {
  const { copyV2, consentBanner, contentHub } = useSiteFlags();
  // Round 12: the guides and articles are linked only when CONTENT_HUB is on.
  const navItems = contentHub ? [...NAV_ITEMS, ...HUB_NAV] : NAV_ITEMS;
  const { marquee, models, faq, steps, pricing } = useLandingCopy();

  return (
    <div className="v2" dir="rtl" lang="he">
      <a className="v2-skip" href="#main">
        דלג לתוכן הראשי
      </a>
      <NavV2 items={navItems} cta="התחל הערכה" />

      <main id="main">
        {/* 1. hero */}
        <section className="v2-hero">
          <div className="v2-wrap v2-hero-grid">
            <div>
              <span className="v2-label rv">{copyV2 ? 'equify BY SBC, שוק ישראל 2026' : 'equify BY SBC · שוק ישראל 2026'}</span>
              <h1>
                <span className="ln">
                  <span>שווי העסק שלך.</span>
                </span>
                <span className="ln">
                  <span className="hl">בנתונים.</span>
                </span>
              </h1>
              <p className="v2-hero-sub rv">
                {copyV2
                  ? 'הדוח משלב DCF, מכפילי שוק לפי Damodaran וציון איכות. השווי המוצג הוא ממוצע משוקלל, והמשקל של כל שיטה תלוי בענף, בשלב החיים ובגודל העסק.'
                  : 'הדוח משלב DCF, מכפילי שוק מכוילים וציון איכות. השווי המוצג הוא ממוצע משוקלל שמשקף את מעשי השוק, לא תיאוריה אקדמית.'}
              </p>
              <div className="v2-hero-ctas rv">
                <Link className="v2-btn" href="/wizard">
                  התחל הערכת שווי <span className="arr">←</span>
                </Link>
                <a className="v2-btn ghost" href="#calc">
                  נסה את הסימולטור
                </a>
              </div>
              <ul className="v2-hero-meta rv">
                <li>התחל בחינם, תשלום בהפקת הדוח</li>
                <li>
                  <DurationValue variant="long" />
                </li>
                <li>{copyV2 ? 'דוח PDF, 8 עמודים' : 'דוח PDF · 8 עמודים'}</li>
              </ul>
            </div>

            <figure className="v2-sample rv" aria-label={copyV2 ? 'דוגמה להמחשה, לא עסק אמיתי' : 'דוח לדוגמה · 8 עמודים'}>
              <div className="v2-sample-top">
                <span>{copyV2 ? 'שווי לבעלים, תרחיש בסיס' : 'שווי לבעלים · תרחיש בסיס'}</span>
                <span className="v2-sample-tag">{copyV2 ? 'דוגמה להמחשה, לא עסק אמיתי' : 'דוח לדוגמה · 8 עמודים'}</span>
              </div>
              <div className="v2-sample-val num">
                20.1M<small>₪</small>
              </div>
              <p className="v2-sample-cap">
                {copyV2
                  ? 'משקלות לדוגמה: DCF 50%, EBITDA 30%, הכנסות 20%. בדוח הם לפי הענף'
                  : 'שקלול DCF 50% · מכפיל EBITDA 30% · מכפיל הכנסות 20%'}
              </p>
              <svg viewBox="0 0 400 90" preserveAspectRatio="none" aria-hidden="true">
                <path d={SPARK} />
              </svg>
              <dl className="v2-sample-rows">
                <div>
                  <dt>שווי פעילות (EV)</dt>
                  <dd className="num">₪24.5M</dd>
                </div>
                <div>
                  <dt>חוב נטו</dt>
                  <dd className="num neg">−₪4.4M</dd>
                </div>
                <div className="total">
                  <dt>שווי לבעלים</dt>
                  <dd className="num">₪20.1M</dd>
                </div>
              </dl>
            </figure>
          </div>
        </section>

        {/* 2. the band's items, still */}
        <div className="v2-methods" aria-label="השיטות בדוח">
          <ul className="v2-wrap">
            {marquee.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        {/* 3. why equify */}
        <section className="v2-band">
          <div className="v2-wrap">
            <div className="v2-head solo">
              <h2>למה equify</h2>
            </div>
            <dl className="v2-bridge">
              <div className="v2-bl">
                <dt className="v2-bl-val">8</dt>
                <dd className="v2-bl-txt">עמודי דוח PDF</dd>
              </div>
              <div className="v2-bl">
                <dt className="v2-bl-val">{copyV2 ? 3 : 4}</dt>
                <dd className="v2-bl-txt">
                  שיטות הערכה משוקללות
                  <span>{copyV2 ? 'DCF, EBITDA והכנסות' : 'DCF · EBITDA · הכנסות · נכסים'}</span>
                </dd>
              </div>
              <div className="v2-bl">
                <dt className="v2-bl-val">
                  <BidiNumberUnit number={10} unit={<em>{durationUnit('he', 'short')}</em>} />
                </dt>
                <dd className="v2-bl-txt">מהזנת נתונים עד דוח</dd>
              </div>
              <div className="v2-bl">
                <dt className="v2-bl-val">{SUB_SECTORS}</dt>
                <dd className="v2-bl-txt">
                  {copyV2 ? 'תתי ענפים' : 'תתי-ענפים מכוילים בנפרד'}
                  <span>{copyV2 ? 'לכל תת ענף פרופיל מכפילים משלו' : 'פרופיל מכפילים לכל תת-ענף'}</span>
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* 4. the steps */}
        <section className="v2-band alt" id="how">
          <div className="v2-wrap">
            <span className="v2-label">תהליך הקלט</span>
            <div className="v2-head">
              <h2>
                ארבעה שלבי קלט ל<span className="hl">דוח הערכה מובנה.</span>
              </h2>
              <p>פרופיל, נתונים פיננסיים, מדדי סיכון ומטרת ההערכה. הדוח מופק בסיום ללא ייצוא ידני.</p>
            </div>
            <ol className="v2-steps">
              {steps.map(([num, title, body, tag]) => (
                <li key={num}>
                  <span className="n num">{num}</span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                  <span className="t">{tag}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 5. the calculator */}
        <section className="v2-band" id="calc">
          <div className="v2-wrap">
            <span className="v2-label">אינדיקציה מהירה</span>
            <div className="v2-head">
              <h2>
                מכפיל EBITDA <span className="hl">לפי ענף.</span>
              </h2>
              <p>הערכת שווי ראשונית לפי מכפילי שוק. הדוח המלא כולל DCF, מטריצות רגישות ותרחישי Bear/Base/Bull.</p>
            </div>
            <MicroCalculator />
          </div>
        </section>

        {/* 6. the methods */}
        <section className="v2-band alt" id="models">
          <div className="v2-wrap">
            <span className="v2-label">מתודולוגיה</span>
            <div className="v2-head">
              <h2>
                מתודולוגיה משולבת.<span className="hl"> שווי משוקלל.</span>
              </h2>
              <p>{VALUATION_METHODOLOGY_COPY}</p>
            </div>
            <div className="v2-cards" data-cols={models.length % 3 === 1 ? '2' : '3'}>
              {models.map((m) => (
                <article key={m.title} className="v2-card">
                  <h3>{m.title}</h3>
                  <p>{m.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 7. the price */}
        <section className="v2-band" id="price">
          <div className="v2-wrap">
            <div className="v2-head solo" style={{ textAlign: 'center', justifyItems: 'center' }}>
              <span className="v2-label" style={{ marginBottom: 0 }}>
                תמחור
              </span>
              <h2>
                דוח הערכת שווי <span className="hl">מלא.</span>
              </h2>
            </div>
            <div className="v2-price">
              <span className="v2-price-flag">{copyV2 ? 'מומלץ, סבב נוכחי' : 'מומלץ · סבב נוכחי'}</span>
              <h3>דוח Pro מלא</h3>
              <div className="v2-price-row">
                <span className="v2-price-old num">₪1,990</span>
                <span className="v2-price-new num">₪999</span>
                <span className="v2-price-per">{copyV2 ? 'חד פעמי' : 'חד־פעמי'}</span>
              </div>
              <ul>
                {pricing.map((item) => (
                  <li key={item}>
                    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                      <path d="M3 9.5l4 4 8-9" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link className="v2-btn" href="/wizard">
                התחל הערכה <span className="arr">←</span>
              </Link>
              <p className="v2-price-disc">
                {copyV2 ? 'אינדיקציה אלגוריתמית בלבד. לא ייעוץ השקעות.' : 'אינדיקציה אלגוריתמית בלבד · לא ייעוץ השקעות'}
              </p>
            </div>
          </div>
        </section>

        {/* 8. questions */}
        <section className="v2-band alt" id="faq">
          <div className="v2-wrap">
            <span className="v2-label">שאלות נפוצות</span>
            <div className="v2-head solo">
              <h2>
                שאלות <span className="hl">נפוצות.</span>
              </h2>
            </div>
            <div className="v2-faq">
              {faq.map((item) => (
                <details key={item.q} className="v2-q">
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 9. the last call */}
        <section className="v2-band v2-final">
          <div className="v2-wrap">
            <h2>
              שווי העסק שלך.
              <br />
              <span className="hl">בנתונים.</span>
            </h2>
            <p>
              כולל DCF, מכפילי שוק וניתוח סיכון. <DurationValue variant="long" />
            </p>
            <Link className="v2-btn" href="/wizard">
              התחל הערכה <span className="arr">←</span>
            </Link>
          </div>
        </section>
      </main>

      <FooterV2 items={navItems} consentBanner={consentBanner} />
    </div>
  );
}
