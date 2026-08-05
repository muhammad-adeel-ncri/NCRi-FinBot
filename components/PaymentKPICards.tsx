'use client';

export interface PaymentKPIData {
  totalGross: number;
  totalNetPayable: number;
  totalEobi: number;
  totalTax: number;
  totalGrossUp1pct: number;
  totalEmployees: number;
  grossMoM: number | null;
  netMoM: number | null;
  eobiMoM: number | null;
  taxMoM: number | null;
  grossUpMoM: number | null;
  employeesMoM: number | null;
  showUAE: boolean;
  showPK: boolean;
}

function compact(n: number): string {
  if (n >= 1_000_000) return `PKR ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `PKR ${Math.round(n / 1_000)}K`;
  return `PKR ${n.toLocaleString()}`;
}

function MoM({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="kpi-mom kpi-mom--na">--</span>;
  const pos = pct >= 0;
  return (
    <span className={`kpi-mom ${pos ? 'kpi-mom--pos' : 'kpi-mom--neg'}`}>
      {pos ? '+' : ''}{pct.toFixed(2)}%
    </span>
  );
}

export default function PaymentKPICards({ data }: { data: PaymentKPIData }) {
  return (
    <div className="kpi-grid">
      <div className="kpi-card kpi-card-hero">
        <div className="kpi-hero-value">{compact(data.totalGross)}</div>
        <div className="kpi-label">Total Gross Salary</div>
        <MoM pct={data.grossMoM} />
      </div>

      <div className="kpi-card">
        <div className="kpi-value">{data.totalEmployees.toLocaleString()}</div>
        <div className="kpi-label">Total Employees</div>
        <MoM pct={data.employeesMoM} />
      </div>

      {data.showPK && (
        <div className="kpi-card">
          <div className="kpi-value">{compact(data.totalNetPayable)}</div>
          <div className="kpi-label">Net Payable <span style={{ fontSize: 10, opacity: 0.6 }}>(PK)</span></div>
          <MoM pct={data.netMoM} />
        </div>
      )}

      {data.showPK && (
        <div className="kpi-card">
          <div className="kpi-value">{compact(data.totalEobi)}</div>
          <div className="kpi-label">EOBI Contribution <span style={{ fontSize: 10, opacity: 0.6 }}>(PK)</span></div>
          <MoM pct={data.eobiMoM} />
        </div>
      )}

      {data.showPK && (
        <div className="kpi-card">
          <div className="kpi-value">{compact(data.totalTax)}</div>
          <div className="kpi-label">Tax Withheld <span style={{ fontSize: 10, opacity: 0.6 }}>(PK)</span></div>
          <MoM pct={data.taxMoM} />
        </div>
      )}

    </div>
  );
}
