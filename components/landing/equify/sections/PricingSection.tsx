'use client';

import Link from 'next/link';
import type { RefObject } from 'react';
import { PRICING_FEATURES } from '../equify-data';

interface PricingSectionProps {
  priceCardRef: RefObject<HTMLDivElement>;
  quotaNumRef: RefObject<HTMLSpanElement>;
  quotaBarRef: RefObject<HTMLElement>;
}

/** כרטיס תמחור — מסגרת conic מונפשת + מד הקצאות */
export function PricingSection({ priceCardRef, quotaNumRef, quotaBarRef }: PricingSectionProps) {
  return (
    <section className="sec price" id="price">
      <div className="wrap">
        <div className="sec-head text-center mx-auto">
          <span className="eyebrow rv justify-center">תמחור</span>
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
              <span className="p-new">₪499</span>
              <span className="p-per">חד־פעמי</span>
            </div>
            <ul className="p-list">
              {PRICING_FEATURES.map((item) => (
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
            <Link className="btn magnetic w-full justify-center" href="/wizard">
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
  );
}
