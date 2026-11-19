'use client';

import Link from 'next/link';
import { INDUSTRY_CONFIG } from '../../lib/constants/industry_config';
import { useSiteFlags } from '../shared/SiteFlagsContext';
import { BidiNumberUnit, DurationValue, durationUnit } from '../landing/shared/BidiNumberUnit';
import { MicroCalculator } from '../landing/v2/MicroCalculator';
import { NavV2, type NavItem } from './NavV2';
import { FooterV2 } from './FooterV2';
import { HUB_NAV } from '../../lib/content/hub_nav';
import { siteLanguage, langPrefix } from '../../lib/i18n/site';

/**
 * Round 11 (SITE_V2): the home page in the structure of the SBC site (bands with straight edges, section heads with a hairline,
 * numbers as rows, the steps as an index, cards with one radius, the footer in columns), in equify's colours, day and night.
 * Every section, word, number, price and link is today's. Nothing is added and nothing is removed; the moving band, the 3D terrain,
 * the glow and the "SCROLL" hint are not part of this design language (sbc-brand), so their content is shown still.
 * Round 13: the words come from the language file (lib/i18n/site/<lang>.ts); Hebrew is today's text, word for word.
 */
function countUniqueSubSectorIds(): number {
  const ids = new Set<string>();
  for (const entry of Object.values(INDUSTRY_CONFIG)) for (const sub of entry.subSectors) ids.add(sub.id);
  return ids.size;
}
const SUB_SECTORS = countUniqueSubSectorIds();

/** The hero card's line: a fixed illustration (today it is drawn by the motion script from the same rising series). */
const SPARK = 'M0 70 L40 64 L80 66 L120 58 L160 55 L200 50 L240 52 L280 41 L320 37 L360 30 L400 22';

export function HomeV2({ lang = 'he' }: { lang?: string }) {
  const { copyV2, consentBanner, contentHub } = useSiteFlags();
  const L = siteLanguage(lang);
  const t = L.dict(copyV2);
  const { marquee, models, faq, steps, pricing } = L.lists(copyV2);
  const he = L.def.dir === 'rtl';
  const prefix = langPrefix(lang);
  const loc = L.def.appLocale;
  const arrow = he ? '←' : '→';
  // Round 12: the guides and articles are linked only when CONTENT_HUB is on.
  const hubItems: NavItem[] = HUB_NAV.map(([href, label]) => [`${prefix}${href}`, lang === 'he' ? label : href === '/guides' ? t.hub.guides : t.hub.articles] as const);
  const navItems: readonly NavItem[] = contentHub ? [...t.nav, ...hubItems] : t.nav;
  const wizard = `${prefix}/wizard`;

  return (
    <div className="v2" dir={L.def.dir} lang={L.def.code}>
      <a className="v2-skip" href="#main">
        {t.skip}
      </a>
      <NavV2 items={navItems} cta={t.cta} ctaHref={wizard} homeHref={prefix || '/'} homeAria={t.homeAria} lang={loc} />

      <main id="main">
        {/* 1. hero */}
        <section className="v2-hero">
          <div className="v2-wrap v2-hero-grid">
            <div>
              <span className="v2-label rv">{t.hero.label}</span>
              <h1>
                <span className="ln">
                  <span>{t.hero.h1a}</span>
                </span>
                <span className="ln">
                  <span className="hl">{t.hero.h1b}</span>
                </span>
              </h1>
              <p className="v2-hero-sub rv">{t.hero.sub}</p>
              <div className="v2-hero-ctas rv">
                <Link className="v2-btn" href={wizard}>
                  {t.hero.start} <span className="arr">{arrow}</span>
                </Link>
                <a className="v2-btn ghost" href="#calc">
                  {t.hero.simulator}
                </a>
              </div>
              <ul className="v2-hero-meta rv">
                <li>{t.hero.meta[0]}</li>
                <li>
                  <DurationValue variant="long" locale={loc} />
                </li>
                <li>{t.hero.meta[2]}</li>
              </ul>
            </div>

            <figure className="v2-sample rv" aria-label={t.sample.aria}>
              <div className="v2-sample-top">
                <span>{t.sample.top}</span>
                <span className="v2-sample-tag">{t.sample.tag}</span>
              </div>
              <div className="v2-sample-val num">
                20.1M<small>₪</small>
              </div>
              <p className="v2-sample-cap">{t.sample.cap}</p>
              <svg viewBox="0 0 400 90" preserveAspectRatio="none" aria-hidden="true">
                <path d={SPARK} />
              </svg>
              <dl className="v2-sample-rows">
                <div>
                  <dt>{t.sample.ev}</dt>
                  <dd className="num">₪24.5M</dd>
                </div>
                <div>
                  <dt>{t.sample.netDebt}</dt>
                  <dd className="num neg">−₪4.4M</dd>
                </div>
                <div className="total">
                  <dt>{t.sample.equity}</dt>
                  <dd className="num">₪20.1M</dd>
                </div>
              </dl>
            </figure>
          </div>
        </section>

        {/* 2. the band's items, still */}
        <div className="v2-methods" aria-label={t.methodsAria}>
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
              <h2>{t.why.title}</h2>
            </div>
            <dl className="v2-bridge">
              <div className="v2-bl">
                <dt className="v2-bl-val">8</dt>
                <dd className="v2-bl-txt">{t.why.pages}</dd>
              </div>
              <div className="v2-bl">
                <dt className="v2-bl-val">{t.why.methodsCount}</dt>
                <dd className="v2-bl-txt">
                  {t.why.methods}
                  <span>{t.why.methodsSub}</span>
                </dd>
              </div>
              <div className="v2-bl">
                <dt className="v2-bl-val">
                  <BidiNumberUnit number={10} unit={<em>{durationUnit(loc, 'short')}</em>} />
                </dt>
                <dd className="v2-bl-txt">{t.why.durationLabel}</dd>
              </div>
              <div className="v2-bl">
                <dt className="v2-bl-val">{SUB_SECTORS}</dt>
                <dd className="v2-bl-txt">
                  {t.why.subSectors}
                  <span>{t.why.subSectorsSub}</span>
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* 4. the steps */}
        <section className="v2-band alt" id="how">
          <div className="v2-wrap">
            <span className="v2-label">{t.steps.label}</span>
            <div className="v2-head">
              <h2>
                {t.steps.titleA}
                <span className="hl">{t.steps.titleHl}</span>
              </h2>
              <p>{t.steps.sub}</p>
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
            <span className="v2-label">{t.calc.label}</span>
            <div className="v2-head">
              <h2>
                {t.calc.titleA}
                <span className="hl">{t.calc.titleHl}</span>
              </h2>
              <p>{t.calc.sub}</p>
            </div>
            <MicroCalculator lang={loc} wizardHref={wizard} />
          </div>
        </section>

        {/* 6. the methods */}
        <section className="v2-band alt" id="models">
          <div className="v2-wrap">
            <span className="v2-label">{t.models.label}</span>
            <div className="v2-head">
              <h2>
                {t.models.titleA}
                <span className="hl">{t.models.titleHl}</span>
              </h2>
              <p>{t.models.sub}</p>
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
                {t.price.label}
              </span>
              <h2>
                {t.price.titleA}
                <span className="hl">{t.price.titleHl}</span>
              </h2>
            </div>
            <div className="v2-price">
              <span className="v2-price-flag">{t.price.flag}</span>
              <h3>{t.price.name}</h3>
              <div className="v2-price-row">
                {t.price.old ? <span className="v2-price-old num">{t.price.old}</span> : null}
                <span className="v2-price-new num">{t.price.now}</span>
                <span className="v2-price-per">{t.price.per}</span>
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
              <Link className="v2-btn" href={wizard}>
                {t.price.cta} <span className="arr">{arrow}</span>
              </Link>
              <p className="v2-price-disc">{t.price.disc}</p>
            </div>
          </div>
        </section>

        {/* 8. questions */}
        <section className="v2-band alt" id="faq">
          <div className="v2-wrap">
            <span className="v2-label">{t.faqTitle.label}</span>
            <div className="v2-head solo">
              <h2>
                {t.faqTitle.titleA}
                <span className="hl">{t.faqTitle.titleHl}</span>
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
              {t.final.a}
              <br />
              <span className="hl">{t.final.b}</span>
            </h2>
            <p>
              {t.final.note} <DurationValue variant="long" locale={loc} />
            </p>
            <Link className="v2-btn" href={wizard}>
              {t.final.cta} <span className="arr">{arrow}</span>
            </Link>
          </div>
        </section>
      </main>

      <FooterV2 items={navItems} consentBanner={consentBanner} lang={lang} />
    </div>
  );
}
