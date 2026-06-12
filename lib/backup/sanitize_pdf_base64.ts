/** Normalize client PDF payloads (raw base64 or data-URI). */
export function sanitizePdfBase64(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const dataUriMatch = /^data:[^;]+;base64,(.+)$/i.exec(trimmed);
  if (dataUriMatch?.[1]) {
    return dataUriMatch[1].trim();
  }

  return trimmed;
}
