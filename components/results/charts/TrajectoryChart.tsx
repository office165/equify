'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TrajectoryPoint } from '../../../lib/results/report-view-model';
import { formatCurrencyShort } from '../../../lib/utils/formatCurrency';

interface TrajectoryChartProps {
  data: TrajectoryPoint[];
  currency?: string;
  locale?: 'he' | 'en';
  className?: string;
}

export function TrajectoryChart({
  data,
  currency = 'ILS',
  locale = 'he',
  className,
}: TrajectoryChartProps) {
  const isHe = locale === 'he';

  if (!data.length) {
    return (
      <div className={`rr-chart-empty ${className ?? ''}`}>
        {isHe ? 'אין נתוני תחזית זמינים' : 'No forecast data available'}
      </div>
    );
  }

  return (
    <div className={`rr-trajectory-chart ${className ?? ''}`}>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(0,194,184,0.12)" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fill: '#7FA8A2', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(0,194,184,0.2)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#7FA8A2', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => formatCurrencyShort(v, currency)}
            width={64}
          />
          <Tooltip
            contentStyle={{
              background: '#091C18',
              border: '1px solid rgba(0,194,184,0.25)',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number, name: string) => [
              formatCurrencyShort(value, currency),
              name,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: '#7FA8A2' }}
            formatter={(value) => (
              <span style={{ color: '#9EEEE6' }}>{value}</span>
            )}
          />
          <Bar
            dataKey="revenue"
            name={isHe ? 'הכנסות' : 'Revenue'}
            fill="rgba(0,194,184,0.35)"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
          />
          <Bar
            dataKey="ebitda"
            name="EBITDA"
            fill="#00C2B8"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
