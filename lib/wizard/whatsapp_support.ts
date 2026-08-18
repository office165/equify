/**
 * Public WhatsApp support URL from NEXT_PUBLIC_WHATSAPP_SUPPORT_URL.
 * Returns null when unset — callers must hide the link (never fall back to wa.me/).
 */

export function readWhatsAppSupportBase(): string | null {
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_URL?.trim();
  if (!raw) return null;
  if (raw === 'https://wa.me/' || raw === 'https://wa.me') return null;
  return raw;
}

export function buildWhatsAppSupportUrl(prefillText?: string): string | null {
  const base = readWhatsAppSupportBase();
  if (!base) return null;
  const text = prefillText?.trim();
  if (!text) return base;
  const joiner = base.includes('?') ? '&' : '?';
  return `${base}${joiner}text=${encodeURIComponent(text)}`;
}
