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

export default function DeptVarianceModal({ row, onClose }: Props) {
  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const prevGrossPerEmp = row.prevEmp && row.prevEmp > 0 && row.prevGross !== null
    ? row.prevGross / row.prevEmp : null;
  const currGrossPerEmp = row.employeeCount > 0 ? row.grossSalary / row.employeeCount : null;

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

  const showEobi = row.eobi > 0 || (row.prevEobi !== null && row.prevEobi > 0);
  const showTax  = row.tax  > 0 || (row.prevTax  !== null && row.prevTax  > 0);

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
          <div className="modal-period">{row.prevMonth} → {row.currMonth}</div>
        )}

        <div className="modal-body">
          <table className="modal-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th className="num">{row.prevMonth ?? 'Prev Month'}</th>
                <th className="num">{row.currMonth ?? 'This Month'}</th>
                <th className="num">Change</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Gross Salary</td>
                <td className="num">{fmt(row.prevGross)}</td>
                <td className="num">{fmt(row.grossSalary)}</td>
                <td className="num"><DiffCell curr={row.grossSalary} prev={row.prevGross} /></td>
              </tr>
              {row.netPayable > 0 && (
                <tr>
                  <td>Net Payable</td>
                  <td className="num">{fmt(row.prevNet)}</td>
                  <td className="num">{fmt(row.netPayable)}</td>
                  <td className="num"><DiffCell curr={row.netPayable} prev={row.prevNet} /></td>
                </tr>
              )}
              {showEobi && (
                <tr>
                  <td>EOBI</td>
                  <td className="num">{fmt(row.prevEobi)}</td>
                  <td className="num">{fmt(row.eobi)}</td>
                  <td className="num"><DiffCell curr={row.eobi} prev={row.prevEobi} /></td>
                </tr>
              )}
              {showTax && (
                <tr>
                  <td>Tax</td>
                  <td className="num">{fmt(row.prevTax)}</td>
                  <td className="num">{fmt(row.tax)}</td>
                  <td className="num"><DiffCell curr={row.tax} prev={row.prevTax} /></td>
                </tr>
              )}
              <tr>
                <td>Employees</td>
                <td className="num">{row.prevEmp ?? '—'}</td>
                <td className="num">{row.employeeCount || '—'}</td>
                <td className="num"><DiffCell curr={row.employeeCount} prev={row.prevEmp} isCount /></td>
              </tr>
              <tr className="modal-row-highlight">
                <td>Gross / Employee</td>
                <td className="num">{fmt(prevGrossPerEmp)}</td>
                <td className="num">{fmt(currGrossPerEmp)}</td>
                <td className="num"><DiffCell curr={currGrossPerEmp} prev={prevGrossPerEmp} /></td>
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
