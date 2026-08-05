'use client';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { REGION_COLORS } from '@/lib/colors';

interface Props { data: { region: string; total: number }[] }

function fmtM(v: number) {
  if (v >= 1_000_000) return `PKR ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `PKR ${Math.round(v / 1_000)}K`;
  return `PKR ${v.toLocaleString()}`;
}

function renderLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
  cx: number; cy: number; midAngle: number;
  innerRadius: number; outerRadius: number; percent: number;
}) {
  if (percent < 0.05) return null;
  const rad = (Math.PI / 180) * midAngle;
  const r   = innerRadius + (outerRadius - innerRadius) * 0.55;
  return (
    <text x={cx + r * Math.cos(-rad)} y={cy + r * Math.sin(-rad)}
      fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function RegionSplit({ data }: Props) {
  if (!data.length) return <div className="chart-empty">No data</div>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <Pie
          data={data}
          dataKey="total"
          nameKey="region"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={95}
          labelLine={false}
          label={renderLabel}
        >
          {data.map((entry) => (
            <Cell key={entry.region} fill={REGION_COLORS[entry.region] ?? '#6B7280'} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number) => [fmtM(v), 'Gross Salary']}
          contentStyle={{ border: '1px solid #E2E5EA', borderRadius: 6, fontSize: 12 }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
