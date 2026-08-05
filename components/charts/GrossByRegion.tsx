'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { REGION_COLORS } from '@/lib/colors';

interface Props {
  data: { region: string; total: number }[];
}

function fmtM(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toLocaleString();
}

export default function GrossByRegion({ data }: Props) {
  if (!data.length) return <div className="chart-empty">No data</div>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E5EA" vertical={false} />
        <XAxis dataKey="region" tick={{ fontSize: 12, fill: '#5C6370' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmtM} tick={{ fontSize: 11, fill: '#5C6370' }} axisLine={false} tickLine={false} width={55} />
        <Tooltip
          formatter={(v: number) => [v.toLocaleString(), 'Gross Salary']}
          contentStyle={{ border: '1px solid #E2E5EA', borderRadius: 6, fontSize: 12 }}
        />
        <Bar dataKey="total" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.region} fill={REGION_COLORS[entry.region] ?? '#6B7280'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
