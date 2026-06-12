/** Guardrail: detect display-scale values accidentally stored as absolutes. */
export function ensureAbsolute(val: unknown): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  if (n > 0 && n < 1000) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[ValuationAPI] Suspiciously small value:',
        val,
        '— check SmartNumberInput absoluteValue',
      );
    }
  }
  return n;
}
