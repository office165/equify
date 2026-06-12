import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { probeLocalChromeExecutable } from './resolve_chrome_executable';

const SERVERLESS_SANDBOX_ARGS = ['--no-sandbox', '--disable-setuid-sandbox'] as const;

const PDF_VIEWPORT = { width: 794, height: 1123 } as const;

function disableChromiumGraphics(): void {
  const chromiumWithGraphics = chromium as typeof chromium & {
    setGraphicsMode?: (enabled: boolean) => void;
  };
  chromiumWithGraphics.setGraphicsMode?.(false);
}

async function launchWithSparticuzChromium() {
  disableChromiumGraphics();

  return puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
    defaultViewport: PDF_VIEWPORT,
  });
}

function launchWithLocalChrome(executablePath: string) {
  return puppeteer.launch({
    headless: true,
    executablePath,
    args: [...SERVERLESS_SANDBOX_ARGS],
    defaultViewport: PDF_VIEWPORT,
  });
}

/**
 * Vercel/serverless: puppeteer-core + @sparticuz/chromium (never full puppeteer).
 * Local: PUPPETEER_EXECUTABLE_PATH or OS Chrome (always when present).
 */
export async function getBrowser() {
  if (process.env.VERCEL) {
    return launchWithSparticuzChromium();
  }

  const localChrome = probeLocalChromeExecutable();
  if (localChrome) {
    return launchWithLocalChrome(localChrome.path);
  }

  return launchWithSparticuzChromium();
}
