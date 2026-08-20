import { REGION_COLORS } from '@/lib/colors';

export interface TableRow {
  region: string;
  department: string;
  grossSalary: number;
  netPayable: number;
  eobi: number;
  tax: number;
  employeeCount: number;
  variance1: number | null;
  variance2: number | null;
  flagged: boolean;
  prevGross: number | null;
  prevNet: number | null;
  prevEobi: number | null;
  prevTax: number | null;
  prevEmp: number | null;
  prevMonth: string | null;
  prev2Gross: number | null;
  prev2Net: number | null;
  prev2Eobi: number | null;
  prev2Tax: number | null;
  prev2Emp: number | null;
  prev2Month: string | null;
  currMonth: string | null;
}

interface Props {
  rows: TableRow[];
  showRegion: boolean;
  onDetail: (row: TableRow) => void;
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtVariance(v: number | null) {
  if (v === null) return <span className="var-na">—</span>;
  const isHigh = Math.abs(v) > 3;
  const label = `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
  return <span className={isHigh ? 'var-flag' : 'var-ok'}>{label}</span>;
}

export default function DepartmentTable({ rows, showRegion, onDetail }: Props) {
  if (!rows.length) {
    return (
      <div className="table-empty">
        No data for the selected filters. Upload a payroll file to populate the dashboard.
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="dept-table">
        <thead>
          <tr>
            {showRegion && <th>Region</th>}
            <th>Department</th>
            <th className="num">Gross Salary</th>
            <th className="num">Net Payable</th>
            <th className="num">EOBI</th>
            <th className="num">Tax</th>
            <th className="num">Employees</th>
            <th className="num">vs Last Month</th>
            <th className="num">vs 2mo Ago</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={row.flagged ? 'row-flagged' : ''}>
              {showRegion && (
                <td>
                  <span className="region-badge" style={{ background: REGION_COLORS[row.region] }}>
                    {row.region}
                  </span>
                </td>
              )}
              <td className="dept-name">{row.department}</td>
              <td className="num">{fmt(row.grossSalary)}</td>
              <td className="num">{fmt(row.netPayable)}</td>
              <td className="num">{row.eobi ? fmt(row.eobi) : '—'}</td>
              <td className="num">{row.tax ? fmt(row.tax) : '—'}</td>
              <td className="num">{row.employeeCount || '—'}</td>
              <td className="num">{fmtVariance(row.variance1)}</td>
              <td className="num">{fmtVariance(row.variance2)}</td>
              <td>
                {row.prevMonth !== null && (
                  <button
                    className="btn-detail"
                    onClick={() => onDetail(row)}
                    title="View variance detail"
                  >
                    Detail
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
