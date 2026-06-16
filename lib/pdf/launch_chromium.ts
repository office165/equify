import chromium from '@sparticuz/chromium';
import type { Browser } from 'puppeteer-core';
import puppeteer from 'puppeteer-core';
import { probeLocalChromeExecutable } from './resolve_chrome_executable';

const PDF_VIEWPORT = { width: 794, height: 1123, deviceScaleFactor: 1 } as const;

const LOCAL_CHROME_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
] as const;

/** Vercel + AWS Lambda runtimes (not local `vercel dev` with a desktop Chrome). */
export function isServerlessPdfRuntime(): boolean {
  return (
    process.env.VERCEL === '1' ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    Boolean(process.env.AWS_EXECUTION_ENV)
  );
}

function disableChromiumGraphics(): void {
  const chromiumWithGraphics = chromium as typeof chromium & {
    setGraphicsMode?: (enabled: boolean) => void;
  };
  chromiumWithGraphics.setGraphicsMode?.(false);
}

/** Launch headless Chromium for PDF — @sparticuz/chromium on Vercel/Lambda, local Chrome otherwise. */
export async function launchPdfChromium(): Promise<Browser> {
  disableChromiumGraphics();

  if (isServerlessPdfRuntime()) {
    const executablePath = await chromium.executablePath();
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: PDF_VIEWPORT,
      executablePath,
      headless: true,
    });
  }

  const localChrome = probeLocalChromeExecutable();
  if (localChrome) {
    return puppeteer.launch({
      headless: true,
      executablePath: localChrome.path,
      args: [...LOCAL_CHROME_ARGS],
      defaultViewport: PDF_VIEWPORT,
    });
  }

  const executablePath = await chromium.executablePath();
  return puppeteer.launch({
    args: [...chromium.args, ...LOCAL_CHROME_ARGS],
    defaultViewport: PDF_VIEWPORT,
    executablePath,
    headless: true,
  });
}
