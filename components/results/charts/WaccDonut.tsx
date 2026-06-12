'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { WaccDonutSlice } from '../../../lib/results/report-view-model';

interface WaccDonutProps {
  slices: WaccDonutSlice[];
  waccPct: number;
  locale?: 'he' | 'en';
  className?: string;
}

export function WaccDonut({
  slices,
  waccPct,
  locale = 'he',
  className,
}: WaccDonutProps) {
  const isHe = locale === 'he';
  const chartData = slices.filter((s) => s.pct > 0);

  return (
    <div className={`rr-wacc-donut ${className ?? ''}`}>
      <div className="rr-wacc-donut__chart">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="pct"
              nameKey={isHe ? 'labelHe' : 'labelEn'}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={96}
              paddingAngle={2}
              stroke="none"
            >
              {chartData.map((slice) => (
                <Cell key={slice.key} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: '#091C18',
                border: '1px solid rgba(0,194,184,0.25)',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="rr-wacc-donut__center" aria-hidden>
          <span className="rr-wacc-donut__label">WACC</span>
          <span className="rr-wacc-donut__value">{waccPct.toFixed(1)}%</span>
        </div>
      </div>
      <ul className="rr-wacc-donut__legend">
        {slices.map((slice) => (
          <li key={slice.key}>
            <span className="rr-wacc-donut__swatch" style={{ background: slice.color }} />
            <span>{isHe ? slice.labelHe : slice.labelEn}</span>
            <strong>{slice.pct.toFixed(1)}%</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
