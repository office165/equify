'use client';

import { LANDING_FAQ } from '../equify-data';

/** שאלות נפוצות — פתיחה/סגירה חלקה דרך GSAP */
export function FaqSection() {
  return (
    <section className="sec" id="faq">
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow rv">שאלות נפוצות</span>
          <h2 className="sec-title rv">
            שאלות <span className="hl">נפוצות.</span>
          </h2>
        </div>
        <div className="faq-list">
          {LANDING_FAQ.map((item) => (
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
  );
}
