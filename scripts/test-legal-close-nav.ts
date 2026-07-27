/**
 * Regression: canNavigateBack() — history length + sessionStorage marker.
 * Run: npm run test:legal-close-nav
 */

import assert from 'node:assert/strict';
import { APP_VISITED_STORAGE_KEY } from '../components/shared/AppVisitedMarker';
import { canNavigateBack } from '../lib/legal/can_navigate_back';

type MockOpts = {
  historyLength: number;
  sessionStorage?: Record<string, string>;
};

function withBrowserMocks<T>(opts: MockOpts, fn: () => T): T {
  const store = opts.sessionStorage ?? {};
  const prevWindow = globalThis.window;
  const prevSessionStorage = globalThis.sessionStorage;

  globalThis.window = {
    history: { length: opts.historyLength },
  } as Window;

  globalThis.sessionStorage = {
    getItem: (key: string) => (key in store ? store[key]! : null),
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: Object.keys(store).length,
  } as Storage;

  try {
    return fn();
  } finally {
    globalThis.window = prevWindow;
    globalThis.sessionStorage = prevSessionStorage;
  }
}

async function main() {
  let passed = 0;

  {
    const result = withBrowserMocks({ historyLength: 1 }, () => canNavigateBack());
    assert.equal(result, false);
    passed += 1;
    console.log(
      '✅ PASS [scenario 1: history.length=1 (new tab) → false → push("/")]',
    );
  }

  {
    const result = withBrowserMocks({ historyLength: 3 }, () => canNavigateBack());
    assert.equal(result, false);
    passed += 1;
    console.log(
      '✅ PASS [scenario 2: history.length=3, no equify_app_visited → false → push("/")]',
    );
  }

  {
    const result = withBrowserMocks(
      {
        historyLength: 3,
        sessionStorage: { [APP_VISITED_STORAGE_KEY]: '1' },
      },
      () => canNavigateBack(),
    );
    assert.equal(result, true);
    passed += 1;
    console.log(
      '✅ PASS [scenario 3: history.length=3, equify_app_visited=1 → true → back()]',
    );
  }

  {
    const result = withBrowserMocks(
      {
        historyLength: 1,
        sessionStorage: { [APP_VISITED_STORAGE_KEY]: '1' },
      },
      () => canNavigateBack(),
    );
    assert.equal(result, false);
    passed += 1;
    console.log(
      '✅ PASS [scenario 4: history.length=1 even with marker set → false (history first)]',
    );
  }

  console.log(`\nALL ${passed} / ${passed} LEGAL CLOSE NAV CHECKS PASSED`);
}

main().catch((err) => {
  console.error('❌ FAIL', err);
  process.exit(1);
});
