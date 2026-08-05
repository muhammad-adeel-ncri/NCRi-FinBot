'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const FILENAME_PATTERN = /^Payroll_Payment_([A-Za-z]+)_(\d{4})\.xlsx$/;

const MONTH_NUMS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function FolderIcon({ open, hasFile }: { open: boolean; hasFile: boolean }) {
  if (hasFile) {
    return (
      <svg width="52" height="56" viewBox="0 0 52 56" fill="none" style={{ marginBottom: 12 }}>
        <rect x="6" y="4" width="40" height="48" rx="4" fill="#E5E7EB" />
        <rect x="6" y="4" width="40" height="48" rx="4" stroke="#D1D5DB" strokeWidth="1.5" />
        <path d="M30 4 L30 18 L44 18" stroke="#D1D5DB" strokeWidth="1.5" fill="none" />
        <path d="M30 4 L44 18 L44 52 Q44 52 42 52 L10 52 Q8 52 8 50 L8 6 Q8 4 10 4 Z" fill="#F3F4F6" />
        <rect x="15" y="24" width="22" height="2.5" rx="1.25" fill="#9BA3AF" />
        <rect x="15" y="31" width="18" height="2.5" rx="1.25" fill="#9BA3AF" />
        <rect x="15" y="38" width="20" height="2.5" rx="1.25" fill="#9BA3AF" />
      </svg>
    );
  }
  return (
    <div className={`folder-wrap${open ? ' folder-wrap--open' : ''}`} style={{ marginBottom: 12 }}>
      <div className="folder-tab" />
      <div className="folder-body">
        <div className="folder-inner">
          <div className="folder-line" />
          <div className="folder-line folder-line--short" />
        </div>
      </div>
      <div className="folder-lid" />
    </div>
  );
}

export default function PaymentUploadPage() {
  const router = useRouter();
  const [file, setFile]             = useState<File | null>(null);
  const [filenameError, setFnErr]   = useState('');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess]       = useState<{ month: string; regions: string[] } | null>(null);
  const [globalError, setGlobalErr] = useState('');
  const [dragOver, setDragOver]     = useState(false);
  const [checking, setChecking]     = useState(false);
  const [duplicateError, setDupErr] = useState('');

  async function processFile(f: File) {
    setSuccess(null); setGlobalErr(''); setFnErr(''); setDupErr('');
    const isExcel =
      f.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      f.name.toLowerCase().endsWith('.xlsx');
    if (!isExcel) { setFile(null); setGlobalErr('Only Excel files (.xlsx) are accepted.'); return; }

    const match = FILENAME_PATTERN.exec(f.name);
    if (!match) {
      setFile(f);
      setFnErr('File must be named: Payroll_Payment_Month_Year.xlsx  (e.g. Payroll_Payment_January_2026.xlsx)');
      return;
    }

    const monthName = match[1];
    const year      = parseInt(match[2], 10);
    const monthNum  = MONTH_NUMS[monthName.toLowerCase()];
    if (!monthNum) { setFile(f); setFnErr(`"${monthName}" is not a valid month name.`); return; }

    setChecking(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('payment_snapshots')
        .select('id')
        .eq('salary_year', year)
        .eq('salary_month_num', monthNum)
        .limit(1);
      if (data && data.length > 0) {
        setFile(null);
        setDupErr(`Payment data for ${monthName} ${year} already exists. Delete existing records before re-uploading.`);
        setChecking(false);
        return;
      }
    } catch { /* allow upload if check fails */ }
    setChecking(false);
    setFile(f);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (f) processFile(f); else setFile(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0] ?? null;
    if (f) processFile(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || filenameError) return;
    setProcessing(true); setGlobalErr('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res  = await fetch('/api/process-payment', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) setGlobalErr(data.error ?? 'Processing failed.');
      else         setSuccess({ month: data.month, regions: data.regions });
    } catch { setGlobalErr('Network error. Please try again.'); }
    finally   { setProcessing(false); }
  }

  const canSubmit = !!file && !filenameError && !duplicateError && !processing && !checking;

  return (
    <div className="page-content">
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h2 className="page-title">Upload Payment File</h2>
        <p className="page-desc">
          Upload the monthly payroll payment sheet. Data will be saved and available in the Payment Dashboard.
        </p>
      </div>

      <div className="upload-layout">
        <div className="upload-left-col">
          <div className="upload-card">
            <form onSubmit={handleSubmit}>
              <label
                className={`upload-zone${dragOver ? ' upload-zone--dragover' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                onDrop={handleDrop}
              >
                <input type="file" accept=".xlsx" onChange={handleFileChange} />
                <FolderIcon open={dragOver} hasFile={!!file} />
                {file ? (
                  <>
                    <div className="upload-selected">{file.name}</div>
                    <div className="upload-hint">Click or drop to change file</div>
                  </>
                ) : (
                  <>
                    <div className="upload-label-text">
                      {dragOver ? 'Drop your file here' : 'Click or drag & drop your file'}
                    </div>
                    <div className="upload-hint">Payroll_Payment_Month_Year.xlsx · Max 5 MB</div>
                  </>
                )}
              </label>

              {filenameError  && <p className="field-error">{filenameError}</p>}
              {duplicateError && (
                <div className="alert-duplicate">
                  <span className="alert-duplicate-icon">⚠</span>
                  {duplicateError}
                </div>
              )}
              {globalError && <div className="alert-error">{globalError}</div>}

              <button type="submit" className="btn-primary" disabled={!canSubmit}>
                {checking ? 'Checking…' : processing ? 'Saving Payment Data…' : 'Save Payment Data'}
              </button>
            </form>
          </div>

          {success && (
            <div className="results-section" style={{ maxWidth: '100%' }}>
              <div className="alert-success">
                <span className="alert-success-icon">✓</span>
                Payment data for <strong>{success.month}</strong> saved successfully.
                Regions processed: {success.regions.join(', ')}.
              </div>
              <button className="btn-outline" onClick={() => router.push('/payment-dashboard')}>
                View Payment Dashboard →
              </button>
            </div>
          )}
        </div>

        <div className="instruction-steps">
          <div className="instruction-steps-header">How it works</div>

          <div className="instruction-step-item">
            <div className="step-track">
              <div className="step-number">01</div>
              <div className="step-line" />
            </div>
            <div className="step-body">
              <div className="step-title">Prepare your file</div>
              <div className="step-detail">
                Name the file exactly:<br />
                <code>Payroll_Payment_Month_Year.xlsx</code><br />
                e.g. <code>Payroll_Payment_January_2026.xlsx</code>
              </div>
            </div>
          </div>

          <div className="instruction-step-item">
            <div className="step-track">
              <div className="step-number">02</div>
              <div className="step-line" />
            </div>
            <div className="step-body">
              <div className="step-title">Required sheets</div>
              <div className="step-detail">
                File must contain these sheets:<br />
                <span className="step-tag step-tag--pk">Pakistan</span>
                <span className="step-tag step-tag--ae">UAE</span>
              </div>
            </div>
          </div>

          <div className="instruction-step-item">
            <div className="step-track">
              <div className="step-number">03</div>
            </div>
            <div className="step-body">
              <div className="step-title">Columns per sheet</div>
              <div className="step-detail">
                <strong>UAE:</strong>
                <div className="step-col-tags">
                  {['Gross Salary', 'Total Deduction', 'Gross Up 1%', 'Employee Count'].map((c) => (
                    <span key={c} className="step-col-tag">{c}</span>
                  ))}
                </div>
                <strong>Pakistan:</strong>
                <div className="step-col-tags">
                  {['Gross Salary', 'EOBI', 'Tax', 'Net Payable', 'Employee Count'].map((c) => (
                    <span key={c} className="step-col-tag">{c}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
