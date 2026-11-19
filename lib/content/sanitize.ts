/**
 * Round 12 (CONTENT_HUB): the HTML of a post comes from our own sources (the bundle and SBC's journalist agent), so this is a net in
 * the manner of sbc-site/lib/sanitize.ts, with an allowlist: only text tags stay; no script, style, iframe, form, object or embed, no
 * event attribute, no style attribute, no javascript: or data: link, and links that leave the site open in a new tab.
 */
const ALLOWED = new Set(['p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'a', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span', 'br', 'hr', 'figure', 'figcaption', 'small', 'sup', 'sub', 'code']);
const DROP_WITH_CONTENT = /<(script|style|iframe|object|embed|form|noscript|template|svg|math)\b[\s\S]*?<\/\1\s*>/gi;
const KEEP_ATTRS: Record<string, string[]> = { a: ['href', 'title'], td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan', 'scope'], div: ['class'], span: ['class'], p: ['class'] };

const escapeAttr = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function safeHref(raw: string): string | null {
  const v = raw.trim().replace(/[\u0000-\u001F\s]+/g, '');
  if (/^(javascript|data|vbscript):/i.test(v)) return null;
  if (/^(https?:\/\/|\/|#|mailto:)/i.test(v) || !/^[a-z][a-z0-9+.-]*:/i.test(v)) return raw.trim();
  return null;
}

export function sanitizePostHtml(html: string): string {
  let out = String(html ?? '').replace(DROP_WITH_CONTENT, '').replace(/<!--[\s\S]*?-->/g, '');
  out = out.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (tag, nameRaw: string, attrs: string) => {
    const name = nameRaw.toLowerCase();
    if (!ALLOWED.has(name)) return '';
    if (tag.startsWith('</')) return `</${name}>`;
    const kept: string[] = [];
    const allowed = KEEP_ATTRS[name] ?? [];
    for (const m of attrs.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
      const attr = m[1].toLowerCase();
      const value = m[3] ?? m[4] ?? m[5] ?? '';
      if (!allowed.includes(attr)) continue;
      if (attr === 'href') {
        const href = safeHref(value);
        if (href === null) continue;
        kept.push(`href="${escapeAttr(href)}"`);
        if (/^https?:\/\//i.test(href) && !/^https?:\/\/(www\.)?equify\.co\.il/i.test(href)) kept.push('target="_blank"', 'rel="noopener noreferrer"');
        continue;
      }
      if (attr === 'class' && !/^[\w -]{1,80}$/.test(value)) continue;
      kept.push(`${attr}="${escapeAttr(value)}"`);
    }
    const self = name === 'br' || name === 'hr';
    return `<${name}${kept.length ? ' ' + kept.join(' ') : ''}${self ? ' /' : ''}>`;
  });
  return out;
}
