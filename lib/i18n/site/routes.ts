import { DEFAULT_LANG, isLang, PREFIXED_LANGS } from './index';
import type { SiteFlags } from '../../flags/site_flags';

/** Round 13: which language addresses exist. With EN_SITE off there are none (/en is a 404, as today). */
export function langStaticParams(flags: Pick<SiteFlags, 'enSite'>): Array<{ lang: string }> {
  return flags.enSite ? PREFIXED_LANGS.map((lang) => ({ lang })) : [];
}

export function langAllowed(lang: string, flags: Pick<SiteFlags, 'enSite'>): boolean {
  return flags.enSite && isLang(lang) && lang !== DEFAULT_LANG;
}
