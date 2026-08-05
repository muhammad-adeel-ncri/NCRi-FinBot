'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { REGION_COLORS } from '@/lib/colors';

interface Item { name: string; value: number; region: string; }

function fmtM(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${Math.round(v / 1_000)}K`;
  return v.toLocaleString();
}

export default function PaymentByDept({ data }: { data: Item[] }) {
  if (!data.length) return <div className="chart-empty">No data for selected filters</div>;
  const sorted = [...data].sort((a, b) => b.value - a.value);
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, sorted.length * 32)}>
      <BarChart layout="vertical" data={sorted} margin={{ top: 4, right: 48, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E5EA" horizontal={false} />
        <XAxis type="number" tickFormatter={fmtM} tick={{ fontSize: 11, fill: '#5C6370' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#5C6370' }} axisLine={false} tickLine={false} width={90} />
        <Tooltip
          formatter={(v: number, _: string, props: { payload?: Item }) => [`PKR ${v.toLocaleString()}`, props.payload?.region ?? 'Gross Salary']}
          contentStyle={{ border: '1px solid #E2E5EA', borderRadius: 6, fontSize: 12 }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} label={{ position: 'right', formatter: fmtM, fontSize: 11, fill: '#5C6370' }}>
          {sorted.map((entry, i) => (
            <Cell key={i} fill={REGION_COLORS[entry.region] ?? '#6B7280'} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
