'use client';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import PaymentKPICards, { PaymentKPIData } from '@/components/PaymentKPICards';
import PaymentTable, { PaymentTableRow } from '@/components/PaymentTable';

let _cache: { rows: PaymentRow[]; isDemo: boolean } | null = null;

const PaymentByDept   = dynamic(() => import('@/components/charts/PaymentByDept'),   { ssr: false, loading: () => <div className="chart-empty">Loading…</div> });
const GrossByRegion   = dynamic(() => import('@/components/charts/GrossByRegion'),   { ssr: false, loading: () => <div className="chart-empty">Loading…</div> });
const TrendLine       = dynamic(() => import('@/components/charts/TrendLine'),       { ssr: false, loading: () => <div className="chart-empty">Loading…</div> });

interface RawRow {
  region: string; department: string;
  gross_salary: number; total_deduction: number | null; gross_up_1pct: number | null;
  eobi: number | null; tax: number | null; net_payable: number | null; employee_count: number;
  payment_snapshots: { salary_month: string; salary_year: number; salary_month_num: number } | null;
}

interface PaymentRow {
  region: string; department: string;
  grossSalary: number; totalDeduction: number | null; grossUp1pct: number | null;
  eobi: number | null; tax: number | null; netPayable: number | null; employeeCount: number;
  salaryMonth: string; salaryYear: number; salaryMonthNum: number; periodKey: number;
}

function makeDemoRows(): PaymentRow[] {
  const months = [
    { month: 'October 2025',  year: 2025, num: 10 },
    { month: 'November 2025', year: 2025, num: 11 },
    { month: 'December 2025', year: 2025, num: 12 },
    { month: 'January 2026',  year: 2026, num:  1 },
  ];
  const uaeDepts = [
    { name: 'Finance',     gross: 302467, deduction: 0,      grossUp: 3025 },
    { name: 'Operations',  gross: 578520, deduction: 0,      grossUp: 5785 },
    { name: 'HR',          gross: 212918, deduction: 0,      grossUp: 2129 },
    { name: 'IT',          gross: 548450, deduction: 0,      grossUp: 5485 },
    { name: 'Management',  gross: 197099, deduction: 0,      grossUp: 1971 },
    { name: 'Sales',       gross: 507852, deduction: 351032, grossUp: 5079 },
    { name: 'Admin',       gross: 400000, deduction: 0,      grossUp: 4000 },
  ];
  const pkDepts = [
    { name: 'Finance',     gross: 341000,  eobi: 370,  tax: 7775,  net: 332855, emp: 2 },
    { name: 'Management',  gross: 365666,  eobi: 1110, tax: 404,   net: 364152, emp: 6 },
    { name: 'Operations',  gross: 200000,  eobi: 370,  tax: 774,   net: 198856, emp: 1 },
    { name: 'HR',          gross: 320000,  eobi: 1480, tax: 408,   net: 318112, emp: 4 },
    { name: 'Finance 2',   gross: 520159,  eobi: 1110, tax: 41824, net: 477225, emp: 3 },
    { name: 'IT',          gross: 994000,  eobi: 2220, tax: 18161, net: 973619, emp: 6 },
  ];
  const rows: PaymentRow[] = [];
  months.forEach(({ month, year, num }) => {
    const pk = year * 12 + num;
    const v  = 1 + (Math.random() - 0.5) * 0.06;
    uaeDepts.forEach((d) => {
      rows.push({
        region: 'UAE', department: d.name,
        grossSalary: Math.round(d.gross * v), totalDeduction: d.deduction ? Math.round(d.deduction * v) : 0,
        grossUp1pct: Math.round(d.grossUp * v), eobi: null, tax: null, netPayable: null,
        employeeCount: 1, salaryMonth: month, salaryYear: year, salaryMonthNum: num, periodKey: pk,
      });
    });
    pkDepts.forEach((d) => {
      rows.push({
        region: 'Pakistan', department: d.name,
        grossSalary: Math.round(d.gross * v), totalDeduction: null, grossUp1pct: null,
        eobi: Math.round(d.eobi * v), tax: Math.round(d.tax * v), netPayable: Math.round(d.net * v),
        employeeCount: d.emp, salaryMonth: month, salaryYear: year, salaryMonthNum: num, periodKey: pk,
      });
    });
  });
  return rows;
}

function CheckboxDropdown({
  placeholder,
  options,
  selected,
  onChange,
}: {
  placeholder: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const label =
    selected.length === 0 || selected.length === options.length
      ? placeholder
      : selected.join(', ');

  function toggle(opt: string) {
    onChange(selected.includes(opt) ? selected.filter((v) => v !== opt) : [...selected, opt]);
  }

  return (
    <div className="cb-dropdown" ref={ref}>
      <button className="slicer cb-trigger" onClick={() => setOpen((o) => !o)} type="button">
        <span>{label}</span>
        <span className="cb-arrow" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
      </button>
      {open && (
        <div className="cb-panel">
          <label className="cb-item">
            <input type="checkbox" checked={selected.length === 0} onChange={() => onChange([])} />
            <span>All</span>
          </label>
          {options.map((opt) => (
            <label key={opt} className="cb-item">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PaymentDashboardPage() {
  const [rows, setRows]         = useState<PaymentRow[]>(_cache?.rows ?? []);
  const [loading, setLoading]   = useState(_cache === null);
  const [isDemo,  setIsDemo]    = useState(_cache?.isDemo ?? false);
  const [periodFilters, setPeriodFilters] = useState<string[]>([]);
  const [regionFilters, setRegionFilters] = useState<string[]>([]);
  const [deptFilters,   setDeptFilters]   = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('payment_dept_data')
      .select('*, payment_snapshots(salary_month, salary_year, salary_month_num)');
    const processed = data
      ? (data as RawRow[])
          .filter((r) => r.payment_snapshots)
          .map((r) => ({
            region: r.region, department: r.department,
            grossSalary: r.gross_salary, totalDeduction: r.total_deduction,
            grossUp1pct: r.gross_up_1pct, eobi: r.eobi, tax: r.tax, netPayable: r.net_payable,
            employeeCount: r.employee_count,
            salaryMonth:    r.payment_snapshots!.salary_month,
            salaryYear:     r.payment_snapshots!.salary_year,
            salaryMonthNum: r.payment_snapshots!.salary_month_num,
            periodKey: r.payment_snapshots!.salary_year * 12 + r.payment_snapshots!.salary_month_num,
          }))
      : [];
    const finalRows = processed.length > 0 ? processed : makeDemoRows();
    const demo      = processed.length === 0;
    _cache = { rows: finalRows, isDemo: demo };
    setRows(finalRows);
    setIsDemo(demo);
    setLoading(false);
  }, []);

  useEffect(() => { if (_cache !== null) return; fetchData(); }, [fetchData]);

  const periods = useMemo(
    () => [...new Set(rows.map((r) => r.periodKey))].sort((a, b) => b - a),
    [rows]
  );

  const periodOptions = useMemo(() =>
    periods.map((pk) => {
      const r = rows.find((x) => x.periodKey === pk);
      return { key: pk, label: r ? r.salaryMonth : String(pk) };
    }),
    [periods, rows]
  );

  const selectedRows = useMemo(
    () => periodFilters.length ? rows.filter((r) => periodFilters.includes(r.salaryMonth)) : rows,
    [rows, periodFilters]
  );

  const availableDepts = useMemo(() => {
    const source = regionFilters.length === 0 ? selectedRows : selectedRows.filter((r) => regionFilters.includes(r.region));
    return [...new Set(source.map((r) => r.department))].sort();
  }, [selectedRows, regionFilters]);

  const filteredRows = useMemo(() => {
    let src = selectedRows;
    if (regionFilters.length) src = src.filter((r) => regionFilters.includes(r.region));
    if (deptFilters.length)   src = src.filter((r) => deptFilters.includes(r.department));
    return src;
  }, [selectedRows, regionFilters, deptFilters]);

  const showUAE = !regionFilters.length || regionFilters.includes('UAE');
  const showPK  = !regionFilters.length || regionFilters.includes('Pakistan');

  // KPI data
  const prevRows = useMemo(() => {
    if (periodFilters.length !== 1) return [];
    const refPK = rows.find((r) => r.salaryMonth === periodFilters[0])?.periodKey;
    if (refPK === undefined) return [];
    const prevPK = periods[periods.indexOf(refPK) + 1];
    if (!prevPK) return [];
    let pr = rows.filter((r) => r.periodKey === prevPK);
    if (regionFilters.length) pr = pr.filter((r) => regionFilters.includes(r.region));
    if (deptFilters.length)   pr = pr.filter((r) => deptFilters.includes(r.department));
    return pr;
  }, [rows, periodFilters, periods, regionFilters, deptFilters]);

  const sum = (arr: PaymentRow[], k: keyof PaymentRow) =>
    arr.reduce((s, r) => s + (Number(r[k]) || 0), 0);
  const moM = (c: number, p: number) => prevRows.length && p !== 0 ? ((c - p) / p) * 100 : null;

  const kpiData = useMemo((): PaymentKPIData => {
    const gross   = sum(filteredRows, 'grossSalary');
    const net     = sum(filteredRows, 'netPayable');
    const eobi    = sum(filteredRows, 'eobi');
    const tax     = sum(filteredRows, 'tax');
    const grossUp = sum(filteredRows, 'grossUp1pct');
    const emp     = sum(filteredRows, 'employeeCount');
    const pGross  = sum(prevRows, 'grossSalary');
    const pNet    = sum(prevRows, 'netPayable');
    const pEobi   = sum(prevRows, 'eobi');
    const pTax    = sum(prevRows, 'tax');
    const pGrossUp = sum(prevRows, 'grossUp1pct');
    const pEmp    = sum(prevRows, 'employeeCount');
    return {
      totalGross: gross, totalNetPayable: net, totalEobi: eobi,
      totalTax: tax, totalGrossUp1pct: grossUp, totalEmployees: emp,
      grossMoM: moM(gross, pGross), netMoM: moM(net, pNet),
      eobiMoM: moM(eobi, pEobi), taxMoM: moM(tax, pTax),
      grossUpMoM: moM(grossUp, pGrossUp), employeesMoM: moM(emp, pEmp),
      showUAE, showPK,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRows, prevRows, showUAE, showPK]);

  // Chart data
  const deptChartData = useMemo(() => {
    const map: Record<string, { value: number; region: string }> = {};
    filteredRows.forEach((r) => {
      const key = `${r.region}__${r.department}`;
      if (!map[key]) map[key] = { value: 0, region: r.region };
      map[key].value += r.grossSalary;
    });
    return Object.entries(map).map(([key, d]) => ({
      name: key.split('__')[1],
      value: d.value,
      region: d.region,
    }));
  }, [filteredRows]);

  const regionSplitData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRows.forEach((r) => { map[r.region] = (map[r.region] ?? 0) + r.grossSalary; });
    return Object.entries(map).map(([region, total]) => ({ region, total }));
  }, [filteredRows]);

  const pkDeductionData = useMemo(() =>
    filteredRows
      .filter((r) => r.region === 'Pakistan')
      .map((r) => ({
        name: r.department,
        eobi:       r.eobi       ?? 0,
        tax:        r.tax        ?? 0,
        netPayable: r.netPayable ?? 0,
      })),
    [filteredRows]
  );

  const trendData = useMemo(() =>
    [...periods].reverse().map((pk) => {
      const pr = rows.filter((r) => r.periodKey === pk);
      const label = pr[0] ? `${pr[0].salaryMonth.slice(0, 3)} ${pr[0].salaryYear}` : String(pk);
      const point: { label: string; UAE?: number; Pakistan?: number } = { label };
      (['UAE', 'Pakistan'] as const).forEach((region) => {
        const rr = pr.filter((r) => r.region === region);
        if (rr.length) point[region] = rr.reduce((s, r) => s + r.grossSalary, 0);
      });
      return point;
    }),
    [rows, periods]
  );

  const tableRows = useMemo((): PaymentTableRow[] => {
    if (periodFilters.length === 1) {
      return [...filteredRows]
        .sort((a, b) => a.region.localeCompare(b.region) || a.department.localeCompare(b.department))
        .map((r) => ({
          region: r.region, department: r.department,
          grossSalary: r.grossSalary, totalDeduction: r.totalDeduction,
          grossUp1pct: r.grossUp1pct, eobi: r.eobi, tax: r.tax,
          netPayable: r.netPayable, employeeCount: r.employeeCount,
        }));
    }
    const map: Record<string, { row: PaymentTableRow; latestPK: number }> = {};
    filteredRows.forEach((r) => {
      const key = `${r.region}__${r.department}`;
      if (!map[key]) {
        map[key] = {
          row: {
            region: r.region, department: r.department,
            grossSalary: 0, totalDeduction: null, grossUp1pct: null,
            eobi: null, tax: null, netPayable: null, employeeCount: 0,
          },
          latestPK: 0,
        };
      }
      const entry = map[key];
      entry.row.grossSalary += r.grossSalary;
      if (r.totalDeduction !== null) entry.row.totalDeduction = (entry.row.totalDeduction ?? 0) + r.totalDeduction;
      if (r.grossUp1pct   !== null) entry.row.grossUp1pct   = (entry.row.grossUp1pct   ?? 0) + r.grossUp1pct;
      if (r.eobi          !== null) entry.row.eobi          = (entry.row.eobi          ?? 0) + r.eobi;
      if (r.tax           !== null) entry.row.tax           = (entry.row.tax           ?? 0) + r.tax;
      if (r.netPayable    !== null) entry.row.netPayable    = (entry.row.netPayable    ?? 0) + r.netPayable;
      if (r.periodKey > entry.latestPK) {
        entry.latestPK = r.periodKey;
        entry.row.employeeCount = r.employeeCount;
      }
    });
    return Object.values(map)
      .map((e) => e.row)
      .sort((a, b) => a.region.localeCompare(b.region) || a.department.localeCompare(b.department));
  }, [filteredRows, periodFilters]);

  if (loading) return (
    <div className="page-content">
      <div className="page-header"><h2 className="page-title">Payroll Overview</h2></div>
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card kpi-card-hero"><div className="skeleton" style={{ height: 48, borderRadius: 6, marginBottom: 10 }} /><div className="skeleton" style={{ height: 14, width: '60%', borderRadius: 4 }} /></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="kpi-card"><div className="skeleton" style={{ height: 28, borderRadius: 5, marginBottom: 8 }} /><div className="skeleton" style={{ height: 12, width: '70%', borderRadius: 4 }} /></div>
        ))}
      </div>
      <div className="charts-row" style={{ marginBottom: 24 }}>
        <div className="chart-card"><div className="skeleton" style={{ height: 220, borderRadius: 6 }} /></div>
        <div className="chart-card"><div className="skeleton" style={{ height: 220, borderRadius: 6 }} /></div>
      </div>
      <div className="chart-card" style={{ marginBottom: 24 }}><div className="skeleton" style={{ height: 240, borderRadius: 6 }} /></div>
      <div className="table-card">{[...Array(5)].map((_, i) => (<div key={i} style={{ padding: '12px 20px', borderBottom: '1px solid #F3F4F6' }}><div className="skeleton" style={{ height: 14, borderRadius: 4 }} /></div>))}</div>
    </div>
  );

  return (
    <div className="page-content">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 className="page-title">Payroll Overview</h2>
        </div>
        <button className="btn-refresh" onClick={fetchData} title="Refresh data">↻ Refresh</button>
      </div>

      {isDemo && (
        <div className="dash-demo-banner">
          ⚠ Showing sample data — <a href="/payment-upload" style={{ fontWeight: 600, color: 'inherit', textDecoration: 'underline' }}>upload a payment file</a> to see real figures.
        </div>
      )}

      {/* Slicers */}
      <div className="slicers-row">
        <CheckboxDropdown
          placeholder="All Periods"
          options={periodOptions.map((o) => o.label)}
          selected={periodFilters}
          onChange={(v) => { setPeriodFilters(v); setRegionFilters([]); setDeptFilters([]); }}
        />

        <CheckboxDropdown
          placeholder="All Regions"
          options={['UAE', 'Pakistan']}
          selected={regionFilters}
          onChange={(v) => { setRegionFilters(v); setDeptFilters([]); }}
        />

        <CheckboxDropdown
          placeholder="All Departments"
          options={availableDepts}
          selected={deptFilters}
          onChange={setDeptFilters}
        />

        {(periodFilters.length > 0 || regionFilters.length > 0 || deptFilters.length > 0) && (
          <button className="slicer-reset" onClick={() => { setPeriodFilters([]); setRegionFilters([]); setDeptFilters([]); }}>
            Clear filters
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <PaymentKPICards data={kpiData} />

      {/* Charts row — mirrors expense dashboard: region bar + trend line */}
      <div className="charts-row">
        <div className="chart-card">
          <div className="chart-title">Gross Salary by Region</div>
          <GrossByRegion data={regionSplitData} />
        </div>
        <div className="chart-card">
          <div className="chart-title">
            Payment Trend
            <span className="chart-period-count">{periods.length} month{periods.length !== 1 ? 's' : ''}</span>
          </div>
          <TrendLine data={trendData} />
        </div>
      </div>

      {/* Department breakdown — full width, mirrors expense dashboard */}
      <div className="chart-card" style={{ marginBottom: 24 }}>
        <div className="chart-title">Departments by Payroll</div>
        <PaymentByDept data={deptChartData} />
      </div>

      {/* Table */}
      <div className="table-card">
        <div className="table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="chart-title" style={{ marginBottom: 0 }}>Department Wise Breakdown</span>
            <span className="table-info-icon">
              ℹ
              <span className="table-info-tooltip">
                By default, shows all departments with values <strong>summed across all months</strong>. Select a specific month from the <strong>Period filter</strong> above to view a single month only. Region and Department filters also apply.
              </span>
            </span>
          </div>
        </div>
        <PaymentTable rows={tableRows} regionFilter={regionFilters} />
      </div>
    </div>
  );
}
