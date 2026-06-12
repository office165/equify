const GAP_CAP_PCT = 150;

export function formatArbitrageGapPct(rawPct: number): string {
  if (!Number.isFinite(rawPct)) return '—';
  if (Math.abs(rawPct) > GAP_CAP_PCT) {
    return 'פער חריג — מומלץ ניתוח ידני';
  }
  return rawPct.toFixed(1);
}

export function isArbitrageGapExtreme(rawPct: number): boolean {
  return Number.isFinite(rawPct) && Math.abs(rawPct) > GAP_CAP_PCT;
}
