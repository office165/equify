import type {
  DcfYearRow,
  EbitdaSensitivityMatrix,
  ModelBlendRow,
  MultiplePositionRow,
  QualityFactorRow,
  SensitivityMatrix,
  TrajectoryPoint,
  WaccSegment,
} from './types';
import { fmtMoneyCompact } from '../pdf/print/print_formatters';

function toM(nis: number): number {
  return nis / 1_000_000;
}

function fmtM(nis: number, digits = 1): string {
  return `₪${toM(nis).toFixed(digits)}M`;
}

export function buildCoverRingsSvg(): string {
  return `<svg class="cover-rings" viewBox="0 0 560 320" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <circle cx="280" cy="160" r="145" fill="none" stroke="#00A89F" stroke-opacity=".1" stroke-width="1"/>
    <circle cx="280" cy="160" r="175" fill="none" stroke="#A8842E" stroke-opacity=".12" stroke-width="1" stroke-dasharray="3 7"/>
    <circle cx="280" cy="160" r="115" fill="none" stroke="#00C2B8" stroke-opacity=".07" stroke-width="18"/>
    <path d="M160 160 Q280 100 400 160" fill="none" stroke="#00A89F" stroke-opacity=".08" stroke-width="1"/>
    <polyline points="80,240 110,225 140,232 170,208 200,215 230,195 260,200 290,182 320,188" fill="none" stroke="#00C2B8" stroke-opacity=".18" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;
}

export function buildModelBlendBarSvg(rows: ModelBlendRow[], width = 380): string {
  if (!rows.length) return '';
  let x = 0;
  const colors = ['#00A89F', '#4DD6CE', '#C5EDE9', '#7FB8B4'];
  const segments = rows.map((row, i) => {
    const w = (row.weightPct / 100) * width;
    const color = colors[i % colors.length];
    const textColor = i === 0 ? 'white' : '#163530';
    const label = row.name.length > 12 ? row.name.split(' ')[0] : row.name;
    const seg = `<rect x="${x}" y="0" width="${w.toFixed(1)}" height="38" fill="${color}"/>
      <text x="${(x + w / 2).toFixed(1)}" y="22" text-anchor="middle" fill="${textColor}" font-family="IBM Plex Mono" font-size="${row.weightPct >= 25 ? 10 : 9}" font-weight="600">${label} · ${row.weightPct.toFixed(0)}%</text>`;
    x += w;
    return seg;
  });
  return `<svg viewBox="0 0 ${width} 38" style="width:100%;display:block;border-radius:6px;overflow:hidden" aria-hidden="true">${segments.join('')}</svg>`;
}

export function buildWaterfallSvg(ev: number, netDebt: number, equity: number): string {
  const evM = toM(ev);
  const debtM = toM(Math.abs(netDebt));
  const eqM = toM(equity);
  const scale = 4;
  const baseY = 150;
  const evH = evM * scale;
  const debtH = debtM * scale;
  const eqH = eqM * scale;
  const evTop = baseY - evH;
  const eqTop = baseY - eqH;
  const debtTop = eqTop + eqH - debtH;

  return `<svg viewBox="0 0 320 200" style="width:100%;display:block" aria-hidden="true">
    <line x1="60" x2="300" y1="30" y2="30" stroke="#D6E8E4" stroke-dasharray="3 4"/>
    <line x1="60" x2="300" y1="70" y2="70" stroke="#D6E8E4" stroke-dasharray="3 4"/>
    <line x1="60" x2="300" y1="110" y2="110" stroke="#D6E8E4" stroke-dasharray="3 4"/>
    <line x1="60" x2="300" y1="150" y2="150" stroke="#D6E8E4" stroke-dasharray="3 4"/>
    <text x="52" y="33" text-anchor="end" font-family="IBM Plex Mono" font-size="8" fill="#527570">30</text>
    <text x="52" y="73" text-anchor="end" font-family="IBM Plex Mono" font-size="8" fill="#527570">20</text>
    <text x="52" y="113" text-anchor="end" font-family="IBM Plex Mono" font-size="8" fill="#527570">10</text>
    <text x="52" y="153" text-anchor="end" font-family="IBM Plex Mono" font-size="8" fill="#527570">0</text>
    <rect x="80" y="${evTop.toFixed(1)}" width="52" height="${evH.toFixed(1)}" fill="#00A89F" rx="3"/>
    <text x="106" y="${(evTop - 6).toFixed(1)}" text-anchor="middle" font-family="IBM Plex Mono" font-size="9" fill="#163530" font-weight="600">${fmtM(ev)}</text>
    <text x="106" y="165" text-anchor="middle" font-family="IBM Plex Mono" font-size="8" fill="#527570">EV</text>
    <line x1="132" x2="158" y1="${evTop.toFixed(1)}" y2="${evTop.toFixed(1)}" stroke="#D6E8E4" stroke-dasharray="2 3"/>
    <rect x="158" y="${debtTop.toFixed(1)}" width="52" height="${debtH.toFixed(1)}" fill="#C24A4A" rx="3" opacity=".85"/>
    <text x="184" y="${(debtTop - 5).toFixed(1)}" text-anchor="middle" font-family="IBM Plex Mono" font-size="9" fill="#C24A4A" font-weight="600">−${fmtM(Math.abs(netDebt))}</text>
    <text x="184" y="165" text-anchor="middle" font-family="IBM Plex Mono" font-size="8" fill="#527570">חוב נטו</text>
    <line x1="210" x2="234" y1="${eqTop.toFixed(1)}" y2="${eqTop.toFixed(1)}" stroke="#D6E8E4" stroke-dasharray="2 3"/>
    <rect x="234" y="${eqTop.toFixed(1)}" width="52" height="${eqH.toFixed(1)}" fill="#163530" rx="3"/>
    <rect x="234" y="${eqTop.toFixed(1)}" width="52" height="10" fill="#00C2B8" rx="3"/>
    <text x="260" y="${(eqTop - 6).toFixed(1)}" text-anchor="middle" font-family="IBM Plex Mono" font-size="9.5" fill="#163530" font-weight="700">${fmtM(equity)}</text>
    <text x="260" y="165" text-anchor="middle" font-family="IBM Plex Mono" font-size="8" fill="#527570">שווי לבעלים</text>
    <rect x="64" y="178" width="8" height="8" fill="#00A89F" rx="1"/>
    <text x="76" y="186" font-family="IBM Plex Mono" font-size="7.5" fill="#527570">Enterprise Value</text>
    <rect x="136" y="178" width="8" height="8" fill="#C24A4A" rx="1"/>
    <text x="148" y="186" font-family="IBM Plex Mono" font-size="7.5" fill="#527570">Net Debt</text>
    <rect x="198" y="178" width="8" height="8" fill="#163530" rx="1"/>
    <text x="210" y="186" font-family="IBM Plex Mono" font-size="7.5" fill="#527570">Equity Value</text>
  </svg>`;
}

export function buildScenarioRibbonSvg(
  bearEquity: number,
  baseEquity: number,
  bullEquity: number,
): string {
  const min = bearEquity;
  const max = bullEquity;
  const span = max - min || 1;
  const baseX = 40 + ((baseEquity - min) / span) * 480;
  const bullX = 520;

  return `<svg viewBox="0 0 560 64" style="width:100%;display:block;margin-bottom:2mm" aria-hidden="true">
    <rect x="40" y="24" width="480" height="12" rx="6" fill="#F0F8F6" stroke="#D6E8E4"/>
    <defs><linearGradient id="rib" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#C24A4A" stop-opacity=".45"/>
      <stop offset="50%" stop-color="#00A89F" stop-opacity=".55"/>
      <stop offset="100%" stop-color="#A8842E" stop-opacity=".45"/>
    </linearGradient></defs>
    <rect x="40" y="24" width="480" height="12" rx="6" fill="url(#rib)"/>
    <circle cx="40" cy="30" r="7" fill="#C24A4A" stroke="white" stroke-width="1.5"/>
    <circle cx="${baseX.toFixed(1)}" cy="30" r="9" fill="#163530" stroke="#00C2B8" stroke-width="2"/>
    <circle cx="${bullX}" cy="30" r="7" fill="#A8842E" stroke="white" stroke-width="1.5"/>
    <text x="40" y="52" text-anchor="middle" font-family="IBM Plex Mono" font-size="9" fill="#C24A4A" font-weight="600">${fmtMoneyCompact(bearEquity)}</text>
    <text x="40" y="61" text-anchor="middle" font-family="IBM Plex Mono" font-size="7.5" fill="#527570">Bear</text>
    <text x="${baseX.toFixed(1)}" y="10" text-anchor="middle" font-family="IBM Plex Mono" font-size="10" fill="#163530" font-weight="700">${fmtMoneyCompact(baseEquity)}</text>
    <text x="${baseX.toFixed(1)}" y="52" text-anchor="middle" font-family="IBM Plex Mono" font-size="7.5" fill="#527570">Base</text>
    <text x="${bullX}" y="52" text-anchor="middle" font-family="IBM Plex Mono" font-size="9" fill="#A8842E" font-weight="600">${fmtMoneyCompact(bullEquity)}</text>
    <text x="${bullX}" y="61" text-anchor="middle" font-family="IBM Plex Mono" font-size="7.5" fill="#527570">Bull</text>
  </svg>`;
}

export function buildFinancialBarChartSvg(years: TrajectoryPoint[]): string {
  if (!years.length) return '';
  const ceilingM = Math.max(...years.map((y) => y.revenueM), 1) * 1.15;
  const plotH = 160;
  const baseY = 180;
  const x0 = 75;
  const groupW = Math.min(110, 600 / years.length);
  const barW = 28;

  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((t) => {
      const y = baseY - t * plotH;
      const val = (ceilingM * t).toFixed(1);
      return `<line x1="60" x2="710" y1="${y}" y2="${y}" stroke="#D6E8E4" stroke-dasharray="3 5"/>
        <text x="55" y="${y + 3}" text-anchor="end" font-family="IBM Plex Mono" font-size="8" fill="#527570">${val}</text>`;
    })
    .join('');

  const firstForecast = years.findIndex((y) => y.forecast);
  let forecastShade = '';
  if (firstForecast >= 0) {
    const xStart = x0 + firstForecast * groupW - 10;
    const w = (years.length - firstForecast) * groupW + 20;
    forecastShade = `<rect x="${xStart}" y="15" width="${w}" height="${plotH + 5}" fill="#F0F8F6" opacity=".6" rx="2"/>
      <text x="${xStart + w / 2}" y="13" text-anchor="middle" font-family="IBM Plex Mono" font-size="7.5" fill="#527570">תחזית</text>`;
  }

  const bars = years
    .map((year, i) => {
      const xRev = x0 + i * groupW;
      const xEbt = xRev + barW + 6;
      const revH = (year.revenueM / ceilingM) * plotH;
      const ebtH = (year.ebitdaM / ceilingM) * plotH;
      const revY = baseY - revH;
      const ebtY = baseY - ebtH;
      const revFill = year.forecast ? 'url(#gRevF)' : 'url(#gRev)';
      const ebtFill = year.forecast ? 'url(#gEbtF)' : 'url(#gEbt)';
      const centerX = xRev + barW + 3;
      return `<rect x="${xRev}" y="${revY.toFixed(1)}" width="${barW}" height="${revH.toFixed(1)}" fill="${revFill}" rx="3"/>
        <rect x="${xEbt}" y="${ebtY.toFixed(1)}" width="${barW}" height="${ebtH.toFixed(1)}" fill="${ebtFill}" rx="3"/>
        <text x="${centerX}" y="200" text-anchor="middle" font-family="IBM Plex Mono" font-size="8" fill="#527570">${year.label}</text>
        <text x="${xRev + barW / 2}" y="${(revY - 4).toFixed(1)}" text-anchor="middle" font-family="IBM Plex Mono" font-size="7.5" fill="#00A89F">${year.revenueM.toFixed(1)}</text>
        <text x="${xEbt + barW / 2}" y="${(ebtY - 4).toFixed(1)}" text-anchor="middle" font-family="IBM Plex Mono" font-size="7.5" fill="#A8842E">${year.ebitdaM.toFixed(1)}</text>`;
    })
    .join('');

  const marginPts = years
    .map((y, i) => {
      const m = y.revenueM > 0 ? (y.ebitdaM / y.revenueM) * 100 : 0;
      const x = x0 + i * groupW + barW + 3;
      const minM = Math.min(...years.map((yy) => (yy.revenueM > 0 ? (yy.ebitdaM / yy.revenueM) * 100 : 0)));
      const maxM = Math.max(...years.map((yy) => (yy.revenueM > 0 ? (yy.ebitdaM / yy.revenueM) * 100 : 0)));
      const span = maxM - minM || 1;
      const yPos = 170 - ((m - minM) / span) * 25;
      return `${x},${yPos.toFixed(1)}`;
    })
    .join(' ');

  return `<svg viewBox="0 0 720 220" style="width:100%;display:block" aria-hidden="true">
    <defs>
      <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#00A89F"/><stop offset="100%" stop-color="#0F5B55"/></linearGradient>
      <linearGradient id="gEbt" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#C9A84C"/><stop offset="100%" stop-color="#7A6030"/></linearGradient>
      <linearGradient id="gRevF" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#00A89F" stop-opacity=".5"/><stop offset="100%" stop-color="#0F5B55" stop-opacity=".4"/></linearGradient>
      <linearGradient id="gEbtF" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#C9A84C" stop-opacity=".5"/><stop offset="100%" stop-color="#7A6030" stop-opacity=".4"/></linearGradient>
    </defs>
    ${grid}
    ${forecastShade}
    ${bars}
    <polyline points="${marginPts}" fill="none" stroke="#C24A4A" stroke-width="1.5" stroke-dasharray="3 3" stroke-linecap="round"/>
    <text x="700" y="152" font-family="IBM Plex Mono" font-size="7" fill="#C24A4A">EBITDA%</text>
    <rect x="65" y="210" width="8" height="7" fill="#00A89F" rx="1"/>
    <text x="77" y="217" font-family="IBM Plex Mono" font-size="7.5" fill="#527570">הכנסות</text>
    <rect x="130" y="210" width="8" height="7" fill="#C9A84C" rx="1"/>
    <text x="142" y="217" font-family="IBM Plex Mono" font-size="7.5" fill="#527570">EBITDA</text>
  </svg>`;
}

export function buildWaccStackedBarSvg(segments: WaccSegment[], totalPct: number): string {
  const width = 400;
  const total = segments.reduce((s, seg) => s + seg.pct, 0) || totalPct;
  const colors = ['url(#w1)', 'url(#w2)', 'url(#w3)', 'url(#w4)', 'url(#w5)'];
  let x = 0;
  const rects = segments.map((seg, i) => {
    const w = (seg.pct / total) * width;
    const label = seg.symbol ? `${seg.symbol} ${seg.pct.toFixed(1)}%` : `${seg.pct.toFixed(1)}%`;
    const segHtml = `<rect x="${x.toFixed(1)}" y="8" width="${w.toFixed(1)}" height="28" fill="${colors[i % colors.length]}"/>
      <text x="${(x + w / 2).toFixed(1)}" y="27" text-anchor="middle" font-family="IBM Plex Mono" font-size="${w > 50 ? 8.5 : 7.5}" fill="white" font-weight="600">${label}</text>`;
    x += w;
    return segHtml;
  });

  const legend = segments
    .slice(0, 5)
    .map((seg, i) => {
      const lx = i * 70;
      return `<rect x="${lx}" y="42" width="6" height="6" fill="${seg.color}" rx="1"/>
        <text x="${lx + 10}" y="48" font-family="IBM Plex Mono" font-size="6.5" fill="#527570">${seg.label.split(' ')[0]}</text>`;
    })
    .join('');

  return `<svg viewBox="0 0 400 52" style="width:100%;display:block;margin-bottom:3mm" aria-hidden="true">
    <defs>
      <linearGradient id="w1" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#4DD6CE"/><stop offset="100%" stop-color="#00A89F"/></linearGradient>
      <linearGradient id="w2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#00A89F"/><stop offset="100%" stop-color="#163530"/></linearGradient>
      <linearGradient id="w3" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#C9A84C"/><stop offset="100%" stop-color="#A8842E"/></linearGradient>
      <linearGradient id="w4" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#163530"/><stop offset="100%" stop-color="#0F2E29"/></linearGradient>
      <linearGradient id="w5" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#7FB8B4"/><stop offset="100%" stop-color="#4DD6CE"/></linearGradient>
    </defs>
    ${rects.join('')}
    ${legend}
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

export function buildDcfTimelineSvg(
  rows: DcfYearRow[],
  terminalPvM: number,
  totalDcfM: number,
  terminalSharePct: number,
): string {
  const maxPv = Math.max(...rows.map((r) => r.pvM), terminalPvM, 0.1);
  const scale = 120 / maxPv;
  const barH = 14;
  let y = 18;

  const yearBars = rows
    .map((row) => {
      const w = row.pvM * scale;
      const html = `<text x="30" y="${y + 10}" text-anchor="end" font-family="IBM Plex Mono" font-size="8" fill="#527570">${row.label}</text>
        <rect x="34" y="${y}" width="${w.toFixed(1)}" height="${barH}" fill="#00A89F" rx="3"/>
        <text x="${(38 + w).toFixed(1)}" y="${y + 10}" font-family="IBM Plex Mono" font-size="8" fill="#163530">₪${row.pvM.toFixed(2)}M</text>`;
      y += 24;
      return html;
    })
    .join('');

  const tvW = terminalPvM * scale;
  return `<svg viewBox="0 0 200 220" style="width:100%;display:block" aria-hidden="true">
    ${yearBars}
    <line x1="34" x2="195" y1="${y + 2}" y2="${y + 2}" stroke="#D6E8E4" stroke-dasharray="2 3"/>
    <text x="30" y="${y + 22}" text-anchor="end" font-family="IBM Plex Mono" font-size="8" fill="#A8842E" font-weight="600">Terminal</text>
    <rect x="34" y="${y + 10}" width="${tvW.toFixed(1)}" height="20" fill="#A8842E" rx="3" opacity=".7"/>
    <text x="110" y="${y + 24}" text-anchor="middle" font-family="IBM Plex Mono" font-size="9" fill="white" font-weight="700">₪${terminalPvM.toFixed(1)}M (${terminalSharePct.toFixed(0)}%)</text>
    <line x1="34" x2="195" y1="${y + 40}" y2="${y + 40}" stroke="#163530" stroke-width="1.5"/>
    <rect x="34" y="${y + 44}" width="185" height="18" fill="#163530" rx="3"/>
    <text x="126" y="${y + 57}" text-anchor="middle" font-family="IBM Plex Mono" font-size="9.5" fill="white" font-weight="700">TOTAL ₪${totalDcfM.toFixed(1)}M</text>
  </svg>`;
}

export function buildMultiplesTracksSvg(rows: MultiplePositionRow[]): string {
  function posX(value: number, min: number, max: number): number {
    const span = max - min || 1;
    return 20 + ((value - min) / span) * 640;
  }

  const yBands = [46, 106, 146];
  const labelY = [38, 98, 148];
  const axisY = [62, 122, 162];

  const content = rows.slice(0, 3).map((row, i) => {
    const y = yBands[i];
    const cx = posX(row.multiple, row.marketMin, row.marketMax);
    const bandX = posX(row.marketMin, row.marketMin, row.marketMax);
    const bandW = posX(row.marketMax, row.marketMin, row.marketMax) - bandX;
    const color = row.color ?? '#00A89F';
    const multLabel =
      row.id === 'dcf' ? fmtMoneyCompact(row.impliedEv) : `×${row.multiple.toFixed(1)}`;
    const minLabel =
      row.id === 'dcf' ? fmtMoneyCompact(row.marketMin) : `×${row.marketMin.toFixed(1)}`;
    const maxLabel =
      row.id === 'dcf' ? fmtMoneyCompact(row.marketMax) : `×${row.marketMax.toFixed(1)}`;

    return `<text x="695" y="${labelY[i]}" text-anchor="end" font-family="Assistant" font-size="10" font-weight="700" fill="#163530">${row.title}</text>
      <rect x="20" y="${y - 6}" width="640" height="12" rx="6" fill="#F0F8F6" stroke="#D6E8E4"/>
      <rect x="${bandX.toFixed(1)}" y="${y - 6}" width="${bandW.toFixed(1)}" height="12" rx="5" fill="rgba(0,168,159,.18)"/>
      <circle cx="${cx.toFixed(1)}" cy="${y}" r="7" fill="${color}" stroke="white" stroke-width="2"/>
      <text x="${cx.toFixed(1)}" y="${y - 10}" text-anchor="middle" font-family="IBM Plex Mono" font-size="9" fill="#163530" font-weight="700">${multLabel}</text>
      <text x="20" y="${axisY[i]}" font-family="IBM Plex Mono" font-size="7.5" fill="#527570">${minLabel}</text>
      <text x="660" y="${axisY[i]}" text-anchor="end" font-family="IBM Plex Mono" font-size="7.5" fill="#527570">${maxLabel}</text>`;
  });

  return `<svg viewBox="0 0 700 170" style="width:100%;display:block" aria-hidden="true">${content.join('')}</svg>`;
}

export function buildQualityArcGaugeSvg(score: number, grade: string): string {
  const pct = Math.min(100, Math.max(0, score));
  const angle = -135 + (pct / 100) * 270;
  const rad = (angle * Math.PI) / 180;
  const needleX = 110 + 65 * Math.cos(rad);
  const needleY = 130 - 65 * Math.sin(rad);
  const arcLen = (pct / 100) * 210;

  return `<svg viewBox="0 0 220 210" style="width:100%;display:block" aria-hidden="true">
    <path d="M 110 130 m -85 0 a 85 85 0 1 1 170 0" fill="none" stroke="#F0F8F6" stroke-width="16" stroke-linecap="round"/>
    <path d="M 25 130 a 85 85 0 1 1 149.6 -47.2" fill="none" stroke="url(#qg)" stroke-width="9" stroke-dasharray="${arcLen.toFixed(0)} 300" stroke-linecap="round"/>
    <defs><linearGradient id="qg" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#00C2B8"/><stop offset="100%" stop-color="#C9A84C"/></linearGradient></defs>
    <line x1="110" y1="130" x2="${needleX.toFixed(1)}" y2="${needleY.toFixed(1)}" stroke="#163530" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="110" cy="130" r="5" fill="#163530"/>
    <text x="110" y="118" text-anchor="middle" font-family="IBM Plex Mono" font-size="26" font-weight="600" fill="#163530">${score}</text>
    <text x="110" y="135" text-anchor="middle" font-family="IBM Plex Mono" font-size="8" fill="#527570">/ 100</text>
    <text x="110" y="152" text-anchor="middle" font-family="Frank Ruhl Libre" font-size="18" font-weight="900" fill="#A8842E">${grade}</text>
    <text x="18" y="148" font-family="IBM Plex Mono" font-size="7.5" fill="#C24A4A">0</text>
    <text x="88" y="30" text-anchor="middle" font-family="IBM Plex Mono" font-size="7.5" fill="#527570">50</text>
    <text x="200" y="148" font-family="IBM Plex Mono" font-size="7.5" fill="#163530">100</text>
  </svg>`;
}

export function buildQualityFactorBarsSvg(
  factors: QualityFactorRow[],
  totalScore: number,
  grade: string,
): string {
  const barMaxW = 200;
  const rowH = 24;
  let y = 8;

  const rows = factors.map((f) => {
    const max = f.maxScore ?? 100;
    const w = max > 0 ? (f.score / max) * barMaxW : 0;
    const html = `<text x="140" y="${y + 12}" text-anchor="end" font-family="Assistant" font-size="9" fill="#163530">${f.label}</text>
      <rect x="144" y="${y}" width="${barMaxW}" height="10" rx="3" fill="#F0F8F6" stroke="#D6E8E4"/>
      <rect x="144" y="${y}" width="${w.toFixed(1)}" height="10" rx="3" fill="#00A89F"/>
      <text x="348" y="${y + 9}" font-family="IBM Plex Mono" font-size="8" fill="#527570">${f.score}/${max}</text>`;
    y += rowH;
    return html;
  });

  const totalY = y + 8;
  return `<svg viewBox="0 0 360 ${totalY + 24}" style="width:100%;display:block;margin-bottom:3mm" aria-hidden="true">
    ${rows.join('')}
    <line x1="144" x2="344" y1="${totalY}" y2="${totalY}" stroke="#163530" stroke-width="1"/>
    <rect x="144" y="${totalY + 3}" width="${((totalScore / 100) * barMaxW).toFixed(1)}" height="13" fill="#163530" rx="3"/>
    <text x="222" y="${totalY + 13}" text-anchor="middle" font-family="IBM Plex Mono" font-size="9" fill="white" font-weight="700">TOTAL: ${totalScore} / 100</text>
    <text x="348" y="${totalY + 13}" font-family="IBM Plex Mono" font-size="9" fill="#A8842E" font-weight="600">${grade}</text>
  </svg>`;
}

export function buildSensitivityMatrixTable(matrix: SensitivityMatrix): string {
  const header = matrix.waccLabels.map((l) => `<th>${l}</th>`).join('');
  const body = matrix.growthLabels
    .map((growLabel, ri) => {
      const isBaseRow = ri === matrix.baseRow;
      const rowStyle = isBaseRow ? ' style="background:rgba(0,168,159,.06)"' : '';
      const growCell = isBaseRow
        ? `<td style="font-weight:700;color:#00A89F">${growLabel} ←Base</td>`
        : `<td style="font-weight:700">${growLabel}</td>`;
      const cells = matrix.cells[ri]
        ?.map((val, ci) => {
          const isCenter = ri === matrix.baseRow && ci === matrix.baseCol;
          const cls = isCenter ? 'n center-cell' : 'n';
          const style = isCenter
            ? ' style="background:rgba(0,168,159,.18);font-weight:700;color:#163530"'
            : '';
          return `<td class="${cls}"${style}>${val.toFixed(1)}</td>`;
        })
        .join('');
      return `<tr${rowStyle}>${growCell}${cells}</tr>`;
    })
    .join('');

  return `<div class="sens-grid"><table>
    <tr><th style="background:#F0F8F6">צמיחה \\ WACC</th>${header}</tr>
    ${body}
  </table></div>`;
}

export function buildEbitdaSensitivityTable(matrix: EbitdaSensitivityMatrix): string {
  const header = matrix.multipleLabels.map((l) => `<th>${l}</th>`).join('');
  const body = matrix.ebitdaLabels
    .map((ebitdaLabel, ri) => {
      const isBase = ri === matrix.baseRow;
      const rowStyle = isBase ? ' style="background:rgba(0,168,159,.06)"' : '';
      const labelCell = isBase
        ? `<td class="n"><b>${ebitdaLabel} ←Base</b></td>`
        : `<td class="n">${ebitdaLabel}</td>`;
      const cells = matrix.cells[ri]
        ?.map((val, ci) => {
          const isCenter = ri === matrix.baseRow && ci === matrix.baseCol;
          const style = isCenter
            ? ' class="n center-cell" style="background:rgba(0,168,159,.18);font-weight:700"'
            : ' class="n"';
          return `<td${style}>${val.toFixed(1)}</td>`;
        })
        .join('');
      return `<tr${rowStyle}>${labelCell}${cells}</tr>`;
    })
    .join('');

  return `<table>
    <tr><th>EBITDA \\ מכפיל</th>${header}</tr>
    ${body}
  </table>`;
}
