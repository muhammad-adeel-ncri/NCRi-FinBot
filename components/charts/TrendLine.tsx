'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { REGION_COLORS, REGIONS } from '@/lib/colors';

interface TrendPoint {
  label: string;
  Canada?: number;
  Pakistan?: number;
  UAE?: number;
}

interface Props {
  data: TrendPoint[];
}

function fmtM(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return String(n);
}

export default function TrendLine({ data }: Props) {
  if (!data.length) return <div className="chart-empty">No data</div>;
  const activeRegions = REGIONS.filter((r) => data.some((d) => d[r] != null));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E5EA" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#5C6370' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmtM} tick={{ fontSize: 11, fill: '#5C6370' }} axisLine={false} tickLine={false} width={55} />
        <Tooltip
          formatter={(v: number, name: string) => [v.toLocaleString(), name]}
          contentStyle={{ border: '1px solid #E2E5EA', borderRadius: 6, fontSize: 12 }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        {activeRegions.map((r) => (
          <Line
            key={r}
            type="monotone"
            dataKey={r}
            stroke={REGION_COLORS[r]}
            strokeWidth={2.5}
            dot={{ r: 4, fill: REGION_COLORS[r] }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
