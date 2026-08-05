'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Item { name: string; eobi: number; tax: number; netPayable: number; }

function fmtM(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${Math.round(v / 1_000)}K`;
  return v.toLocaleString();
}

export default function PKDeductionBar({ data }: { data: Item[] }) {
  if (!data.length) return <div className="chart-empty">No Pakistan data for selected period</div>;
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 36)}>
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 20, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E5EA" horizontal={false} />
        <XAxis type="number" tickFormatter={fmtM} tick={{ fontSize: 11, fill: '#5C6370' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#5C6370' }} axisLine={false} tickLine={false} width={90} />
        <Tooltip
          formatter={(v: number, name: string) => [`PKR ${v.toLocaleString()}`, name]}
          contentStyle={{ border: '1px solid #E2E5EA', borderRadius: 6, fontSize: 12 }}
        />
        <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="netPayable" name="Net Payable" stackId="a" fill="#01411C" fillOpacity={0.85} />
        <Bar dataKey="eobi"       name="EOBI"        stackId="a" fill="#076432" fillOpacity={0.75} />
        <Bar dataKey="tax"        name="Tax"         stackId="a" fill="#3A9B60" fillOpacity={0.75} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
