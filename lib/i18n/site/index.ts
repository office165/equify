import he from './he';
import en from './en';
import type { LangDef, SiteLanguage } from './types';

/**
 * Round 13 (EN_SITE): the site's languages, in one list, as on the SBC site (sbc-site/lib/i18n.ts). Hebrew is the default and has no
 * prefix (every address the site always had). Every other language lives under /<code> and is served by app/(intl)/[lang], with its
 * own <html lang dir>. hreflang, the sitemap and the language switch are built from this list.
 *
 * To add a language (see CLAUDE.md): one file, lib/i18n/site/<code>.ts, a SiteLanguage like en.ts; then its import and one entry below.
 * The wizard and the report fall back to English (appLocale 'en') until their tables have the language.
 */
export const SITE_LANGUAGES: readonly SiteLanguage[] = [he, en];

export const LANGS: readonly LangDef[] = SITE_LANGUAGES.map((l) => l.def);
export const DEFAULT_LANG = 'he';
export const PREFIXED_LANGS: readonly string[] = LANGS.map((l) => l.code).filter((c) => c !== DEFAULT_LANG);

export const isLang = (v: unknown): v is string => typeof v === 'string' && LANGS.some((l) => l.code === v);
export const siteLanguage = (code: string): SiteLanguage => SITE_LANGUAGES.find((l) => l.def.code === code) ?? SITE_LANGUAGES[0];
export const langDef = (code: string): LangDef => siteLanguage(code).def;
/** '' for the default language, '/en' for English. */
export const langPrefix = (code: string): string => (code === DEFAULT_LANG ? '' : `/${code}`);
export const langHome = (code: string): string => langPrefix(code) || '/';
export type { LangDef, SiteDict, SiteLanguage, LandingLists } from './types';
