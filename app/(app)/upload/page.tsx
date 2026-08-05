'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const FILENAME_PATTERN = /^Payroll_Expense_([A-Za-z]+)_(\d{4})\.xlsx$/;

const MONTH_NUMS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

const REGION_COLORS: Record<string, string> = {
  Canada: '#C8102E', Pakistan: '#01411C', UAE: '#C8A951',
};

interface SheetResult {
  country: string; balanced: boolean; diff: number;
  totalDebit: number; totalCredit: number; filename: string; file: string;
}
interface SheetError { sheet: string; messages: string[]; }

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile]             = useState<File | null>(null);
  const [filenameError, setFnErr]   = useState('');
  const [processing, setProcessing] = useState(false);
  const [results, setResults]       = useState<SheetResult[] | null>(null);
  const [sheetErrors, setSheetErrs] = useState<SheetError[]>([]);
  const [globalError, setGlobalErr] = useState('');
  const [dragOver, setDragOver]         = useState(false);
  const [checking, setChecking]         = useState(false);
  const [duplicateError, setDupErr]     = useState('');

  async function processFile(f: File) {
    setResults(null); setSheetErrs([]); setGlobalErr(''); setFnErr(''); setDupErr('');
    const isExcel =
      f.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      f.name.toLowerCase().endsWith('.xlsx');
    if (!isExcel) { setFile(null); setGlobalErr('Only Excel files (.xlsx) are accepted.'); return; }

    const match = FILENAME_PATTERN.exec(f.name);
    if (!match) {
      setFile(f);
      setFnErr('File must be named: Payroll_Expense_Month_Year.xlsx  (e.g. Payroll_Expense_January_2026.xlsx)');
      return;
    }

    const monthName = match[1];
    const year      = parseInt(match[2], 10);
    const monthNum  = MONTH_NUMS[monthName.toLowerCase()];

    if (!monthNum) {
      setFile(f);
      setFnErr(`"${monthName}" is not a valid month name.`);
      return;
    }

    // Check for existing data in Supabase
    setChecking(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('payroll_snapshots')
        .select('id')
        .eq('salary_year', year)
        .eq('salary_month_num', monthNum)
        .limit(1);

      if (data && data.length > 0) {
        setFile(null);
        setDupErr(`Data for ${monthName} ${year} already exists. Delete the existing records before re-uploading this period.`);
        setChecking(false);
        return;
      }
    } catch {
      // If check fails, allow upload to proceed
    }
    setChecking(false);
    setFile(f);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (f) processFile(f);
    else { setFile(null); }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0] ?? null;
    if (f) processFile(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || filenameError) return;
    setProcessing(true); setGlobalErr(''); setSheetErrs([]);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res  = await fetch('/api/process', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setGlobalErr(data.error ?? 'Processing failed.'); setSheetErrs(data.sheetErrors ?? []); }
      else          { setResults(data.results); setSheetErrs(data.sheetErrors ?? []); }
    } catch { setGlobalErr('Network error. Please try again.'); }
    finally   { setProcessing(false); }
  }

  function download(r: SheetResult) {
    const bytes = Uint8Array.from(atob(r.file), (c) => c.charCodeAt(0));
    const blob  = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href = url; a.download = r.filename; a.click();
    URL.revokeObjectURL(url);
  }

  const canSubmit = !!file && !filenameError && !duplicateError && !processing && !checking;
  const hasOutput = (results && results.length > 0) || sheetErrors.length > 0;

  return (
    <div className="page-content">
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h2 className="page-title">Upload Payroll File</h2>
        <p className="page-desc">
          Upload the department-wise payroll summary sheet. A separate Journal Entry file will be generated for each region (Canada, Pakistan, UAE).
        </p>
      </div>

      {/* ── Two-column layout ── */}
      <div className="upload-layout">

        {/* Left: Upload Card + Results */}
        <div className="upload-left-col">
          <div className="upload-card">
            <form onSubmit={handleSubmit}>
              <label
                className={`upload-zone${dragOver ? ' upload-zone--dragover' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
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
                    <div className="upload-hint">Payroll_Expense_Month_Year.xlsx · Max 5 MB</div>
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
              {globalError    && <div className="alert-error">{globalError}</div>}

              <button type="submit" className="btn-primary" disabled={!canSubmit}>
                {checking    ? 'Checking…'            :
                 processing  ? 'Generating JE Files…' :
                               'Generate JE Files'}
              </button>
            </form>
          </div>

          {hasOutput && (
            <div className="results-section" style={{ maxWidth: '100%' }}>
              {results && results.length > 0 && (
                <div className="alert-success">
                  <span className="alert-success-icon">✓</span>
                  {results.length} Journal Entry file{results.length !== 1 ? 's' : ''} generated successfully. Download each file below.
                </div>
              )}
              <h3 className="results-title">
                {results && results.length > 0 ? `${results.length} JE file${results.length !== 1 ? 's' : ''} generated` : 'Results'}
              </h3>

              {results?.map((r) => (
                <div key={r.country} className={`result-card ${r.balanced ? 'balanced' : 'unbalanced'}`}
                  style={{ borderLeftColor: REGION_COLORS[r.country] }}>
                  <div className="result-header">
                    <span className="region-badge" style={{ background: REGION_COLORS[r.country] }}>{r.country}</span>
                    <span className={r.balanced ? 'badge-balanced' : 'badge-unbalanced'}>
                      {r.balanced ? '✓ Balanced' : '✗ Not Balanced'}
                    </span>
                  </div>
                  <div className="result-footer">
                    <span className="result-amounts">
                      Debit: {fmt(r.totalDebit)} &nbsp;|&nbsp; Credit: {fmt(r.totalCredit)}
                      {!r.balanced && <span style={{ color: 'var(--danger)', marginLeft: 8 }}>Diff: {fmt(r.diff)}</span>}
                    </span>
                    <button className="btn-download" onClick={() => download(r)}>
                      Download ↓
                    </button>
                  </div>
                </div>
              ))}

              {sheetErrors.map((e) => (
                <div key={e.sheet} className="result-card sheet-error">
                  <div className="result-header">
                    <span className="result-country">{e.sheet}</span>
                    <span className="badge-warning">⚠ Could not process</span>
                  </div>
                  <ul className="error-list">
                    {e.messages.map((msg, i) => <li key={i}>{msg}</li>)}
                  </ul>
                </div>
              ))}

              {results && results.length > 0 && (
                <button className="btn-outline" onClick={() => router.push('/dashboard')}>
                  View Dashboard →
                </button>
              )}
            </div>
          )}
        </div>{/* end upload-left-col */}

        {/* Right: Instruction Steps */}
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
                <code>Payroll_Expense_Month_Year.xlsx</code><br />
                e.g. <code>Payroll_Expense_January_2026.xlsx</code>
              </div>
            </div>
          </div>

          <div className="instruction-step-item">
            <div className="step-track">
              <div className="step-number">02</div>
              <div className="step-line" />
            </div>
            <div className="step-body">
              <div className="step-title">Add required sheets</div>
              <div className="step-detail">
                File must contain exactly three sheets:<br />
                <span className="step-tag step-tag--ca">Canada</span>
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
              <div className="step-title">Required columns per sheet</div>
              <div className="step-detail">
                Each sheet must include:
                <div className="step-col-tags">
                  {['Department', 'Gross Salary', 'Net Payable', 'EOBI', 'Tax'].map((col) => (
                    <span key={col} className="step-col-tag">{col}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>{/* end instruction-steps */}

      </div>{/* end upload-layout */}

    </div>
  );
}
