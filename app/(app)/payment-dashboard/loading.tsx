export default function PaymentDashboardLoading() {
  return (
    <div className="page-content">
      <div className="page-header">
        <div className="skeleton" style={{ height: 24, width: 200, borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 14, width: 260, borderRadius: 4, marginTop: 8 }} />
      </div>
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card kpi-card-hero">
          <div className="skeleton" style={{ height: 48, borderRadius: 6, marginBottom: 10 }} />
          <div className="skeleton" style={{ height: 14, width: '60%', borderRadius: 4 }} />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="kpi-card">
            <div className="skeleton" style={{ height: 28, borderRadius: 5, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 12, width: '70%', borderRadius: 4 }} />
          </div>
        ))}
      </div>
      <div className="charts-row" style={{ marginBottom: 24 }}>
        <div className="chart-card"><div className="skeleton" style={{ height: 220, borderRadius: 6 }} /></div>
        <div className="chart-card"><div className="skeleton" style={{ height: 220, borderRadius: 6 }} /></div>
      </div>
      <div className="chart-card" style={{ marginBottom: 24 }}>
        <div className="skeleton" style={{ height: 240, borderRadius: 6 }} />
      </div>
      <div className="table-card">
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ padding: '12px 20px', borderBottom: '1px solid #F3F4F6' }}>
            <div className="skeleton" style={{ height: 14, borderRadius: 4 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
