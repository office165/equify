import { launchPdfChromium } from './launch_chromium';

/** @deprecated Prefer launchPdfChromium — kept for scripts that import getBrowser */
export async function getBrowser() {
  return launchPdfChromium();
}
