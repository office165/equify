import type { DcfRow } from '../types';

/** Static inline SVG for print — no canvas/Recharts/animation. */
export function buildTrajectoryChartSvg(
  rows: DcfRow[],
  opts: { wacc: number; gTerminal: number; marketCap?: number },
): string {
  if (!rows.length) return '';

  const w = 700;
  const h = 300;
  const padL = 56;
  const padR = 24;
  const padT = 28;
  const padB = 48;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const fcffSeries = rows.map((r) => r.fcff ?? 0);
  const evSeries = rows.map((r) => r.cumulativePV ?? 0);
  const maxY = Math.max(...fcffSeries, ...evSeries, opts.marketCap ?? 0, 1);

  const step = rows.length > 1 ? plotW / (rows.length - 1) : 0;

  const toPoint = (values: number[], i: number) => {
    const x = padL + i * step;
    const y = padT + plotH - (values[i] / maxY) * plotH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };

  const fcffLine = fcffSeries.map((_, i) => toPoint(fcffSeries, i)).join(' ');
  const evLine = evSeries.map((_, i) => toPoint(evSeries, i)).join(' ');

  const yTicks = [0, 0.25, 0.5, 0.75, 1]
    .map((t) => {
      const y = padT + plotH - t * plotH;
      const val = maxY * t;
      const label =
        val >= 1_000_000
          ? `${(val / 1_000_000).toFixed(1)}M`
          : val >= 1_000
            ? `${(val / 1_000).toFixed(0)}K`
            : `${Math.round(val)}`;
      return `<line x1="${padL}" y1="${y}" x2="${w - padR}" y2="${y}" stroke="#E2E8F0" stroke-width="0.5"/>
        <text x="${padL - 6}" y="${y + 3}" text-anchor="end" font-size="9" fill="#94A3B8">${label}</text>`;
    })
    .join('');

  const xLabels = rows
    .map((_, i) => {
      const x = padL + i * step;
      return `<text x="${x}" y="${h - 16}" text-anchor="middle" font-size="10" fill="#64748B">Y${i + 1}</text>`;
    })
    .join('');

  const marketLine =
    opts.marketCap && opts.marketCap > 0
      ? (() => {
          const y = padT + plotH - (opts.marketCap! / maxY) * plotH;
          return `<line x1="${padL}" y1="${y}" x2="${w - padR}" y2="${y}" stroke="#F472B6" stroke-width="1.5" stroke-dasharray="6 4"/>
            <text x="${w - padR}" y="${y - 4}" text-anchor="end" font-size="8" fill="#DB2777">שווי שוק</text>`;
        })()
      : '';

  return `<svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="מסלול שווי">
    ${yTicks}
    <line x1="${padL}" y1="${padT + plotH}" x2="${w - padR}" y2="${padT + plotH}" stroke="#CBD5E1" stroke-width="1"/>
    <polyline points="${evLine}" fill="none" stroke="#059669" stroke-width="2.5"/>
    <polyline points="${fcffLine}" fill="none" stroke="#64748B" stroke-width="1.75" stroke-dasharray="5 4"/>
    ${marketLine}
    ${xLabels}
    <text x="${w - padR}" y="16" text-anchor="end" font-size="9" fill="#64748B">WACC ${opts.wacc.toFixed(1)}% · g ${opts.gTerminal.toFixed(1)}%</text>
    <g transform="translate(${padL}, ${h - 6})">
      <rect x="0" y="-22" width="10" height="3" fill="#059669"/>
      <text x="14" y="-18" font-size="9" fill="#334155">מסלול EV מצטבר</text>
      <rect x="120" y="-22" width="10" height="3" fill="#64748B"/>
      <text x="134" y="-18" font-size="9" fill="#334155">תזרים חופשי (FCFF)</text>
    </g>
  </svg>`;
}
