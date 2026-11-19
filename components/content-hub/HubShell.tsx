'use client';

import { NavV2, type NavItem } from '../site-v2/NavV2';
import { FooterV2 } from '../site-v2/FooterV2';
import { useSiteFlags } from '../shared/SiteFlagsContext';
import { HUB_NAV } from '../../lib/content/hub_nav';
import { langPrefix, siteLanguage } from '../../lib/i18n/site';

/** Round 12 (CONTENT_HUB): the header and footer of the hub pages, the same as the new home page (round 11). Round 13: in any language. */
export function HubShell({ children, lang = 'he' }: { children: React.ReactNode; lang?: string }) {
  const { consentBanner } = useSiteFlags();
  const L = siteLanguage(lang);
  const t = L.dict(true);
  const prefix = langPrefix(lang);
  const home = (t.nav as readonly NavItem[]).filter(([h]) => h !== '#models').map(([h, label]) => [`${prefix}/${h}`, label] as const);
  const items: NavItem[] = [...home, ...HUB_NAV.map(([h, label]) => [`${prefix}${h}`, lang === 'he' ? label : h === '/guides' ? t.hub.guides : t.hub.articles] as const)];
  return (
    <div className="v2 eq-hub" dir={L.def.dir} lang={L.def.code}>
      <a className="v2-skip" href="#main">
        {t.skip}
      </a>
      <NavV2 items={items} cta={t.cta} ctaHref={`${prefix}/wizard`} homeHref={prefix || '/'} homeAria={t.homeAria} lang={L.def.appLocale} />
      <main id="main" className="hub-page">
        {children}
      </main>
      <FooterV2 items={items} consentBanner={consentBanner} lang={lang} />
    </div>
  );
}
