'use client';
import { REGION_COLORS } from '@/lib/colors';

export interface PaymentTableRow {
  region: string;
  department: string;
  grossSalary: number;
  totalDeduction: number | null;
  grossUp1pct: number | null;
  eobi: number | null;
  tax: number | null;
  netPayable: number | null;
  employeeCount: number;
}

interface Props {
  rows: PaymentTableRow[];
  regionFilter: string[];
}

function fmt(n: number | null) {
  if (n === null || n === 0) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function PaymentTable({ rows, regionFilter }: Props) {
  if (!rows.length) {
    return <div className="table-empty">No data for selected filters. Upload a payment file to populate the dashboard.</div>;
  }

  const showRegion = regionFilter.length !== 1;
  const onlyUAE    = regionFilter.length === 1 && regionFilter[0] === 'UAE';
  const onlyPK     = regionFilter.length === 1 && regionFilter[0] === 'Pakistan';
  const showUAECols = !onlyPK;
  const showPKCols  = !onlyUAE;

  return (
    <div className="table-wrap">
      <table className="dept-table">
        <thead>
          <tr>
            {showRegion && <th>Region</th>}
            <th>Department</th>
            <th className="num">Gross Salary</th>
            {showUAECols && <th className="num">Total Deduction</th>}
            {showUAECols && <th className="num">Gross Up 1%</th>}
            {showPKCols  && <th className="num">EOBI</th>}
            {showPKCols  && <th className="num">Tax</th>}
            {showPKCols  && <th className="num">Net Payable</th>}
            <th className="num">Employees</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {showRegion && (
                <td>
                  <span className="region-badge" style={{ background: REGION_COLORS[row.region] ?? '#6B7280' }}>
                    {row.region}
                  </span>
                </td>
              )}
              <td className="dept-name">{row.department}</td>
              <td className="num">{fmt(row.grossSalary)}</td>
              {showUAECols && <td className="num">{fmt(row.totalDeduction)}</td>}
              {showUAECols && <td className="num">{fmt(row.grossUp1pct)}</td>}
              {showPKCols  && <td className="num">{fmt(row.eobi)}</td>}
              {showPKCols  && <td className="num">{fmt(row.tax)}</td>}
              {showPKCols  && <td className="num">{fmt(row.netPayable)}</td>}
              <td className="num">{row.employeeCount || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
