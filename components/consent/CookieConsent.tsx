'use client';

import { useEffect, useRef, useState } from 'react';
import { readConsent, saveConsent } from '../../lib/consent/consent';
import { LEGAL_ROUTES } from '../../lib/legal/routes';

/**
 * Round 10 (CONSENT_BANNER): the cookie banner, built on the SBC site's banner (components/CookieConsent.tsx there): small, at the
 * bottom, never blocks the page. "אישור הכל", "הגדרות" (measurement and marketing apart) and "רק הכרחיות". Until a choice is made
 * nothing beyond what the site needs is loaded. Any element with data-cookie-settings (the "הגדרות עוגיות" link) opens it again.
 */
export { CONSENT_TEXT, CONSENT_TEXT_EN } from '../../lib/consent/consent_text';
import { CONSENT_TEXT, CONSENT_TEXT_EN } from '../../lib/consent/consent_text';



export function CookieConsent({ lang = 'he' }: { lang?: string } = {}) {
  const t = lang === 'he' ? CONSENT_TEXT : CONSENT_TEXT_EN;
  const he = lang === 'he';
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [a, setA] = useState(false);
  const [m, setM] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!readConsent()) setOpen(true);
    const onClick = (e: MouseEvent) => {
      if (!(e.target as Element | null)?.closest?.('[data-cookie-settings]')) return;
      e.preventDefault();
      const now = readConsent();
      setA(now?.a ?? false);
      setM(now?.m ?? false);
      setSettings(true);
      setOpen(true);
      requestAnimationFrame(() => box.current?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus());
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const choose = (measurement: boolean, marketing: boolean) => {
    saveConsent(measurement, marketing);
    setOpen(false);
    setSettings(false);
  };

  if (!open) return null;
  return (
    <div ref={box} className="eq-cc" role="region" aria-label={t.region} data-nosnippet="" dir={he ? 'rtl' : 'ltr'} lang={he ? 'he' : lang}>
      <p className="eq-cc-text">
        {t.text}{' '}
        <a href={LEGAL_ROUTES.privacy} hrefLang={he ? undefined : 'he'}>
          {t.policy}
        </a>
      </p>
      {settings && (
        <fieldset className="eq-cc-set">
          <legend className="eq-cc-legend">{t.settings}</legend>
          <label className="eq-cc-row">
            <input type="checkbox" checked disabled />
            <span>{t.necessary}</span>
          </label>
          <label className="eq-cc-row">
            <input type="checkbox" checked={a} onChange={(e) => setA(e.target.checked)} data-consent="a" />
            <span>{t.measurement}</span>
          </label>
          <label className="eq-cc-row">
            <input type="checkbox" checked={m} onChange={(e) => setM(e.target.checked)} data-consent="m" />
            <span>{t.marketing}</span>
          </label>
        </fieldset>
      )}
      <div className="eq-cc-btns">
        {settings ? (
          <button type="button" className="eq-cc-btn eq-cc-yes" onClick={() => choose(a, m)}>
            {t.save}
          </button>
        ) : (
          <button type="button" className="eq-cc-btn eq-cc-yes" onClick={() => choose(true, true)}>
            {t.acceptAll}
          </button>
        )}
        {!settings && (
          <button type="button" className="eq-cc-btn" aria-expanded={false} onClick={() => setSettings(true)}>
            {t.more}
          </button>
        )}
        <button type="button" className="eq-cc-btn" onClick={() => choose(false, false)}>
          {t.necessaryOnly}
        </button>
      </div>
    </div>
  );
}
