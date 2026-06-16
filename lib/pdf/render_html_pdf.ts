import type { Browser } from 'puppeteer-core';
import { launchPdfChromium } from './launch_chromium';

const PDF_VIEWPORT_WIDTH = 794;
const PDF_VIEWPORT_HEIGHT = 1123;

export { launchPdfChromium as launchVercelChromiumBrowser } from './launch_chromium';

/** מרנדר HTML מוכן להדפסה ל-PDF — respects @page A4 + .page breaks */
export async function renderHtmlToPdfBuffer(
  html: string,
  browserInstance?: Browser,
): Promise<Buffer> {
  const ownsBrowser = browserInstance == null;
  const browser = browserInstance ?? (await launchPdfChromium());

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: PDF_VIEWPORT_WIDTH,
      height: PDF_VIEWPORT_HEIGHT,
      deviceScaleFactor: 1,
    });

    await page.emulateMediaType('print');

    await page.setContent(html, {
      waitUntil: 'load',
      timeout: 60_000,
    });

    await page.evaluate(async () => {
      await document.fonts.ready;
      document.querySelectorAll('.page').forEach((el) => {
        el.getBoundingClientRect();
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 350));

    const pdfUint8 = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    return Buffer.from(pdfUint8);
  } finally {
    if (ownsBrowser) {
      await browser.close();
    }
  }
}
