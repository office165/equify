import fs from 'fs';
import os from 'os';

export type ChromeExecutableSource =
  | 'env'
  | 'mac'
  | 'linux'
  | 'windows'
  | 'sparticuz';

export interface ResolvedChromeExecutable {
  path: string;
  source: ChromeExecutableSource;
}

const MAC_CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
];

const LINUX_CHROME_PATHS = [
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/snap/bin/chromium',
];

const WIN_CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  `${process.env.LOCALAPPDATA ?? ''}\\Google\\Chrome\\Application\\chrome.exe`,
];

function firstExistingPath(paths: string[]): string | undefined {
  return paths.find((candidate) => {
    const trimmed = candidate.trim();
    return trimmed.length > 0 && fs.existsSync(trimmed);
  });
}

/** Sync probe: env var → OS-specific well-known Chrome installs. */
export function probeLocalChromeExecutable(): ResolvedChromeExecutable | null {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (fromEnv && fs.existsSync(fromEnv)) {
    return { path: fromEnv, source: 'env' };
  }

  const platform = os.platform();
  if (platform === 'darwin') {
    const path = firstExistingPath(MAC_CHROME_PATHS);
    if (path) return { path, source: 'mac' };
  } else if (platform === 'linux') {
    const path = firstExistingPath(LINUX_CHROME_PATHS);
    if (path) return { path, source: 'linux' };
  } else if (platform === 'win32') {
    const path = firstExistingPath(WIN_CHROME_PATHS);
    if (path) return { path, source: 'windows' };
  }

  return null;
}

/**
 * puppeteer-core 25.1.0 ships Chrome 149.0.7827.22 — keep @sparticuz/chromium on 149.x.
 * @see https://pptr.dev/chromium-support
 */
export const PUPPETEER_CHROME_MAJOR = 149;

/** Sparticuz tarball URL for Vercel when the traced bin folder is missing. */
export function getSparticuzRemotePackUrl(): string | undefined {
  const fromEnv = process.env.CHROMIUM_REMOTE_EXEC_PATH?.trim();
  if (fromEnv) return fromEnv;
  return `https://github.com/Sparticuz/chromium/releases/download/v${PUPPETEER_CHROME_MAJOR}.0.0/chromium-v${PUPPETEER_CHROME_MAJOR}.0.0-pack.tar`;
}

/** Async probe: local Chrome → @sparticuz/chromium (with optional remote pack). */
export async function resolveChromeExecutableAsync(): Promise<ResolvedChromeExecutable> {
  const local = probeLocalChromeExecutable();
  if (local) return local;

  const chromium = (await import('@sparticuz/chromium')).default;
  const remotePack = getSparticuzRemotePackUrl();
  const path = await chromium.executablePath(remotePack);
  return { path, source: 'sparticuz' };
}
