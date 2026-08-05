import * as XLSX from 'xlsx';
import type { JEResult } from './types';

const ACCENT: Record<string, { bg: string; fg: string }> = {
  Canada:   { bg: 'C8102E', fg: 'FFFFFF' },
  Pakistan: { bg: '01411C', fg: 'FFFFFF' },
  UAE:      { bg: '9B7A1E', fg: 'FFFFFF' },
};

export function writeJEExcel(je: JEResult): Uint8Array {
  const wb = XLSX.utils.book_new();
  const accent = ACCENT[je.country] ?? { bg: '1F2937', fg: 'FFFFFF' };

  const rows: (string | number | null)[][] = [
    ['Account', 'Debit', 'Credit', 'Description'],
    ...je.entries.map((e) => [e.account, e.debit ?? null, e.credit ?? null, e.description]),
    ['TOTAL', je.totalDebit, je.totalCredit, ''],
    [je.balanced ? '✓  BALANCED' : '✗  NOT BALANCED', je.balanced ? null : je.diff, null, ''],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);

  const lastEntry  = je.entries.length;      // 0-based row index of last entry
  const totalRowR  = lastEntry + 1;           // 0-based
  const statusRowR = lastEntry + 2;           // 0-based

  // ── Header row ──────────────────────────────────────────────
  const headerStyle = {
    font:      { bold: true, color: { rgb: accent.fg }, sz: 11 },
    fill:      { patternType: 'solid', fgColor: { rgb: accent.bg } },
    alignment: { vertical: 'center' },
    border:    { bottom: { style: 'thin', color: { rgb: 'FFFFFF' } } },
  };
  ['A', 'B', 'C', 'D'].forEach((col) => {
    const ref = `${col}1`;
    if (ws[ref]) {
      ws[ref].s = {
        ...headerStyle,
        alignment: {
          ...headerStyle.alignment,
          horizontal: col === 'B' || col === 'C' ? 'right' : 'left',
        },
      };
    }
  });

  // ── Entry rows — number format on debit/credit ───────────────
  for (let r = 1; r <= lastEntry; r++) {
    const rowNum = r + 1;
    ['B', 'C'].forEach((col) => {
      const ref = `${col}${rowNum}`;
      if (ws[ref] && ws[ref].t === 'n') {
        ws[ref].z = '#,##0.00';
        ws[ref].s = { alignment: { horizontal: 'right' } };
      }
    });
  }

  // ── TOTAL row ────────────────────────────────────────────────
  const totalNum = totalRowR + 1;
  const totalBase = {
    fill:   { patternType: 'solid', fgColor: { rgb: 'F3F4F6' } },
    border: { top: { style: 'medium', color: { rgb: '9CA3AF' } } },
  };
  if (ws[`A${totalNum}`]) ws[`A${totalNum}`].s = { ...totalBase, font: { bold: true } };
  if (ws[`B${totalNum}`]) { ws[`B${totalNum}`].z = '#,##0.00'; ws[`B${totalNum}`].s = { ...totalBase, font: { bold: true }, alignment: { horizontal: 'right' } }; }
  if (ws[`C${totalNum}`]) { ws[`C${totalNum}`].z = '#,##0.00'; ws[`C${totalNum}`].s = { ...totalBase, font: { bold: true }, alignment: { horizontal: 'right' } }; }
  if (ws[`D${totalNum}`]) ws[`D${totalNum}`].s = totalBase;

  // ── BALANCED / NOT BALANCED row ──────────────────────────────
  const statusNum = statusRowR + 1;
  const statusColor = je.balanced ? '16A34A' : 'DC2626';
  const statusStyle = {
    font:      { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
    fill:      { patternType: 'solid', fgColor: { rgb: statusColor } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  ['A', 'B', 'C', 'D'].forEach((col) => {
    const ref = `${col}${statusNum}`;
    if (!ws[ref]) ws[ref] = { t: 's', v: '' };
    ws[ref].s = statusStyle;
    if (col === 'B' && ws[ref].t === 'n') ws[ref].z = '#,##0.00';
  });

  // ── Column widths & row heights ──────────────────────────────
  ws['!cols'] = [{ wch: 42 }, { wch: 18 }, { wch: 18 }, { wch: 50 }];
  ws['!rows'] = [{ hpt: 22 }, ...Array(lastEntry).fill(null), null, { hpt: 20 }];

  // Freeze header row
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  XLSX.utils.book_append_sheet(wb, ws, `JE ${je.country} - Payable`.slice(0, 31));

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx', cellStyles: true }) as Uint8Array;
}
