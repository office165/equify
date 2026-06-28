import { fmtMoneyCompact } from '../pdf/print/print_formatters';
import type { MultiplePositionRow, TrajectoryPoint, WaccSegment } from './types';

const BAR_BASE_Y = 240;
const BAR_MAX_H = 230;
const DONUT_R = 76;
const DONUT_C = 2 * Math.PI * DONUT_R;
const GAUGE_R = 80;
const GAUGE_C = 2 * Math.PI * GAUGE_R;
const GAUGE_ARC = GAUGE_C * 0.75;
const BAR_GROUP_X = [103, 218, 333, 448, 563, 678];

/** Multiples track layout — dedicated RTL label column prevents PDF clipping. */
export const MULTIPLES_VIEW_W = 820;
export const MULTIPLES_TRACK_X = 108;
export const MULTIPLES_TRACK_W = 468;
export const MULTIPLES_LABEL_X = 592;
export const MULTIPLES_LABEL_W = 210;

const MULTIPLES_LABEL_STYLE =
  'direction:rtl;text-align:right;white-space:nowrap;font-family:Assistant,sans-serif;font-size:12px;font-weight:600;color:#1E3A36;line-height:1.25;min-width:120px;overflow:visible;flex-shrink:0;';

const MULTIPLE_TITLES: Record<string, string> = {
  ebitda: 'מכפיל EBITDA',
  revenue: 'מכפיל הכנסות',
  margin: 'שיעור EBITDA',
  dcf: 'DCF (להשוואה)',
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

/** RTL-safe label cell — nowrap + min-width for Hebrew PDF renderers. */
export function multiplesTrackLabelSvg(title: string, y: number): string {
  return `<foreignObject x="${MULTIPLES_LABEL_X}" y="${y - 12}" width="${MULTIPLES_LABEL_W}" height="30" overflow="visible">
    <div xmlns="http://www.w3.org/1999/xhtml" style="${MULTIPLES_LABEL_STYLE}">${escapeHtml(title)}</div>
  </foreignObject>`;
}

function barGeom(valueM: number, maxM: number): { y: number; h: number } {
  const h = maxM > 0 ? (valueM / maxM) * BAR_MAX_H : 0;
  return { y: BAR_BASE_Y - h, h };
}

function trajectoryMaxM(trajectory: TrajectoryPoint[]): number {
  let max = 0;
  for (const row of trajectory) {
    max = Math.max(max, row.revenueM, row.ebitdaM);
  }
  const step = Math.ceil(max / 4.5) * 4.5;
  return Math.max(step, 4.5);
}

function trackX(value: number, min: number, max: number): number {
  const span = max - min || 1;
  return MULTIPLES_TRACK_X + ((value - min) / span) * MULTIPLES_TRACK_W;
}

export function buildEquifyFinancialBarChartSvg(trajectory: TrajectoryPoint[]): string {
  const maxM = trajectoryMaxM(trajectory);
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((t) => {
      const y = BAR_BASE_Y - BAR_MAX_H * t;
      return `<line class="gridln" x1="40" x2="750" y1="${y}" y2="${y}"/><text class="axis" x="32" y="${y + 4}" text-anchor="end">${(maxM * t).toFixed(maxM >= 10 ? 0 : 1)}</text>`;
    })
    .join('');

  const bars = trajectory
    .slice(0, BAR_GROUP_X.length)
    .map((row, i) => {
      const cx = BAR_GROUP_X[i] ?? 103 + i * 115;
      const rev = barGeom(row.revenueM, maxM);
      const ebt = barGeom(row.ebitdaM, maxM);
      const opacity = row.forecast ? ' opacity=".5"' : '';
      const ebtOpacity = row.forecast ? ' opacity=".55"' : '';
      return `<rect x="${cx - 33}" y="${rev.y.toFixed(1)}" width="30" height="${rev.h.toFixed(1)}" rx="4" fill="#00A89F"${opacity}/>
        <rect x="${cx + 3}" y="${ebt.y.toFixed(1)}" width="30" height="${ebt.h.toFixed(1)}" rx="4" fill="#A8842E"${ebtOpacity}/>
        <text class="axis" x="${cx}" y="262" text-anchor="middle">${row.label}</text>`;
    })
    .join('');

  return `<svg viewBox="0 0 760 280" style="width:100%"><g class="grid">${grid}</g>${bars}</svg>`;
}

export function buildEquifyWaccDonutSvg(segments: WaccSegment[], waccPct: number): string {
  const effectiveWacc = segments.reduce((sum, seg) => sum + seg.pct, 0) || waccPct || 0;
  const total = effectiveWacc || 1;
  let offset = 0;
  const arcs = segments
    .map((seg) => {
      const len = (seg.pct / total) * DONUT_C;
      const el = `<circle cx="100" cy="100" r="${DONUT_R}" fill="none" stroke="${seg.color}" stroke-width="17" stroke-dasharray="${len.toFixed(1)} ${DONUT_C.toFixed(1)}" stroke-dashoffset="${(-offset).toFixed(1)}" transform="rotate(-90 100 100)"/>`;
      offset += len;
      return el;
    })
    .join('');

  return `<svg viewBox="0 0 200 200" style="width:46mm;margin:2mm auto">${arcs}
    <text x="100" y="96" text-anchor="middle" style="font-family:'IBM Plex Mono';font-size:26px;font-weight:600;fill:#163530">${effectiveWacc.toFixed(1)}%</text>
    <text x="100" y="116" text-anchor="middle" class="axis" style="letter-spacing:.16em">WACC</text></svg>`;
}

function multiplesRowSvg(row: MultiplePositionRow, y: number, titleY: number, currency = 'ILS'): string {
  const title = MULTIPLE_TITLES[row.id] ?? row.title;
  const cx = trackX(row.multiple, row.rangeMin, row.rangeMax);
  const bandX = trackX(row.marketMin, row.rangeMin, row.rangeMax);
  const bandEnd = trackX(row.marketMax, row.rangeMin, row.rangeMax);
  const bandW = Math.max(bandEnd - bandX, 2);
  const marker =
    row.id === 'dcf'
      ? fmtMoneyCompact(row.impliedEv, currency)
      : row.id === 'margin'
        ? `${row.multiple.toFixed(1)}%`
        : `×${row.multiple.toFixed(1)}`;
  const evLabel = fmtMoneyCompact(row.impliedEv, currency);
  const color = row.color ?? '#00A89F';
  const trackEnd = MULTIPLES_TRACK_X + MULTIPLES_TRACK_W;
  const minAxis =
    row.id === 'dcf'
      ? fmtMoneyCompact(row.rangeMin * 1_000_000, currency)
      : row.id === 'margin'
        ? `${row.rangeMin.toFixed(1)}%`
        : `×${row.rangeMin.toFixed(1)}`;
  const maxAxis =
    row.id === 'dcf'
      ? fmtMoneyCompact(row.rangeMax * 1_000_000, currency)
      : row.id === 'margin'
        ? `${row.rangeMax.toFixed(1)}%`
        : `×${row.rangeMax.toFixed(1)}`;

  return `${multiplesTrackLabelSvg(title, titleY)}
    <rect x="${MULTIPLES_TRACK_X}" y="${y}" width="${MULTIPLES_TRACK_W}" height="10" rx="5" fill="#F0F8F6"/>
    ${row.id !== 'dcf' ? `<rect x="${bandX.toFixed(1)}" y="${y}" width="${bandW.toFixed(1)}" height="10" rx="5" fill="#C5EDE9"/>` : ''}
    <circle cx="${cx.toFixed(1)}" cy="${y + 5}" r="8" fill="${color}"/>
    <text class="axis" x="${MULTIPLES_TRACK_X}" y="${y + 26}">${minAxis}</text>
    <text class="axis" x="${trackEnd}" y="${y + 26}" text-anchor="end">${maxAxis}</text>
    <text x="${cx.toFixed(1)}" y="${titleY - 2}" text-anchor="middle" style="font-family:'IBM Plex Mono';font-size:13px;font-weight:600;fill:${color}">${marker}</text>
    <text x="56" y="${y + 8}" style="font-family:'IBM Plex Mono';font-size:11px;fill:#527570">${evLabel}</text>`;
}

export function buildEquifyMultiplesTracksSvg(
  rows: MultiplePositionRow[],
  currency = 'ILS',
): string {
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  const ebitda = byId.ebitda ?? rows[0]!;
  const revenue = byId.revenue ?? rows[1] ?? rows[0]!;
  const third = byId.margin ?? byId.dcf ?? rows[2] ?? rows[0]!;
  const thirdTitleY = third.id === 'margin' ? 168 : 168;
  const thirdY = third.id === 'margin' ? 178 : 178;
  const dcfCx = trackX(third.impliedEv / 1_000_000, third.rangeMin, third.rangeMax);
  const thirdMarker =
    third.id === 'dcf'
      ? fmtMoneyCompact(third.impliedEv, currency)
      : third.id === 'margin'
        ? `${third.multiple.toFixed(1)}%`
        : `×${third.multiple.toFixed(1)}`;
  const thirdColor = third.color ?? '#A8842E';
  const trackEnd = MULTIPLES_TRACK_X + MULTIPLES_TRACK_W;
  const thirdSvg =
    third.id === 'margin'
      ? multiplesRowSvg(third, thirdY, thirdTitleY, currency)
      : `${multiplesTrackLabelSvg(MULTIPLE_TITLES.dcf, thirdTitleY)}
    <rect x="${MULTIPLES_TRACK_X}" y="${thirdY}" width="${MULTIPLES_TRACK_W}" height="10" rx="5" fill="#F0F8F6"/>
    <circle cx="${dcfCx.toFixed(1)}" cy="${thirdY + 5}" r="8" fill="${thirdColor}"/>
    <text class="axis" x="${MULTIPLES_TRACK_X}" y="${thirdY + 26}">${fmtMoneyCompact(third.rangeMin * 1_000_000, currency)}</text>
    <text class="axis" x="${trackEnd}" y="${thirdY + 26}" text-anchor="end">${fmtMoneyCompact(third.rangeMax * 1_000_000, currency)}</text>
    <text x="${dcfCx.toFixed(1)}" y="${thirdTitleY - 2}" text-anchor="middle" style="font-family:'IBM Plex Mono';font-size:13px;font-weight:600;fill:${thirdColor}">${thirdMarker}</text>`;

  return `<svg viewBox="0 0 ${MULTIPLES_VIEW_W} 200" style="width:100%;overflow:visible" aria-hidden="true">${multiplesRowSvg(ebitda, 38, 28, currency)}${multiplesRowSvg(revenue, 108, 98, currency)}${thirdSvg}</svg>`;
}

export function buildEquifyScenarioRangeSvg(
  bearEquity: number,
  baseEquity: number,
  bullEquity: number,
  currency = 'ILS',
): string {
  return `<svg viewBox="0 0 720 90" style="width:100%">
    <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#C24A4A"/><stop offset=".5" stop-color="#00A89F"/><stop offset="1" stop-color="#A8842E"/></linearGradient></defs>
    <rect x="50" y="34" width="620" height="12" rx="6" fill="#F0F8F6"/>
    <rect x="50" y="34" width="620" height="12" rx="6" fill="url(#rg)" opacity=".75"/>
    <circle cx="50" cy="40" r="7" fill="#C24A4A"/><circle cx="360" cy="40" r="9" fill="#00A89F" stroke="#fff" stroke-width="2.5"/><circle cx="670" cy="40" r="7" fill="#A8842E"/>
    <text x="50" y="70" text-anchor="middle" style="font-family:'IBM Plex Mono';font-size:11px;fill:#C24A4A">${fmtMoneyCompact(bearEquity, currency)}</text>
    <text x="360" y="22" text-anchor="middle" style="font-family:'IBM Plex Mono';font-size:14px;font-weight:600;fill:#163530">${fmtMoneyCompact(baseEquity, currency)}</text>
    <text x="670" y="70" text-anchor="middle" style="font-family:'IBM Plex Mono';font-size:11px;fill:#A8842E">${fmtMoneyCompact(bullEquity, currency)}</text></svg>`;
}

export function buildEquifyQualityGaugeSvg(score: number, grade: string): string {
  const fill = GAUGE_ARC * (Math.max(0, Math.min(100, score)) / 100);
  return `<svg viewBox="0 0 200 200" style="width:40mm;margin:0 auto">
    <circle cx="100" cy="100" r="${GAUGE_R}" fill="none" stroke="#F0F8F6" stroke-width="13" stroke-dasharray="${GAUGE_ARC.toFixed(0)} ${GAUGE_C.toFixed(0)}" stroke-linecap="round" transform="rotate(135 100 100)"/>
    <circle cx="100" cy="100" r="${GAUGE_R}" fill="none" stroke="url(#gg)" stroke-width="13" stroke-dasharray="${fill.toFixed(0)} ${GAUGE_C.toFixed(0)}" stroke-linecap="round" transform="rotate(135 100 100)"/>
    <defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#00A89F"/><stop offset="1" stop-color="#A8842E"/></linearGradient></defs>
    <text x="100" y="98" text-anchor="middle" style="font-family:'IBM Plex Mono';font-size:34px;font-weight:600;fill:#163530">${Math.round(score)}</text>
    <text x="100" y="118" text-anchor="middle" class="axis" style="letter-spacing:.14em">QUALITY SCORE</text>
    <text x="100" y="142" text-anchor="middle" style="font-family:'Frank Ruhl Libre';font-size:18px;font-weight:900;fill:#A8842E">${grade}</text></svg>`;
}

export function buildEquifyCoverRingsSvg(): string {
  return `<svg class="cv-rings" viewBox="0 0 600 600" aria-hidden="true">
    <circle cx="300" cy="300" r="225" fill="none" stroke="#00A89F" stroke-opacity=".14" stroke-width="1"/>
    <circle cx="300" cy="300" r="262" fill="none" stroke="#A8842E" stroke-opacity=".18" stroke-width="1" stroke-dasharray="2 6"/>
    <circle cx="300" cy="300" r="188" fill="none" stroke="#00A89F" stroke-opacity=".08" stroke-width="22"/></svg>`;
}

export function computeWaterfallFills(data: {
  enterpriseValue: number;
  netDebt: number;
  equity: number;
}): { debtPct: number; equityPct: number } {
  const ev = Math.max(data.enterpriseValue, 1);
  return {
    debtPct: Math.min(100, (Math.max(data.netDebt, 0) / ev) * 100),
    equityPct: Math.min(100, (Math.max(data.equity, 0) / ev) * 100),
  };
}
