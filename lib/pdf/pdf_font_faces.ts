import fs from 'fs';
import path from 'path';

let cachedFontFaceCss: string | null = null;

function toDataUri(fontPath: string): string | null {
  try {
    if (!fs.existsSync(fontPath)) return null;
    const base64 = fs.readFileSync(fontPath).toString('base64');
    return `data:font/truetype;base64,${base64}`;
  } catch {
    return null;
  }
}

/** Embedded @font-face rules — local files under public/fonts (no CDN at render time). */
export function buildPdfFontFaceCss(): string {
  if (cachedFontFaceCss) return cachedFontFaceCss;

  const fontsDir = path.join(process.cwd(), 'public', 'fonts');
  const regularUri = toDataUri(path.join(fontsDir, 'Heebo-Regular.ttf'));
  const boldUri = toDataUri(path.join(fontsDir, 'Heebo-Bold.ttf'));

  if (regularUri && boldUri) {
    cachedFontFaceCss = `
    @font-face {
      font-family: 'Heebo';
      font-weight: 400;
      font-style: normal;
      src: url('${regularUri}') format('truetype');
    }
    @font-face {
      font-family: 'Heebo';
      font-weight: 700;
      font-style: normal;
      src: url('${boldUri}') format('truetype');
    }`;
  } else {
    cachedFontFaceCss = `
    @font-face {
      font-family: 'Heebo';
      font-weight: 400;
      src: local('Arial'), local('Helvetica Neue');
    }`;
  }

  return cachedFontFaceCss;
}
