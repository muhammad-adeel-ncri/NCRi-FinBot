'use client';

export interface KPIData {
  grossSalary: number;
  netPayable: number;
  employees: number;
  tax: number;
  eobi: number;
  grossMoM:     number | null;
  netMoM:       number | null;
  employeesMoM: number | null;
  taxMoM:       number | null;
  eobiMoM:      number | null;
}

function compact(n: number, currency = true): string {
  const p = currency ? 'PKR ' : '';
  if (n >= 1_000_000) return `${p}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${p}${Math.round(n / 1_000)}K`;
  return `${p}${n.toLocaleString()}`;
}

function MoM({ pct, label }: { pct: number | null; label?: string }) {
  if (pct === null) return <span className="kpi-mom kpi-mom--na">--</span>;
  const pos = pct >= 0;
  return (
    <span className={`kpi-mom ${pos ? 'kpi-mom--pos' : 'kpi-mom--neg'}`}>
      {label && <span className="kpi-mom-label">{label} </span>}
      {pos ? '+' : ''}{pct.toFixed(2)}%
    </span>
  );
}

export default function KPICards({ data }: { data: KPIData }) {
  return (
    <div className="kpi-grid">

      {/* ── Large hero card ── */}
      <div className="kpi-card kpi-card-hero">
        <div className="kpi-hero-value">{compact(data.grossSalary)}</div>
        <div className="kpi-label">Total Gross Salary</div>
        <MoM pct={data.grossMoM} />
      </div>

      {/* ── Row 1 ── */}
      <div className="kpi-card">
        <div className="kpi-value">{compact(data.netPayable)}</div>
        <div className="kpi-label">Total Net Payable</div>
        <MoM pct={data.netMoM} />
      </div>

      <div className="kpi-card">
        <div className="kpi-value">{data.employees.toLocaleString()}</div>
        <div className="kpi-label">Total Employees</div>
        <MoM pct={data.employeesMoM} />
      </div>

      {/* ── Row 2 ── */}
      <div className="kpi-card">
        <div className="kpi-value">{compact(data.tax)}</div>
        <div className="kpi-label">Total Tax</div>
        <MoM pct={data.taxMoM} label="Tax MoM %" />
      </div>

      <div className="kpi-card">
        <div className="kpi-value">{compact(data.eobi)}</div>
        <div className="kpi-label">Total EOBI Contribution</div>
        <MoM pct={data.eobiMoM} />
      </div>

    </div>
  );
}
