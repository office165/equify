/**
 * Browser helpers — convert PDF blobs to clean base64 for API relay.
 */

/** Strip data-URI prefix and whitespace from a base64 PDF string. */
export function cleanPdfBase64String(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const dataUriMatch = /^data:[^;]+;base64,(.+)$/i.exec(trimmed);
  if (dataUriMatch?.[1]) {
    return dataUriMatch[1].replace(/\s/g, '');
  }

  return trimmed.replace(/\s/g, '');
}

/** Read a PDF Blob as a raw base64 string (no data-URI prefix). */
export function blobToPdfBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Failed to read PDF blob as base64.'));
        return;
      }
      const base64 = cleanPdfBase64String(reader.result);
      if (!base64) {
        reject(new Error('PDF blob produced empty base64.'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('FileReader failed while encoding PDF.'));
    };
    reader.readAsDataURL(blob);
  });
}
