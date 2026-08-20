'use client';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';
import KPICards, { KPIData } from '@/components/KPICards';
import DepartmentTable, { TableRow } from '@/components/DepartmentTable';
import DeptVarianceModal from '@/components/DeptVarianceModal';
import PayrollForecast from '@/components/PayrollForecast';

// Module-level cache — survives tab switches, cleared on manual refresh
let _cache: { rows: DeptRow[]; isDemo: boolean } | null = null;

const GrossByRegion = dynamic(() => import('@/components/charts/GrossByRegion'), {
  ssr: false, loading: () => <div className="chart-empty">Loading…</div>,
});
const TrendLine = dynamic(() => import('@/components/charts/TrendLine'), {
  ssr: false, loading: () => <div className="chart-empty">Loading…</div>,
});
const DeptSalaryBar = dynamic(() => import('@/components/charts/DeptSalaryBar'), {
  ssr: false, loading: () => <div className="chart-empty">Loading…</div>,
});

interface RawRow {
  region: string; department: string; gross_salary: number; net_payable: number;
  eobi: number; tax: number; employee_count: number;
  payroll_snapshots: { salary_month: string; salary_year: number; salary_month_num: number } | null;
}

interface DeptRow {
  region: string; department: string; grossSalary: number; netPayable: number;
  eobi: number; tax: number; employeeCount: number;
  salaryMonth: string; salaryYear: number; salaryMonthNum: number; periodKey: number;
}

function makeDemoRows(): DeptRow[] {
  const months = [
    { month: 'October 2025',  year: 2025, num: 10 },
    { month: 'November 2025', year: 2025, num: 11 },
    { month: 'December 2025', year: 2025, num: 12 },
    { month: 'January 2026',  year: 2026, num:  1 },
  ];

  // Each dept has 4 monthly values. Flagged depts have >3% MoM change in January.
  const depts: { region: string; department: string; values: { gross: number; net: number; eobi: number; tax: number; emp: number }[] }[] = [
    // Canada Finance: +15.1% Jan — FLAGGED
    { region: 'Canada', department: 'Finance', values: [
      { gross: 4200000, net: 3780000, eobi: 0, tax: 399000, emp: 42 },
      { gross: 4250000, net: 3825000, eobi: 0, tax: 403750, emp: 42 },
      { gross: 4300000, net: 3870000, eobi: 0, tax: 408500, emp: 43 },
      { gross: 4950000, net: 4455000, eobi: 0, tax: 470250, emp: 43 },
    ]},
    // Canada HR: +1.1% Jan — stable
    { region: 'Canada', department: 'HR', values: [
      { gross: 1800000, net: 1620000, eobi: 0, tax: 171000, emp: 18 },
      { gross: 1820000, net: 1638000, eobi: 0, tax: 172900, emp: 18 },
      { gross: 1810000, net: 1629000, eobi: 0, tax: 171950, emp: 18 },
      { gross: 1830000, net: 1647000, eobi: 0, tax: 173850, emp: 18 },
    ]},
    // Canada Operations: -13.5% Jan — FLAGGED
    { region: 'Canada', department: 'Operations', values: [
      { gross: 3100000, net: 2790000, eobi: 0, tax: 294500, emp: 31 },
      { gross: 3150000, net: 2835000, eobi: 0, tax: 299250, emp: 31 },
      { gross: 3120000, net: 2808000, eobi: 0, tax: 296400, emp: 31 },
      { gross: 2700000, net: 2430000, eobi: 0, tax: 256500, emp: 27 },
    ]},
    // Pakistan Finance: +1.3% Jan — stable
    { region: 'Pakistan', department: 'Finance', values: [
      { gross: 1500000, net: 1260000, eobi: 375000, tax: 90000, emp: 35 },
      { gross: 1520000, net: 1276800, eobi: 380000, tax: 91200, emp: 35 },
      { gross: 1490000, net: 1251600, eobi: 372500, tax: 89400, emp: 35 },
      { gross: 1510000, net: 1268400, eobi: 377500, tax: 90600, emp: 35 },
    ]},
    // Pakistan Engineering: -14.3% Jan — FLAGGED
    { region: 'Pakistan', department: 'Engineering', values: [
      { gross: 900000, net: 756000, eobi: 225000, tax: 54000, emp: 21 },
      { gross: 895000, net: 751800, eobi: 223750, tax: 53700, emp: 21 },
      { gross: 910000, net: 764400, eobi: 227500, tax: 54600, emp: 21 },
      { gross: 780000, net: 655200, eobi: 195000, tax: 46800, emp: 18 },
    ]},
    // Pakistan HR: +0.7% Jan — stable
    { region: 'Pakistan', department: 'HR', values: [
      { gross: 600000, net: 504000, eobi: 150000, tax: 36000, emp: 14 },
      { gross: 605000, net: 508200, eobi: 151250, tax: 36300, emp: 14 },
      { gross: 598000, net: 502320, eobi: 149500, tax: 35880, emp: 14 },
      { gross: 602000, net: 505680, eobi: 150500, tax: 36120, emp: 14 },
    ]},
    // UAE Finance: +14.6% Jan — FLAGGED
    { region: 'UAE', department: 'Finance', values: [
      { gross: 3100000, net: 3069000, eobi: 0, tax: 0, emp: 31 },
      { gross: 3120000, net: 3088800, eobi: 0, tax: 0, emp: 31 },
      { gross: 3090000, net: 3059100, eobi: 0, tax: 0, emp: 31 },
      { gross: 3540000, net: 3504600, eobi: 0, tax: 0, emp: 31 },
    ]},
    // UAE Operations: +2.2% Jan — stable
    { region: 'UAE', department: 'Operations', values: [
      { gross: 1400000, net: 1386000, eobi: 0, tax: 0, emp: 14 },
      { gross: 1410000, net: 1395900, eobi: 0, tax: 0, emp: 14 },
      { gross: 1390000, net: 1376100, eobi: 0, tax: 0, emp: 14 },
      { gross: 1420000, net: 1405800, eobi: 0, tax: 0, emp: 14 },
    ]},
  ];

  const rows: DeptRow[] = [];
  months.forEach(({ month, year, num }, mi) => {
    const pk = year * 12 + num;
    depts.forEach(({ region, department, values }) => {
      const v = values[mi];
      rows.push({
        region, department,
        grossSalary: v.gross, netPayable: v.net, eobi: v.eobi, tax: v.tax, employeeCount: v.emp,
        salaryMonth: month, salaryYear: year, salaryMonthNum: num, periodKey: pk,
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

export default function DashboardPage() {
  const [rows, setRows]               = useState<DeptRow[]>(_cache?.rows ?? []);
  const [loading, setLoading]         = useState(_cache === null);
  const [isDemo,  setIsDemo]          = useState(_cache?.isDemo ?? false);
  const [periodFilters, setPeriodFilters] = useState<string[]>([]);
  const [regionFilters, setRegionFilters] = useState<string[]>([]);
  const [deptFilters,   setDeptFilters]   = useState<string[]>([]);
  const [detailRow,     setDetailRow]     = useState<TableRow | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('department_data')
      .select('*, payroll_snapshots(salary_month, salary_year, salary_month_num)');
    const processed = data
      ? (data as RawRow[])
          .filter((r) => r.payroll_snapshots)
          .map((r) => ({
            region: r.region, department: r.department,
            grossSalary: r.gross_salary, netPayable: r.net_payable,
            eobi: r.eobi, tax: r.tax, employeeCount: r.employee_count,
            salaryMonth:    r.payroll_snapshots!.salary_month,
            salaryYear:     r.payroll_snapshots!.salary_year,
            salaryMonthNum: r.payroll_snapshots!.salary_month_num,
            periodKey: r.payroll_snapshots!.salary_year * 12 + r.payroll_snapshots!.salary_month_num,
          }))
      : [];
    const finalRows = processed.length > 0 ? processed : makeDemoRows();
    const demo      = processed.length === 0;
    _cache = { rows: finalRows, isDemo: demo };
    setRows(finalRows);
    setIsDemo(demo);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (_cache !== null) return; // already cached — skip fetch on tab switch
    fetchData();
  }, [fetchData]);

  // All distinct periods newest → oldest
  const periods = useMemo(
    () => [...new Set(rows.map((r) => r.periodKey))].sort((a, b) => b - a),
    [rows]
  );


  // Period dropdown options
  const periodOptions = useMemo(() =>
    periods.map((pk) => {
      const r = rows.find((x) => x.periodKey === pk);
      return { key: pk, label: r ? r.salaryMonth : String(pk) };
    }),
    [periods, rows]
  );

  // Rows for the currently viewed period (null = all periods)
  const selectedRows = useMemo(
    () => periodFilters.length ? rows.filter((r) => periodFilters.includes(r.salaryMonth)) : rows,
    [rows, periodFilters]
  );

  // Gross by region chart
  const grossByRegion = useMemo(() => {
    const map: Record<string, number> = {};
    selectedRows.forEach((r) => { map[r.region] = (map[r.region] ?? 0) + r.grossSalary; });
    return Object.entries(map).map(([region, total]) => ({ region, total }));
  }, [selectedRows]);

  // Trend chart — all periods oldest → newest
  const trendData = useMemo(() => {
    return [...periods].reverse().map((pk) => {
      const pr = rows.filter((r) => r.periodKey === pk);
      const label = pr[0]
        ? `${pr[0].salaryMonth.slice(0, 3)} ${pr[0].salaryYear}`
        : String(pk);
      const point: { label: string; Canada?: number; Pakistan?: number; UAE?: number } = { label };
      (['Canada', 'Pakistan', 'UAE'] as const).forEach((region) => {
        const rr = pr.filter((r) => r.region === region);
        if (rr.length) point[region] = rr.reduce((s, r) => s + r.grossSalary, 0);
      });
      return point;
    });
  }, [rows, periods]);

  // Variance per region+dept — uses latest period when no period filter
  const varianceMap = useMemo(() => {
    const refPeriodKey = periodFilters.length === 1
      ? (rows.find((r) => r.salaryMonth === periodFilters[0])?.periodKey ?? periods[0])
      : periods[0];
    const groups: Record<string, DeptRow[]> = {};
    rows.forEach((r) => {
      const k = `${r.region}__${r.department}`;
      if (!groups[k]) groups[k] = [];
      groups[k].push(r);
    });
    const result: Record<string, {
      v1: number | null; v2: number | null; flagged: boolean;
      prevGross: number | null; prevNet: number | null; prevEobi: number | null;
      prevTax: number | null; prevEmp: number | null;
      prevMonth: string | null;
      prev2Gross: number | null; prev2Net: number | null; prev2Eobi: number | null;
      prev2Tax: number | null; prev2Emp: number | null;
      prev2Month: string | null;
      currMonth: string | null;
    }> = {};
    Object.entries(groups).forEach(([k, group]) => {
      const sorted = [...group].sort((a, b) => b.periodKey - a.periodKey);
      const currIdx = sorted.findIndex((r) => r.periodKey === refPeriodKey);
      const curr  = sorted[currIdx];
      const prev1 = sorted[currIdx + 1];
      const prev2 = sorted[currIdx + 2];
      if (!curr) { result[k] = { v1: null, v2: null, flagged: false, prevGross: null, prevNet: null, prevEobi: null, prevTax: null, prevEmp: null, prevMonth: null, currMonth: null }; return; }
      const v1 = prev1 && prev1.grossSalary !== 0
        ? ((curr.grossSalary - prev1.grossSalary) / prev1.grossSalary) * 100 : null;
      const avgPrev2 = prev1 && prev2 ? (prev1.grossSalary + prev2.grossSalary) / 2 : null;
      const v2 = avgPrev2 !== null && avgPrev2 !== 0
        ? ((curr.grossSalary - avgPrev2) / avgPrev2) * 100 : null;
      result[k] = {
        v1, v2, flagged: (v1 !== null && Math.abs(v1) > 3) || (v2 !== null && Math.abs(v2) > 3),
        prevGross: prev1?.grossSalary ?? null, prevNet: prev1?.netPayable ?? null,
        prevEobi: prev1?.eobi ?? null, prevTax: prev1?.tax ?? null,
        prevEmp: prev1?.employeeCount ?? null,
        prevMonth: prev1?.salaryMonth ?? null,
        prev2Gross: prev2?.grossSalary ?? null, prev2Net: prev2?.netPayable ?? null,
        prev2Eobi: prev2?.eobi ?? null, prev2Tax: prev2?.tax ?? null,
        prev2Emp: prev2?.employeeCount ?? null,
        prev2Month: prev2?.salaryMonth ?? null,
        currMonth: curr.salaryMonth,
      };
    });
    return result;
  }, [rows, periodFilters, periods]);

  // Available departments for dept slicer
  const availableDepts = useMemo(() => {
    const source = regionFilters.length === 0 ? selectedRows : selectedRows.filter((r) => regionFilters.includes(r.region));
    return [...new Set(source.map((r) => r.department))].sort();
  }, [selectedRows, regionFilters]);

  // Table rows — always show ALL departments for the latest period, no filters applied
  const tableRows = useMemo((): TableRow[] => {
    const refPK = periods[0];
    let source = rows.filter((r) => r.periodKey === refPK);
    return source.map((r) => {
      const v = varianceMap[`${r.region}__${r.department}`];
      return {
        region: r.region, department: r.department, grossSalary: r.grossSalary,
        netPayable: r.netPayable, eobi: r.eobi, tax: r.tax, employeeCount: r.employeeCount,
        variance1: v?.v1 ?? null, variance2: v?.v2 ?? null, flagged: v?.flagged ?? false,
        prevGross: v?.prevGross ?? null, prevNet: v?.prevNet ?? null,
        prevEobi: v?.prevEobi ?? null, prevTax: v?.prevTax ?? null,
        prevEmp: v?.prevEmp ?? null,
        prevMonth: v?.prevMonth ?? null,
        prev2Gross: v?.prev2Gross ?? null, prev2Net: v?.prev2Net ?? null,
        prev2Eobi: v?.prev2Eobi ?? null, prev2Tax: v?.prev2Tax ?? null,
        prev2Emp: v?.prev2Emp ?? null,
        prev2Month: v?.prev2Month ?? null,
        currMonth: v?.currMonth ?? null,
      };
    }).sort((a, b) => a.region !== b.region ? a.region.localeCompare(b.region) : a.department.localeCompare(b.department));
  }, [rows, periodFilters, periods, regionFilters, deptFilters, varianceMap]);

  // KPI totals — aggregate across all selected periods (overall when no period filter)
  const kpiData = useMemo((): KPIData => {
    // src = all selected-period rows, respecting region/dept filters
    const src = selectedRows
      .filter((r) => regionFilters.length === 0 || regionFilters.includes(r.region))
      .filter((r) => deptFilters.length   === 0 || deptFilters.includes(r.department));

    // MoM only meaningful when exactly 1 period is selected
    const refPK = periodFilters.length === 1
      ? (rows.find((r) => r.salaryMonth === periodFilters[0])?.periodKey ?? null)
      : null;
    const currentIdx = refPK !== null ? periods.indexOf(refPK) : -1;
    const prevPeriodKey = currentIdx >= 0 ? periods[currentIdx + 1] : undefined;
    const prevSrc = prevPeriodKey
      ? rows
          .filter((r) => r.periodKey === prevPeriodKey)
          .filter((r) => regionFilters.length === 0 || regionFilters.includes(r.region))
          .filter((r) => deptFilters.length   === 0 || deptFilters.includes(r.department))
      : [];

    const sum  = (arr: DeptRow[], k: 'grossSalary' | 'netPayable' | 'tax' | 'eobi') =>
      arr.reduce((s, r) => s + r[k], 0);
    const moM = (c: number, p: number) => p !== 0 ? ((c - p) / p) * 100 : null;

    const gross = sum(src, 'grossSalary');       const pGross = sum(prevSrc, 'grossSalary');
    const net   = sum(src, 'netPayable');        const pNet   = sum(prevSrc, 'netPayable');
    const tax   = sum(src, 'tax');               const pTax   = sum(prevSrc, 'tax');
    const eobi  = sum(src, 'eobi');              const pEobi  = sum(prevSrc, 'eobi');
    // Employee count: use reference-period rows to avoid inflating across months
    const emp  = tableRows.reduce((s, r) => s + r.employeeCount, 0);
    const pEmp = prevSrc.reduce((s, r) => s + r.employeeCount, 0);

    return {
      grossSalary: gross, netPayable: net, employees: emp, tax, eobi,
      grossMoM:     prevSrc.length ? moM(gross, pGross) : null,
      netMoM:       prevSrc.length ? moM(net,   pNet)   : null,
      employeesMoM: prevSrc.length ? moM(emp,   pEmp)   : null,
      taxMoM:       prevSrc.length ? moM(tax,   pTax)   : null,
      eobiMoM:      prevSrc.length ? moM(eobi,  pEobi)  : null,
    };
  }, [selectedRows, tableRows, rows, periodFilters, periods, regionFilters, deptFilters]);

  // Dept salary bar — aggregate across all selected periods (overall when no filter)
  const deptSalaryData = useMemo(() => {
    let source = selectedRows;
    if (regionFilters.length > 0) source = source.filter((r) => regionFilters.includes(r.region));
    if (deptFilters.length   > 0) source = source.filter((r) => deptFilters.includes(r.department));
    const map: Record<string, { value: number; region: string }> = {};
    source.forEach((r) => {
      const name = regionFilters.length !== 1 ? `${r.region} · ${r.department}` : r.department;
      if (!map[name]) map[name] = { value: 0, region: r.region };
      map[name].value += r.grossSalary;
    });
    return Object.entries(map).map(([name, d]) => ({ name, value: d.value, region: d.region }));
  }, [selectedRows, regionFilters, deptFilters]);

  const periodLabel = selectedRows[0]
    ? `${selectedRows[0].salaryMonth} ${selectedRows[0].salaryYear}`
    : '';

  const flaggedCount = tableRows.filter((r) => r.flagged).length;

  if (loading) return (
    <div className="page-content">
      <div className="page-header">
        <h2 className="page-title">Expense Overview</h2>
      </div>
      {/* KPI skeleton */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card kpi-card-hero"><div className="skeleton" style={{ height: 48, borderRadius: 6, marginBottom: 10 }} /><div className="skeleton" style={{ height: 14, width: '60%', borderRadius: 4 }} /></div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="kpi-card"><div className="skeleton" style={{ height: 28, borderRadius: 5, marginBottom: 8 }} /><div className="skeleton" style={{ height: 12, width: '70%', borderRadius: 4 }} /></div>
        ))}
      </div>
      {/* Charts skeleton */}
      <div className="charts-row" style={{ marginBottom: 24 }}>
        <div className="chart-card"><div className="skeleton" style={{ height: 200, borderRadius: 6 }} /></div>
        <div className="chart-card"><div className="skeleton" style={{ height: 200, borderRadius: 6 }} /></div>
      </div>
      <div className="chart-card" style={{ marginBottom: 24 }}>
        <div className="skeleton" style={{ height: 240, borderRadius: 6 }} />
      </div>
      {/* Table skeleton */}
      <div className="table-card">
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ padding: '12px 20px', borderBottom: '1px solid #F3F4F6' }}>
            <div className="skeleton" style={{ height: 14, borderRadius: 4 }} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
    <div className="page-content">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 className="page-title">Expense Overview</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <PayrollForecast rows={rows.map((r) => ({ region: r.region, netPayable: r.netPayable, periodKey: r.periodKey }))} />
          <button className="btn-refresh" onClick={fetchData} title="Refresh data">
            ↻ Refresh
          </button>
        </div>
      </div>

      {isDemo && (
        <div className="dash-demo-banner">
          ⚠ Showing sample data — <a href="/upload" style={{ fontWeight: 600, color: 'inherit', textDecoration: 'underline' }}>upload a payroll file</a> to see real figures.
        </div>
      )}

      {/* ── Slicers ── */}
      <div className="slicers-row">
        <CheckboxDropdown
          placeholder="All Periods"
          options={periodOptions.map((o) => o.label)}
          selected={periodFilters}
          onChange={(v) => { setPeriodFilters(v); setRegionFilters([]); setDeptFilters([]); }}
        />

        <CheckboxDropdown
          placeholder="All Regions"
          options={['Canada', 'Pakistan', 'UAE']}
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

      {/* ── KPI Cards ── */}
      <KPICards data={kpiData} />

      {/* ── Charts ── */}
      <div className="charts-row">
        <div className="chart-card">
          <div className="chart-title">Gross Salary by Region</div>
          <GrossByRegion data={grossByRegion} />
        </div>
        <div className="chart-card">
          <div className="chart-title">
            Payroll Trend
            <span className="chart-period-count">{periods.length} month{periods.length !== 1 ? 's' : ''}</span>
          </div>
          <TrendLine data={trendData} />
        </div>
      </div>

      {/* ── Departments by Payroll ── */}
      <div className="chart-card" style={{ marginBottom: 24 }}>
        <div className="chart-title">Departments by Payroll</div>
        <DeptSalaryBar data={deptSalaryData} />
      </div>

      {/* ── Table ── */}
      <div className="table-card">
        <div className="table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="chart-title" style={{ marginBottom: 0 }}>Department Wise Variance</span>
            <span className="table-info-icon">
              ℹ
              <span className="table-info-tooltip">
                Always shows <strong>all departments</strong> for the <strong>latest month</strong> — unaffected by any filters above.<br /><br />
                <strong>vs Last Month:</strong> current vs previous month gross salary.<br />
                <strong>vs 2mo Avg:</strong> current vs average of last 2 months.<br /><br />
                Rows highlighted in red exceeded <strong>±3% variance</strong>. Click <strong>Detail</strong> to see a full month-by-month breakdown per department.
              </span>
            </span>
          </div>
          {flaggedCount > 0 && (
            <span className="badge-warning">⚠ {flaggedCount} department{flaggedCount !== 1 ? 's' : ''} exceeded 3% variance</span>
          )}
        </div>
        <DepartmentTable rows={tableRows} showRegion={regionFilters.length !== 1} onDetail={setDetailRow} />
      </div>
    </div>
    {detailRow && <DeptVarianceModal row={detailRow} onClose={() => setDetailRow(null)} />}
    </>
  );
}
