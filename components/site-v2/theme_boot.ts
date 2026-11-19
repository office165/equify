/**
 * Round 11 (SITE_V2): day and night, as on the SBC site (components/SiteChrome.tsx and the boot script in A11yWidget.tsx there),
 * with one change asked for: until the visitor chooses, the theme follows the device (prefers-color-scheme), not dark.
 * The choice is kept in localStorage `equify-theme`. This runs in <head> before the first paint, so there is no flash.
 */
export const THEME_KEY = 'equify-theme';
export const THEME_COLORS = { dark: '#050F0D', light: '#F6FAF9' } as const;

export const THEME_BOOT = `(function(){var d=document.documentElement,t=null;try{t=localStorage.getItem('${THEME_KEY}')}catch(e){}
if(t!=='light'&&t!=='dark'){try{t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}catch(e){t='dark'}}
d.setAttribute('data-eq-theme',t);d.classList.add('eq-v2');
try{if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('eq-anim')}catch(e){}
var c=t==='light'?'${THEME_COLORS.light}':'${THEME_COLORS.dark}';document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute('content',c)});})();`;

/** The same decision as the boot script, as a function (for tests). */
export function resolveTheme(stored: string | null, prefersLight: boolean): 'light' | 'dark' {
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersLight ? 'light' : 'dark';
}
