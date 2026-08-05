'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts';

interface VarianceItem {
  name: string;
  variance: number;
}

interface Props {
  data: VarianceItem[];
}

export default function VarianceBar({ data }: Props) {
  if (!data.length) return <div className="chart-empty">No data — need at least 2 months of uploads</div>;

  const sorted = [...data].sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)).slice(0, 15);

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, sorted.length * 28)}>
      <BarChart layout="vertical" data={sorted} margin={{ top: 4, right: 40, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E5EA" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`}
          tick={{ fontSize: 11, fill: '#5C6370' }}
          axisLine={false}
          tickLine={false}
          domain={['auto', 'auto']}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: '#5C6370' }}
          axisLine={false}
          tickLine={false}
          width={140}
        />
        <Tooltip
          formatter={(v: number) => [`${v > 0 ? '+' : ''}${v.toFixed(2)}%`, 'vs Last Month']}
          contentStyle={{ border: '1px solid #E2E5EA', borderRadius: 6, fontSize: 12 }}
        />
        <ReferenceLine x={0} stroke="#E2E5EA" />
        <ReferenceLine x={3} stroke="#DC2626" strokeDasharray="4 2" strokeWidth={1} />
        <ReferenceLine x={-3} stroke="#DC2626" strokeDasharray="4 2" strokeWidth={1} />
        <Bar dataKey="variance" radius={[0, 4, 4, 0]}>
          {sorted.map((entry, i) => (
            <Cell
              key={i}
              fill={Math.abs(entry.variance) > 3 ? '#DC2626' : '#16A34A'}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
