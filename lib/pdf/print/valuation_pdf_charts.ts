import type {
  MultiplePositionRow,
  TrajectoryYear,
  WaccSegment,
} from './valuation_pdf_view_model';
import { fmtMoneyCompact } from './print_formatters';

const TRAJECTORY = {
  x0: 70,
  groupWidth: 115,
  barW: 30,
  gap: 6,
  baseY: 240,
  plotH: 230,
  chartTop: 10,
};

export function buildFinancialTrajectoryBarsSvg(
  years: TrajectoryYear[],
  ceilingM: number,
): string {
  if (!years.length || ceilingM <= 0) return '';

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const y = TRAJECTORY.baseY - t * TRAJECTORY.plotH;
    const val = (ceilingM * t).toFixed(1);
    return `<line class="gridln" x1="40" x2="750" y1="${y}" y2="${y}"/>
      <text class="axis" x="32" y="${y + 4}" text-anchor="end">${val}</text>`;
  });

  const bars = years
    .map((year, i) => {
      const xRev = TRAJECTORY.x0 + i * TRAJECTORY.groupWidth;
      const xEbt = xRev + TRAJECTORY.barW + TRAJECTORY.gap;
      const revH = (year.revenueM / ceilingM) * TRAJECTORY.plotH;
      const ebtH = (year.ebitdaM / ceilingM) * TRAJECTORY.plotH;
      const revY = TRAJECTORY.baseY - revH;
      const ebtY = TRAJECTORY.baseY - ebtH;
      const opacity = year.forecast ? 0.55 : 1;
      const centerX = xRev + TRAJECTORY.barW + TRAJECTORY.gap / 2;
      return `<rect x="${xRev}" y="${revY.toFixed(1)}" width="${TRAJECTORY.barW}" height="${revH.toFixed(1)}" rx="4" fill="#00A89F" opacity="${opacity}"/>
        <rect x="${xEbt}" y="${ebtY.toFixed(1)}" width="${TRAJECTORY.barW}" height="${ebtH.toFixed(1)}" rx="4" fill="#A8842E" opacity="${opacity}"/>
        <text class="axis" x="${centerX}" y="262" text-anchor="middle">${year.label}</text>`;
    })
    .join('');

  return `<svg viewBox="0 0 760 280" style="width:100%" aria-hidden="true">
    <g class="grid">${gridLines.join('')}</g>
    ${bars}
  </svg>`;
}

export function buildWaccDonutSvg(waccPct: number, segments: WaccSegment[]): string {
  const r = 76;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.pct, 0) || waccPct;

  let offset = 0;
  const arcs = segments
    .map((seg) => {
      const dash = (seg.pct / total) * circumference;
      const arc = `<circle cx="100" cy="100" r="${r}" fill="none" stroke="${seg.color}" stroke-width="17"
        stroke-dasharray="${dash.toFixed(1)} ${circumference.toFixed(1)}"
        stroke-dashoffset="${(-offset).toFixed(1)}"
        transform="rotate(-90 100 100)"/>`;
      offset += dash;
      return arc;
    })
    .join('');

  return `<svg viewBox="0 0 200 200" style="width:46mm;margin:2mm auto" aria-hidden="true">
    ${arcs}
    <text x="100" y="96" text-anchor="middle" style="font-family:'IBM Plex Mono',monospace;font-size:26px;font-weight:600;fill:#163530">${waccPct.toFixed(1)}%</text>
    <text x="100" y="116" text-anchor="middle" class="axis" style="letter-spacing:.16em">WACC</text>
  </svg>`;
}

function positionX(value: number, min: number, max: number): number {
  const span = max - min || 1;
  return 120 + ((value - min) / span) * 440;
}

export function buildMultiplesPositionSvg(rows: MultiplePositionRow[]): string {
  const yPositions = [43, 113, 183];
  const labelY = [28, 98, 168];
  const axisY = [64, 134, 199];
  const valueY = [26, 96, 166];

  const content = rows
    .slice(0, 3)
    .map((row, i) => {
      const y = yPositions[i];
      const cx = positionX(row.multiple, row.marketMin, row.marketMax);
      const rangeX = positionX(row.marketMin, row.marketMin, row.marketMax);
      const rangeW = positionX(row.marketMax, row.marketMin, row.marketMax) - rangeX;
      const fillX = rangeX + rangeW * 0.12;
      const fillW = rangeW * 0.78;
      const color = row.color ?? '#00A89F';
      const multLabel =
        row.id === 'dcf'
          ? fmtMoneyCompact(row.impliedEv)
          : `×${row.multiple.toFixed(1)}`;

      return `<text x="712" y="${labelY[i]}" text-anchor="end" style="font-family:Assistant,sans-serif;font-size:12px;font-weight:600;fill:#1E3A36">${row.title}</text>
        <rect x="120" y="${y - 5}" width="440" height="10" rx="5" fill="#F0F8F6"/>
        <rect x="${fillX.toFixed(1)}" y="${y - 5}" width="${fillW.toFixed(1)}" height="10" rx="5" fill="#C5EDE9"/>
        <circle cx="${cx.toFixed(1)}" cy="${y}" r="8" fill="${color}"/>
        <text class="axis" x="120" y="${axisY[i]}">${row.id === 'dcf' ? fmtMoneyCompact(row.marketMin) : `×${row.marketMin.toFixed(1)}`}</text>
        <text class="axis" x="560" y="${axisY[i]}" text-anchor="end">${row.id === 'dcf' ? fmtMoneyCompact(row.marketMax) : `×${row.marketMax.toFixed(1)}`}</text>
        <text x="${cx.toFixed(1)}" y="${valueY[i]}" text-anchor="middle" style="font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;fill:${color}">${multLabel}</text>
        <text x="56" y="${y + 3}" style="font-family:'IBM Plex Mono',monospace;font-size:11px;fill:#527570">${fmtMoneyCompact(row.impliedEv)}</text>`;
    })
    .join('');

  return `<svg viewBox="0 0 720 200" style="width:100%" aria-hidden="true">${content}</svg>`;
}

export function buildScenarioRangeSvg(
  bearEquity: number,
  baseEquity: number,
  bullEquity: number,
): string {
  const min = bearEquity;
  const max = bullEquity;
  const span = max - min || 1;
  const baseX = 50 + ((baseEquity - min) / span) * 620;
  const bullX = 50 + 620;

  return `<svg viewBox="0 0 720 90" style="width:100%" aria-hidden="true">
    <rect x="50" y="34" width="620" height="12" rx="6" fill="#F0F8F6"/>
    <rect x="50" y="34" width="620" height="12" rx="6" fill="url(#rg)" opacity=".75"/>
    <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#C24A4A"/><stop offset=".5" stop-color="#00A89F"/><stop offset="1" stop-color="#A8842E"/>
    </linearGradient></defs>
    <circle cx="50" cy="40" r="7" fill="#C24A4A"/>
    <circle cx="${baseX.toFixed(1)}" cy="40" r="9" fill="#00A89F" stroke="#fff" stroke-width="2.5"/>
    <circle cx="${bullX}" cy="40" r="7" fill="#A8842E"/>
    <text x="50" y="70" text-anchor="middle" style="font-family:'IBM Plex Mono',monospace;font-size:11px;fill:#C24A4A">${fmtMoneyCompact(bearEquity)}</text>
    <text x="${baseX.toFixed(1)}" y="22" text-anchor="middle" style="font-family:'IBM Plex Mono',monospace;font-size:14px;font-weight:600;fill:#163530">${fmtMoneyCompact(baseEquity)}</text>
    <text x="${bullX}" y="70" text-anchor="middle" style="font-family:'IBM Plex Mono',monospace;font-size:11px;fill:#A8842E">${fmtMoneyCompact(bullEquity)}</text>
  </svg>`;
}

export function buildQualityGaugeSvg(score: number, grade: string): string {
  const pct = Math.min(100, Math.max(0, score));
  const arcLen = 377;
  const dash = (pct / 100) * 294;

  return `<svg viewBox="0 0 200 200" style="width:40mm;margin:0 auto" aria-hidden="true">
    <circle cx="100" cy="100" r="80" fill="none" stroke="#F0F8F6" stroke-width="13" stroke-dasharray="377 503" stroke-linecap="round" transform="rotate(135 100 100)"/>
    <circle cx="100" cy="100" r="80" fill="none" stroke="url(#gg)" stroke-width="13" stroke-dasharray="${dash.toFixed(0)} 503" stroke-linecap="round" transform="rotate(135 100 100)"/>
    <defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#00A89F"/><stop offset="1" stop-color="#A8842E"/></linearGradient></defs>
    <text x="100" y="98" text-anchor="middle" style="font-family:'IBM Plex Mono',monospace;font-size:34px;font-weight:600;fill:#163530">${score}</text>
    <text x="100" y="118" text-anchor="middle" class="axis" style="letter-spacing:.14em">QUALITY SCORE</text>
    <text x="100" y="142" text-anchor="middle" style="font-family:'Frank Ruhl Libre',serif;font-size:18px;font-weight:900;fill:#A8842E">${grade}</text>
  </svg>`;
}
