/**
 * Puppeteer proof: legal close back to landing — no preloader remount, scroll restored.
 * Run: npm run test:legal-close-puppeteer  (starts dev server if needed)
 */

import puppeteer from 'puppeteer';

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const SCROLL_TOLERANCE = 80;

async function waitForServer(url: string, attempts = 30): Promise<void> {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Server not reachable at ${url}`);
}

async function main() {
  await waitForServer(BASE);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    console.log('▶ Step 1: Load landing (first visit — preloader may run once)');
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 60_000 });

    await page.waitForFunction(
      () => sessionStorage.getItem('equify_preloader_shown') === '1',
      { timeout: 20_000 },
    );
    console.log('  preloader completed (equify_preloader_shown=1)');

    await page.evaluate(() => {
      (window as unknown as { __equifyNavProbe: number }).__equifyNavProbe = 42;
    });

    console.log('▶ Step 2: Scroll to footer');
    await page.evaluate(() => {
      window.scrollTo(0, Math.max(document.body.scrollHeight - window.innerHeight - 120, 600));
    });
    await new Promise((r) => setTimeout(r, 800));
    const scrollBefore = await page.evaluate(() => window.scrollY);
    console.log(`  scrollY before /terms: ${scrollBefore}`);

    console.log('▶ Step 3: Footer → תנאי שימוש');
    await page.evaluate(() => {
      const link = document.querySelector('footer a[href="/terms"]') as HTMLAnchorElement | null;
      if (!link) throw new Error('terms link missing');
      link.click();
    });
    await page.waitForFunction(() => location.pathname === '/terms', { timeout: 15_000 });
    const savedOnTerms = await page.evaluate(() => sessionStorage.getItem('equify_scroll/'));
    console.log(`  equify_scroll/ after nav to terms: ${savedOnTerms}`);

    console.log('▶ Step 4: Close (X) → back to /');
    await page.click('button[aria-label="סגור"]');
    await page.waitForFunction(() => location.pathname === '/', { timeout: 15_000 });
    await new Promise((r) => setTimeout(r, 600));

    const after = await page.evaluate(() => {
      const loader = document.querySelector('#loader');
      const loaderVisible =
        !!loader &&
        loader.getBoundingClientRect().height > 0 &&
        getComputedStyle(loader).visibility !== 'hidden' &&
        getComputedStyle(loader).display !== 'none';
      const nav = performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined;
      return {
        scrollY: window.scrollY,
        loaderInDom: !!loader,
        loaderVisible,
        navType: nav?.type ?? 'unknown',
        probe: (window as unknown as { __equifyNavProbe?: number }).__equifyNavProbe,
        preloaderFlag: sessionStorage.getItem('equify_preloader_shown'),
        savedScroll: sessionStorage.getItem('equify_scroll/'),
      };
    });

    console.log('\n=== MEASUREMENTS ===');
    console.log(`scrollY before /terms:     ${scrollBefore}`);
    console.log(`scrollY after close (X):   ${after.scrollY}`);
    console.log(`scroll delta:              ${Math.abs(after.scrollY - scrollBefore)} (tolerance ${SCROLL_TOLERANCE})`);
    console.log(`#loader in DOM:            ${after.loaderInDom}`);
    console.log(`#loader visible:           ${after.loaderVisible}`);
    console.log(`navigation.type:           ${after.navType} (expect navigate, not reload)`);
    console.log(`window.__equifyNavProbe:   ${after.probe} (expect 42 — no full document reload)`);
    console.log(`equify_preloader_shown:    ${after.preloaderFlag}`);
    console.log(`equify_scroll/ saved:      ${after.savedScroll}`);

    const checks: Array<[string, boolean]> = [
      ['no visible preloader after back', !after.loaderVisible],
      ['scroll restored within tolerance', Math.abs(after.scrollY - scrollBefore) <= SCROLL_TOLERANCE],
      ['no full document reload (probe survived)', after.probe === 42],
      ['navigation.type is not reload', after.navType !== 'reload'],
      ['preloader flag still set', after.preloaderFlag === '1'],
    ];

    let passed = 0;
    for (const [label, ok] of checks) {
      console.log(`${ok ? '✅' : '❌'} ${label}`);
      if (ok) passed += 1;
    }

    console.log(`\nALL ${passed} / ${checks.length} LEGAL CLOSE PUPPETEER CHECKS PASSED`);

    if (passed !== checks.length) process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('❌ FAIL', err);
  process.exit(1);
});
