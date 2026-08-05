export default function PaymentUploadLoading() {
  return (
    <div className="page-content">
      <div className="page-header" style={{ textAlign: 'center' }}>
        <div className="skeleton" style={{ height: 24, width: 220, borderRadius: 6, margin: '0 auto' }} />
        <div className="skeleton" style={{ height: 14, width: 360, borderRadius: 4, marginTop: 10, margin: '10px auto 0' }} />
      </div>
      <div className="upload-layout">
        <div className="upload-left-col">
          <div className="upload-card">
            <div className="skeleton" style={{ height: 180, borderRadius: 10 }} />
            <div className="skeleton" style={{ height: 42, borderRadius: 8, marginTop: 16 }} />
          </div>
        </div>
        <div className="instruction-steps">
          <div className="skeleton" style={{ height: 14, width: 100, borderRadius: 4, marginBottom: 20 }} />
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
              <div className="skeleton" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: 13, width: 120, borderRadius: 4, marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 11, width: '80%', borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
