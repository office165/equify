/** Silence engine diagnostic logs ([FCF Audit] etc.) while running many cases. */
export function withQuietConsole<T>(fn: () => T): T {
  const orig = { log: console.log, info: console.info, warn: console.warn, debug: console.debug };
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.debug = () => {};
  try {
    return fn();
  } finally {
    console.log = orig.log;
    console.info = orig.info;
    console.warn = orig.warn;
    console.debug = orig.debug;
  }
}
