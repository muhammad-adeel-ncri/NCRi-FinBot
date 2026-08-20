'use client';
import { useState, useEffect } from 'react';
import type { ForecastResult, ForecastPoint, HistoricalPoint } from '@/lib/forecast';
import { REGION_COLORS } from '@/lib/colors';

interface ForecastRow { region: string; netPayable: number; periodKey: number; }
interface Props { rows: ForecastRow[]; }

type Confidence = 'High' | 'Medium' | 'Low';

const CONFIDENCE_COLORS: Record<Confidence, string> = {
  High: '#16A34A', Medium: '#D97706', Low: '#DC2626',
};

function fmt(n: number) { return `PKR ${n.toLocaleString()}`; }
function fmtPct(n: number) { return `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1)}%`; }

function DataRow({ point, isPredicted, regions }: { point: HistoricalPoint | ForecastPoint; isPredicted: boolean; regions: string[] }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td style={{ padding: '9px 16px', whiteSpace: 'nowrap' }}>
        <span style={{ fontStyle: isPredicted ? 'italic' : 'normal', color: isPredicted ? 'var(--text-2)' : 'var(--text)' }}>
          {point.month}
        </span>
      </td>
      <td style={{ padding: '9px 16px', textAlign: 'right', fontWeight: isPredicted ? 400 : 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: isPredicted ? 'var(--text-2)' : 'var(--text)' }}>
        {fmt(point.total)}
      </td>
      {regions.map((region) => (
        <td key={region} style={{ padding: '9px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: '0.82rem', whiteSpace: 'nowrap', color: 'var(--text-2)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: REGION_COLORS[region] ?? '#6B7280', display: 'inline-block', flexShrink: 0 }} />
            {point.byRegion[region] !== undefined ? fmt(point.byRegion[region]) : '—'}
          </span>
        </td>
      ))}
    </tr>
  );
}

export default function PayrollForecast({ rows }: Props) {
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<(ForecastResult & { explanation: string | null; geminiError?: string }) | null>(null);
  const [error, setError]       = useState('');
  const [infoOpen, setInfoOpen] = useState(false);

  const regions = [...new Set(rows.map((r) => r.region))].sort();

  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  function rerun() {
    setResult(null); setError(''); setLoading(true);
    fetch('/api/forecast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }) })
      .then((r) => r.json()).then((d) => setResult(d))
      .catch(() => setError('Network error.')).finally(() => setLoading(false));
  }

  async function runForecast() {
    if (result) { setOpen(true); return; }
    setLoading(true); setError('');
    setOpen(true);
    try {
      const res  = await fetch('/api/forecast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Forecast failed.'); return; }
      setResult(data);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const confColor = result ? CONFIDENCE_COLORS[result.confidence as Confidence] : undefined;

  return (
    <>
      <button
        onClick={runForecast}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
          background: '#FFF0F3', color: 'var(--rose)',
          border: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#FFE4E6')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#FFF0F3')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        Forecast
      </button>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div
            className="modal-panel"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 760, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
          >
            <div className="modal-header">
              <span className="modal-title">Net Payable Forecast</span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Info icon — hover wrapper bridges gap so tooltip stays visible */}
                <div
                  style={{ position: 'relative', display: 'inline-flex', paddingBottom: 8, cursor: 'default' }}
                  onMouseEnter={() => setInfoOpen(true)}
                  onMouseLeave={() => setInfoOpen(false)}
                >
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 18, height: 18, borderRadius: '50%',
                    background: infoOpen ? 'var(--rose)' : 'var(--border)',
                    color: infoOpen ? '#fff' : 'var(--text-2)',
                    fontSize: '0.65rem', fontWeight: 700,
                    transition: 'background 0.15s, color 0.15s', flexShrink: 0,
                  }}>
                    i
                  </span>
                  {infoOpen && (
                    <div style={{
                      position: 'absolute', top: '100%', right: 0,
                      width: 280, background: 'var(--surface)',
                      border: '1px solid var(--border)', borderRadius: 8,
                      padding: '10px 12px', paddingTop: 14,
                      fontSize: '0.75rem', color: 'var(--text)',
                      lineHeight: 1.65, boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                      zIndex: 400, pointerEvents: 'none',
                    }}>
                      Uses <strong>weighted month-over-month growth rates</strong> per region — recent months carry higher weight. Confidence reflects how stable the historical trend is. The explanation below is generated by Gemini from the actual data.
                    </div>
                  )}
                </div>

                {result && (
                  <button className="btn-detail" onClick={rerun}>↻ Re-run</button>
                )}
                <button className="modal-close" onClick={() => setOpen(false)}>✕</button>
              </div>
            </div>

            <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
              {error && <div className="alert-error" style={{ margin: '16px 20px' }}>{error}</div>}

              {loading && (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  {[55, 75, 45, 65].map((w, i) => (
                    <div key={i} className="skeleton" style={{ height: 12, width: `${w}%`, borderRadius: 4, marginBottom: 10, marginLeft: 'auto', marginRight: 'auto' }} />
                  ))}
                  <p style={{ marginTop: 20, fontSize: '0.8rem', color: 'var(--text-3)' }}>Calculating forecast…</p>
                </div>
              )}

              {result && (
                <>
                  {/* Stats strip */}
                  <div style={{ padding: '9px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-2)' }}>
                    <span style={{ fontWeight: 600, color: confColor }}>{result.confidence} confidence</span>
                    <span style={{ color: 'var(--border)' }}>·</span>
                    <span>{result.monthsOfData} months of data</span>
                    <span style={{ color: 'var(--border)' }}>·</span>
                    <span>avg growth <strong style={{ color: result.avgGrowthRate >= 0 ? '#16A34A' : '#DC2626' }}>{fmtPct(result.avgGrowthRate)}/mo</strong></span>
                    <span style={{ color: 'var(--border)' }}>·</span>
                    <span>volatility {(result.volatility * 100).toFixed(1)}%</span>
                  </div>

                  {/* Table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border)' }}>
                          <th style={{ padding: '9px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Period</th>
                          <th style={{ padding: '9px 16px', textAlign: 'right', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Net Payable</th>
                          {regions.map((r) => (
                            <th key={r} style={{ padding: '9px 16px', textAlign: 'right', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', color: REGION_COLORS[r] ?? 'var(--text-2)' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: REGION_COLORS[r] ?? '#6B7280', display: 'inline-block' }} />
                                {r}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.historical.map((h) => <DataRow key={h.periodKey} point={h} isPredicted={false} regions={regions} />)}
                        <tr>
                          <td colSpan={2 + regions.length} style={{ padding: '4px 16px', borderTop: '1px dashed var(--border)', borderBottom: '1px dashed var(--border)', background: 'var(--bg)' }}>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontWeight: 500, letterSpacing: '0.03em' }}>projected</span>
                          </td>
                        </tr>
                        {result.predictions.map((p) => <DataRow key={p.periodKey} point={p} isPredicted={true} regions={regions} />)}
                      </tbody>
                    </table>
                  </div>

                  {/* Explanation */}
                  {result.explanation ? (
                    <div style={{ margin: '16px 20px 20px', padding: '12px 16px', borderLeft: '2px solid var(--border)', background: 'var(--bg)', borderRadius: '0 6px 6px 0' }}>
                      <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--text)', lineHeight: 1.75 }}>{result.explanation}</p>
                      <p style={{ margin: '8px 0 0', fontSize: '0.7rem', color: 'var(--text-3)' }}>via Gemini</p>
                    </div>
                  ) : (
                    <div style={{ margin: '16px 20px 20px', padding: '10px 14px', background: 'var(--border)', borderRadius: 6, fontSize: '0.78rem', color: 'var(--text-2)' }}>
                      {result.geminiError
                        ? <><strong>Gemini error:</strong> {result.geminiError}</>
                        : <>AI explanation unavailable — check <code>GEMINI_API_KEY</code> in <code>.env.local</code>.</>}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
