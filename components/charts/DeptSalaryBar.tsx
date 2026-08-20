'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { REGION_COLORS } from '@/lib/colors';

interface Item { name: string; value: number; region: string; }

function fmtM(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${Math.round(v / 1_000)}K`;
  return v.toLocaleString();
}

function CustomTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  if (!payload) return null;
  const full = payload.value;
  const parts = full.split(' · ');
  const region = parts.length > 1 ? parts[0] : '';
  const dept   = parts.length > 1 ? parts.slice(1).join(' · ') : full;
  const color  = REGION_COLORS[region] ?? '#6B7280';
  const MAX = 22;
  const label = dept.length > MAX ? dept.slice(0, MAX) + '…' : dept;

  return (
    <g transform={`translate(${x},${y})`}>
      {region && (
        <circle cx={-8} cy={-5} r={3.5} fill={color} opacity={0.9} />
      )}
      <text x={region ? -16 : 0} y={0} textAnchor="end" fill="#374151" fontSize={11} fontWeight={500} dy={4}>
        {label}
      </text>
    </g>
  );
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: Item; value: number }[] }) {
  if (!active || !payload?.length) return null;
  const { name, region } = payload[0].payload;
  const val = payload[0].value;
  const color = REGION_COLORS[region] ?? '#6B7280';
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{name}</span>
      </div>
      <div style={{ color: 'var(--text-2)' }}>Gross Salary: <strong style={{ color: 'var(--text)' }}>PKR {val.toLocaleString()}</strong></div>
    </div>
  );
}

export default function DeptSalaryBar({ data }: { data: Item[] }) {
  if (!data.length) return <div className="chart-empty">No data for selected filters</div>;

  const sorted = [...data].sort((a, b) => b.value - a.value);

  return (
    <ResponsiveContainer width="100%" height={Math.max(260, sorted.length * 34)}>
      <BarChart layout="vertical" data={sorted} margin={{ top: 4, right: 72, left: 20, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E5EA" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v) => `PKR ${fmtM(v)}`}
          tick={{ fontSize: 10, fill: '#9CA3AF' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={<CustomTick />}
          axisLine={false}
          tickLine={false}
          width={160}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey="value" radius={[0, 5, 5, 0]} barSize={16}
          label={{ position: 'right', formatter: (v: number) => `PKR ${fmtM(v)}`, fontSize: 10, fill: '#9CA3AF' }}>
          {sorted.map((entry, i) => (
            <Cell key={i} fill={REGION_COLORS[entry.region] ?? '#6B7280'} fillOpacity={0.88} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
