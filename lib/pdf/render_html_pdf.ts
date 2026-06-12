import type { Browser } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { getBrowser } from './getBrowser';

const PDF_VIEWPORT_WIDTH = 794;
const PDF_VIEWPORT_HEIGHT = 1123;

/** Launch ל-Vercel/serverless — @sparticuz/chromium + puppeteer-core בלבד */
export async function launchVercelChromiumBrowser(): Promise<Browser> {
  const chromiumWithGraphics = chromium as typeof chromium & {
    setGraphicsMode?: (enabled: boolean) => void;
  };
  chromiumWithGraphics.setGraphicsMode?.(false);

  return puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

async function resolvePdfBrowser(): Promise<Browser> {
  if (process.env.VERCEL) {
    return launchVercelChromiumBrowser();
  }
  return getBrowser();
}

/** מרנדר HTML מוכן להדפסה ל-PDF באמצעות puppeteer-core */
export async function renderHtmlToPdfBuffer(
  html: string,
  browserInstance?: Browser,
): Promise<Buffer> {
  const ownsBrowser = browserInstance == null;
  const browser = browserInstance ?? (await resolvePdfBrowser());

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: PDF_VIEWPORT_WIDTH,
      height: PDF_VIEWPORT_HEIGHT,
      deviceScaleFactor: 1,
    });
    await page.emulateMediaType('print');

    await page.setContent(html, {
      waitUntil: 'networkidle0' as 'load',
      timeout: 45_000,
    });

    const fontsReadyHandle = await page.evaluateHandle(() => document.fonts.ready);
    await fontsReadyHandle.evaluate(async (ready) => {
      await (ready as unknown as Promise<FontFaceSet>);
    });
    await fontsReadyHandle.dispose();

    await new Promise((resolve) => setTimeout(resolve, 200));

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
