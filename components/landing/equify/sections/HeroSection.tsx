'use client';

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
  return (
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
            שלושה יסודות: DCF, מכפילי שוק מכוילים וציון איכות. השווי המוצג הוא ממוצע משוקלל — מעשי
            השוק, לא אקדמי.
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
              <i />דוח PDF · 8 עמודים
            </span>
          </div>
        </div>

        <div className="tick-card rv-l" id="tiltCard" ref={tiltCardRef}>
          <span className="tc-badge">דוח לדוגמה · 8 עמודים</span>
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
          <div className="tc-cap">שקלול DCF 50% · מכפיל EBITDA 30% · מכפיל הכנסות 20%</div>
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
