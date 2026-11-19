'use client';

import { useSiteFlags } from '../../../shared/SiteFlagsContext';
import Link from 'next/link';
import type { RefObject } from 'react';
import { DurationValue } from '../../shared/BidiNumberUnit';

interface HeroSectionProps {
  terrainRef: RefObject<HTMLDivElement>;
  heroValRef: RefObject<HTMLSpanElement>;
  sparkLineRef: RefObject<SVGPathElement>;
  sparkFillRef: RefObject<SVGPathElement>;
  tiltCardRef: RefObject<HTMLDivElement>;
}

/** סקשן Hero — כותרת, CTA וכרטיס שווי חי */
export function HeroSection({
  terrainRef,
  heroValRef,
  sparkLineRef,
  sparkFillRef,
  tiltCardRef,
}: HeroSectionProps) {
  const { copyV2 } = useSiteFlags();
  return (
    <section className="hero">
      <div id="terrain" ref={terrainRef} aria-hidden="true" />
      <div className="wrap hero-in">
        <div>
          <span className="eyebrow rv">{copyV2 ? 'equify BY SBC, שוק ישראל 2026' : 'equify BY SBC · שוק ישראל 2026'}</span>
          <h1 className="h-title">
            <span className="ln">
              <span>שווי העסק שלך.</span>
            </span>
            <span className="ln">
              <span className="hl">בנתונים.</span>
            </span>
          </h1>
          {copyV2 ? (
            <p className="h-sub rv">
              הדוח משלב DCF, מכפילי שוק לפי Damodaran וציון איכות. השווי המוצג הוא ממוצע משוקלל, והמשקל של כל
              שיטה תלוי בענף, בשלב החיים ובגודל העסק.
            </p>
          ) : (
            <p className="h-sub rv">
              הדוח משלב DCF, מכפילי שוק מכוילים וציון איכות. השווי המוצג הוא ממוצע משוקלל שמשקף את
              מעשי השוק, לא תיאוריה אקדמית.
            </p>
          )}
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
              <i />התחל בחינם, תשלום בהפקת הדוח
            </span>
            <span>
              <i />
              <DurationValue variant="long" />
            </span>
            <span>
              <i />
              {copyV2 ? 'דוח PDF, 8 עמודים' : 'דוח PDF · 8 עמודים'}
            </span>
          </div>
        </div>

        <div className="tick-card rv-l" id="tiltCard" ref={tiltCardRef}>
          <span className="tc-badge">{copyV2 ? 'דוגמה להמחשה, לא עסק אמיתי' : 'דוח לדוגמה · 8 עמודים'}</span>
          <div className="tc-top">
            <span>{copyV2 ? 'שווי לבעלים, תרחיש בסיס' : 'שווי לבעלים · תרחיש בסיס'}</span>
            <span className="tc-live">
              <i />
              {copyV2 ? 'דוגמה' : 'LIVE'}
            </span>
          </div>
          <div className="tc-val">
            <span id="heroVal" ref={heroValRef}>
              0.0
            </span>
            M ₪
          </div>
          <div className="tc-cap">
            {copyV2
              ? 'משקלות לדוגמה: DCF 50%, EBITDA 30%, הכנסות 20%. בדוח הם לפי הענף'
              : 'שקלול DCF 50% · מכפיל EBITDA 30% · מכפיל הכנסות 20%'}
          </div>
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
  );
}
