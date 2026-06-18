export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

const ACCEPTED_LOGO_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg']);

export function isAcceptedLogoFile(file: File): boolean {
  return ACCEPTED_LOGO_MIME.has(file.type);
}

/** Safe check before rendering a user-uploaded logo in DOM or PDF HTML */
export function isValidLogoDataUrl(url?: string | null): url is string {
  const raw = url?.trim();
  if (!raw) return false;
  return /^data:image\/(png|jpeg|jpg);base64,/i.test(raw);
}
