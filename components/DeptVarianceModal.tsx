'use client';
import { useEffect } from 'react';
import { REGION_COLORS } from '@/lib/colors';
import type { TableRow } from './DepartmentTable';

interface Props {
  row: TableRow;
  onClose: () => void;
}

function fmt(n: number | null): string {
  if (n === null) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function avg2(a: number | null, b: number | null): number | null {
  if (a === null || b === null) return null;
  return (a + b) / 2;
}

function DiffCell({ curr, prev, isCount = false }: { curr: number | null; prev: number | null; isCount?: boolean }) {
  if (curr === null || prev === null) return <span className="var-na">—</span>;
  const delta = curr - prev;
  const pct = prev !== 0 ? ((curr - prev) / prev) * 100 : null;
  const sign = delta >= 0 ? '+' : '';
  const isHigh = pct !== null && Math.abs(pct) > 3;
  const label = isCount
    ? `${sign}${delta}`
    : `${sign}${fmt(delta)}${pct !== null ? ` (${sign}${pct.toFixed(1)}%)` : ''}`;
  return <span className={isHigh ? 'var-flag' : delta === 0 ? 'var-na' : 'var-ok'}>{label}</span>;
}

function AvgDiffCell({ curr, a, b, isCount = false }: { curr: number | null; a: number | null; b: number | null; isCount?: boolean }) {
  const avgVal = avg2(a, b);
  return <DiffCell curr={curr} prev={avgVal} isCount={isCount} />;
}

export default function DeptVarianceModal({ row, onClose }: Props) {
  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const empDelta = row.prevEmp !== null ? row.employeeCount - row.prevEmp : null;
  let diagnosis = '';
  if (empDelta !== null && row.prevGross !== null) {
    if (empDelta === 0) {
      diagnosis = 'Headcount unchanged — variance is likely a salary rate adjustment or one-time payment (bonus, allowance).';
    } else if (empDelta < 0) {
      diagnosis = `Headcount dropped by ${Math.abs(empDelta)} — departures may explain the reduction in gross salary.`;
    } else {
      diagnosis = `Headcount increased by ${empDelta} — new joiners are likely driving the gross salary increase.`;
    }
  }

  const showEobi = row.eobi > 0 || (row.prevEobi !== null && row.prevEobi > 0) || (row.prev2Eobi !== null && row.prev2Eobi > 0);
  const showTax  = row.tax  > 0 || (row.prevTax  !== null && row.prevTax  > 0) || (row.prev2Tax  !== null && row.prev2Tax  > 0);
  const show2mo  = row.prev2Month !== null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="region-badge" style={{ background: REGION_COLORS[row.region] }}>{row.region}</span>
            <span className="modal-title">{row.department}</span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {row.prevMonth && row.currMonth && (
          <div className="modal-period">
            {show2mo ? `${row.prev2Month} → ${row.prevMonth} → ${row.currMonth}` : `${row.prevMonth} → ${row.currMonth}`}
          </div>
        )}

        <div className="modal-body">
          <table className="modal-table">
            <thead>
              <tr>
                <th>Metric</th>
                {show2mo && <th className="num">{row.prev2Month ?? '2mo Ago'}</th>}
                <th className="num">{row.prevMonth ?? 'Last Month'}</th>
                <th className="num">{row.currMonth ?? 'This Month'}</th>
                <th className="num">vs Last Month</th>
                {show2mo && <th className="num">vs 2mo Avg</th>}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Gross Salary</td>
                {show2mo && <td className="num">{fmt(row.prev2Gross)}</td>}
                <td className="num">{fmt(row.prevGross)}</td>
                <td className="num">{fmt(row.grossSalary)}</td>
                <td className="num"><DiffCell curr={row.grossSalary} prev={row.prevGross} /></td>
                {show2mo && <td className="num"><AvgDiffCell curr={row.grossSalary} a={row.prevGross} b={row.prev2Gross} /></td>}
              </tr>
              {row.netPayable > 0 && (
                <tr>
                  <td>Net Payable</td>
                  {show2mo && <td className="num">{fmt(row.prev2Net)}</td>}
                  <td className="num">{fmt(row.prevNet)}</td>
                  <td className="num">{fmt(row.netPayable)}</td>
                  <td className="num"><DiffCell curr={row.netPayable} prev={row.prevNet} /></td>
                  {show2mo && <td className="num"><AvgDiffCell curr={row.netPayable} a={row.prevNet} b={row.prev2Net} /></td>}
                </tr>
              )}
              {showEobi && (
                <tr>
                  <td>EOBI</td>
                  {show2mo && <td className="num">{fmt(row.prev2Eobi)}</td>}
                  <td className="num">{fmt(row.prevEobi)}</td>
                  <td className="num">{fmt(row.eobi)}</td>
                  <td className="num"><DiffCell curr={row.eobi} prev={row.prevEobi} /></td>
                  {show2mo && <td className="num"><AvgDiffCell curr={row.eobi} a={row.prevEobi} b={row.prev2Eobi} /></td>}
                </tr>
              )}
              {showTax && (
                <tr>
                  <td>Tax</td>
                  {show2mo && <td className="num">{fmt(row.prev2Tax)}</td>}
                  <td className="num">{fmt(row.prevTax)}</td>
                  <td className="num">{fmt(row.tax)}</td>
                  <td className="num"><DiffCell curr={row.tax} prev={row.prevTax} /></td>
                  {show2mo && <td className="num"><AvgDiffCell curr={row.tax} a={row.prevTax} b={row.prev2Tax} /></td>}
                </tr>
              )}
              <tr>
                <td>Employees</td>
                {show2mo && <td className="num">{row.prev2Emp ?? '—'}</td>}
                <td className="num">{row.prevEmp ?? '—'}</td>
                <td className="num">{row.employeeCount || '—'}</td>
                <td className="num"><DiffCell curr={row.employeeCount} prev={row.prevEmp} isCount /></td>
                {show2mo && <td className="num"><AvgDiffCell curr={row.employeeCount} a={row.prevEmp} b={row.prev2Emp} isCount /></td>}
              </tr>
            </tbody>
          </table>

          {diagnosis && (
            <div className="modal-diagnosis">
              <span className="modal-diagnosis-icon">💡</span>
              {diagnosis}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
