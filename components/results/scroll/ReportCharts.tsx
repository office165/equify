'use client';

import type { FinBarPoint } from '../../../lib/results/scroll-report-vm';
import type { WaccDonutSlice } from '../../../lib/results/report-view-model';

const W = 880;
const H = 340;
const BAR_BASE = 280;
const BAR_MAX = 230;
const BW = 34;
const GAP = 10;

interface FinancialBarChartProps {
  data: FinBarPoint[];
  growthNote: string;
  marginNote: string;
  blendedNote?: string;
}

export function FinancialBarChart({
  data,
  growthNote,
  marginNote,
  blendedNote,
}: FinancialBarChartProps) {
  const maxM = Math.max(
    ...data.flatMap((d) => [d.revenueM, d.ebitdaM]),
    4.5,
  );
  const step = (W - 80) / Math.max(data.length, 1);

  return (
    <div className="chart-card rv">
      <h3>הכנסות מול EBITDA · ₪M</h3>
      <p className="ch-sub">
        {growthNote} · {marginNote}
        {blendedNote ? ` · ${blendedNote}` : ''}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="גרף הכנסות ו-EBITDA">
        <defs>
          <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00C2B8" />
            <stop offset="100%" stopColor="#163530" />
          </linearGradient>
          <linearGradient id="gEbt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C49A3C" />
            <stop offset="100%" stopColor="#7A5E20" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = BAR_BASE - BAR_MAX * t;
          return (
            <g key={t}>
              <line className="gridln" x1={40} x2={W - 40} y1={y} y2={y} />
              <text className="axis" x={32} y={y + 4} textAnchor="end">
                {(maxM * t).toFixed(maxM >= 10 ? 0 : 1)}
              </text>
            </g>
          );
        })}
        {data.map((row, i) => {
          const cx = 80 + i * step + step / 2;
          const revH = (row.revenueM / maxM) * BAR_MAX;
          const ebtH = (row.ebitdaM / maxM) * BAR_MAX;
          return (
            <g key={row.label}>
              <rect
                className="bar-rev"
                x={cx - BW - GAP / 2}
                y={BAR_BASE - revH}
                width={BW}
                height={revH}
                rx={4}
                opacity={row.forecast ? 0.55 : 1}
              />
              <rect
                className="bar-ebt"
                x={cx + GAP / 2}
                y={BAR_BASE - ebtH}
                width={BW}
                height={ebtH}
                rx={4}
                opacity={row.forecast ? 0.55 : 1}
              />
              <text className="axis" x={cx} y={H - 12} textAnchor="middle">
                {row.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="legend">
        <span>
          <i style={{ background: '#00C2B8' }} /> הכנסות
        </span>
        <span>
          <i style={{ background: '#C49A3C' }} /> EBITDA
        </span>
      </div>
    </div>
  );
}

interface WaccDonutChartProps {
  slices: WaccDonutSlice[];
  waccPct: number;
}

export function WaccDonutChart({ slices, waccPct }: WaccDonutChartProps) {
  const R = 76;
  const C = 2 * Math.PI * R;
  const total = slices.reduce((s, sl) => s + sl.pct, 0) || waccPct;
  let offset = 0;

  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 200 200" width="200" height="200">
        {slices.map((sl) => {
          const len = (sl.pct / total) * C;
          const el = (
            <circle
              key={sl.key}
              cx={100}
              cy={100}
              r={R}
              fill="none"
              stroke={sl.color}
              strokeWidth={17}
              strokeDasharray={`${len} ${C}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 100 100)"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="donut-c">
        <div className="dv">{waccPct.toFixed(1)}%</div>
        <div className="dl">WACC</div>
      </div>
    </div>
  );
}

interface QualityGaugeChartProps {
  score: number;
  grade: string;
}

export function QualityGaugeChart({ score, grade }: QualityGaugeChartProps) {
  const R = 80;
  const C = 2 * Math.PI * R;
  const ARC = C * 0.75;
  const fill = ARC * (Math.max(0, Math.min(100, score)) / 100);

  return (
    <div style={{ position: 'relative', width: 200, margin: '0 auto' }}>
      <svg viewBox="0 0 200 200" width="200" height="200">
        <circle
          cx={100}
          cy={100}
          r={R}
          fill="none"
          stroke="#0F2E29"
          strokeWidth={13}
          strokeDasharray={`${ARC} ${C}`}
          strokeLinecap="round"
          transform="rotate(135 100 100)"
        />
        <circle
          cx={100}
          cy={100}
          r={R}
          fill="none"
          stroke="url(#qg)"
          strokeWidth={13}
          strokeDasharray={`${fill} ${C}`}
          strokeLinecap="round"
          transform="rotate(135 100 100)"
        />
        <defs>
          <linearGradient id="qg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#00C2B8" />
            <stop offset="100%" stopColor="#C49A3C" />
          </linearGradient>
        </defs>
      </svg>
      <div className="g-center">
        <div className="gv">{Math.round(score)}</div>
        <div className="gl">QUALITY SCORE</div>
        <div className="g-grade">{grade}</div>
      </div>
    </div>
  );
}
