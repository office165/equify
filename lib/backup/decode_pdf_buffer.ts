import { sanitizePdfBase64 } from './sanitize_pdf_base64';

/** Decode inbound base64 (raw or data-URI) into a Node.js PDF buffer. */
export function decodePdfBase64ToBuffer(
  raw: string | undefined | null,
): Buffer | null {
  const normalized = sanitizePdfBase64(String(raw ?? ''));
  if (!normalized) {
    return null;
  }

  const buffer = Buffer.from(normalized, 'base64');
  if (!buffer.length) {
    return null;
  }

  const header = buffer.subarray(0, 4).toString('ascii');
  if (header !== '%PDF') {
    console.error(
      'CRITICAL ERROR: Decoded pdfBase64 is missing PDF magic header (%PDF).',
      { header, bytes: buffer.length },
    );
  }

  return buffer;
}
