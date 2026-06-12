import { sanitizePdfBase64 } from './sanitize_pdf_base64';

export type RelayPdfCaptureMode = 'text_only' | 'with_pdf';

export interface RelayPdfBufferExtraction {
  pdfBuffer: Buffer | null;
  mode: RelayPdfCaptureMode;
  sanitizedBase64: string;
}

/**
 * Decode inbound relay PDF base64 once at the route boundary.
 * Empty / missing payloads enter text-only lead capture (no file providers).
 */
export function extractRelayPdfBuffer(
  rawPdfBase64: string | null | undefined,
): RelayPdfBufferExtraction {
  if (rawPdfBase64 == null || rawPdfBase64 === '') {
    console.log('DEBUG: Processing text-only asynchronous lead capture step.');
    return { pdfBuffer: null, mode: 'text_only', sanitizedBase64: '' };
  }

  const sanitizedBase64 = sanitizePdfBase64(String(rawPdfBase64));
  if (!sanitizedBase64) {
    console.log('DEBUG: Processing text-only asynchronous lead capture step.');
    return { pdfBuffer: null, mode: 'text_only', sanitizedBase64: '' };
  }

  const pdfBuffer = Buffer.from(sanitizedBase64, 'base64');
  if (!pdfBuffer.byteLength) {
    console.log('DEBUG: Processing text-only asynchronous lead capture step.');
    return { pdfBuffer: null, mode: 'text_only', sanitizedBase64: '' };
  }

  console.log('DEBUG: PDF binary buffer ready. Byte size:', pdfBuffer.byteLength);
  return { pdfBuffer, mode: 'with_pdf', sanitizedBase64 };
}
