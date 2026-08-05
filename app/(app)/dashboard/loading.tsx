export default function DashboardLoading() {
  return (
    <div className="page-content">
      <div className="page-header">
        <div className="skeleton" style={{ height: 24, width: 140, borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 14, width: 220, borderRadius: 4, marginTop: 8 }} />
      </div>

      <div className="region-tiles">
        {[0, 1, 2].map((i) => (
          <div key={i} className="region-tile">
            <div className="skeleton" style={{ height: 5 }} />
            <div className="region-tile-body">
              <div className="skeleton" style={{ height: 12, width: 80, borderRadius: 4, marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 30, width: 130, borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 12, width: 100, borderRadius: 4, marginTop: 8 }} />
            </div>
          </div>
        ))}
      </div>

      <div className="charts-row">
        {[0, 1].map((i) => (
          <div key={i} className="chart-card">
            <div className="skeleton" style={{ height: 14, width: 160, borderRadius: 4, marginBottom: 18 }} />
            <div className="skeleton" style={{ height: 180, borderRadius: 6 }} />
          </div>
        ))}
      </div>

      <div className="chart-card" style={{ marginBottom: 24 }}>
        <div className="skeleton" style={{ height: 14, width: 180, borderRadius: 4, marginBottom: 18 }} />
        <div className="skeleton" style={{ height: 160, borderRadius: 6 }} />
      </div>

      <div className="table-card">
        <div className="table-header">
          <div className="skeleton" style={{ height: 14, width: 140, borderRadius: 4 }} />
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 14, borderRadius: 4 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
