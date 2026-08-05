import * as XLSX from 'xlsx';
import type { Country, Department, SheetData } from './types';

export interface SheetError {
  sheet: string;
  messages: string[];
}

export interface ParseResult {
  sheets: SheetData[];
  errors: SheetError[];
}

type SheetParseOutcome = { data: SheetData } | { error: SheetError };

function findSheet(sheetNames: string[], name: string): string | undefined {
  return sheetNames.find((s) => s.toLowerCase() === name.toLowerCase());
}

function normalize(s: string): string {
  return String(s).toLowerCase().replace(/\s+/g, ' ').trim();
}

function findColIndex(headers: (string | number)[], keyword: string, excludeKeyword?: string): number {
  return headers.findIndex((h) => {
    const n = normalize(h);
    return n.includes(keyword) && (!excludeKeyword || !n.includes(excludeKeyword));
  });
}

export function parsePayroll(workbook: XLSX.WorkBook, salaryMonth: string): ParseResult {
  const sheets: SheetData[] = [];
  const errors: SheetError[] = [];
  const sheetNames = workbook.SheetNames;

  const canadaSheet = findSheet(sheetNames, 'Canada');
  if (canadaSheet) {
    const outcome = parseStandardSheet(workbook, canadaSheet, 'Canada', 1, salaryMonth);
    'data' in outcome ? sheets.push(outcome.data) : errors.push(outcome.error);
  }

  const pakistanSheet = findSheet(sheetNames, 'Pakistan');
  if (pakistanSheet) {
    const outcome = parseStandardSheet(workbook, pakistanSheet, 'Pakistan', 5, salaryMonth);
    'data' in outcome ? sheets.push(outcome.data) : errors.push(outcome.error);
  }

  const uaeSheet = findSheet(sheetNames, 'UAE');
  if (uaeSheet) {
    const outcome = parseUAESheet(workbook, uaeSheet, salaryMonth);
    'data' in outcome ? sheets.push(outcome.data) : errors.push(outcome.error);
  }

  if (sheets.length === 0 && errors.length === 0) {
    errors.push({
      sheet: 'File',
      messages: ['No recognizable sheets found. Expected sheets named: Canada, Pakistan, or UAE.'],
    });
  }

  return { sheets, errors };
}

function parseStandardSheet(
  wb: XLSX.WorkBook,
  sheetName: string,
  country: Country,
  eobiMultiplier: number,
  salaryMonth: string
): SheetParseOutcome {
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(wb.Sheets[sheetName], { header: 1, defval: '' });

  if (rows.length === 0) return { error: { sheet: country, messages: ['Sheet is empty.'] } };

  const headers = rows[0];
  const missing: string[] = [];

  const grossCol    = findColIndex(headers, 'gross', 'up');
  const netCol      = findColIndex(headers, 'net');
  const eobiCol     = findColIndex(headers, 'eobi');
  const taxCol      = findColIndex(headers, 'tax');
  const employeeCol = findColIndex(headers, 'count');

  if (grossCol === -1)    missing.push('Gross Salary');
  if (netCol === -1)      missing.push('Net Payable');
  if (eobiCol === -1)     missing.push('EOBI Contribution');
  if (taxCol === -1)      missing.push('Tax');

  if (missing.length > 0) {
    return { error: { sheet: country, messages: [`Missing required column(s): ${missing.join(', ')}.`] } };
  }

  const departments: Department[] = [];
  const rowErrors: string[] = [];
  let hasGrandTotal = false;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const label = String(row[0]).trim();
    if (!label) continue;
    if (normalize(label) === 'grand total') { hasGrandTotal = true; continue; }

    const grossSalary   = Number(row[grossCol]);
    const netPayable    = Number(row[netCol]);
    const eobi          = Number(row[eobiCol]);
    const tax           = Number(row[taxCol]);
    const employeeCount = employeeCol !== -1 ? Number(row[employeeCol]) : 0;

    if (isNaN(grossSalary) || isNaN(netPayable) || isNaN(eobi) || isNaN(tax)) {
      rowErrors.push(`Row "${label}": one or more values are not numeric.`);
      continue;
    }

    departments.push({ name: label, grossSalary, eobi, tax, netPayable, employeeCount: isNaN(employeeCount) ? 0 : employeeCount });
  }

  const blockingErrors = [...rowErrors];
  if (departments.length === 0) blockingErrors.push('No valid department rows found.');
  if (blockingErrors.length > 0) return { error: { sheet: country, messages: blockingErrors } };

  if (!hasGrandTotal) rowErrors.push('Warning: Grand Total row not found — verify the data is complete.');

  return { data: { country, departments, salaryMonth, eobiMultiplier } };
}

function parseUAESheet(wb: XLSX.WorkBook, sheetName: string, salaryMonth: string): SheetParseOutcome {
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(wb.Sheets[sheetName], { header: 1, defval: '' });

  if (rows.length === 0) return { error: { sheet: 'UAE', messages: ['Sheet is empty.'] } };

  const headers = rows[0];
  const grossCol    = findColIndex(headers, 'gross');
  const employeeCol = findColIndex(headers, 'count');

  if (grossCol === -1) {
    return { error: { sheet: 'UAE', messages: ['Missing required column: Gross Up (expected a column containing "Gross").'] } };
  }

  const departments: Department[] = [];
  const rowErrors: string[] = [];
  let hasGrandTotal = false;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const label = String(row[0]).trim();
    if (!label) continue;
    if (normalize(label) === 'grand total') { hasGrandTotal = true; continue; }

    const grossUp       = Number(row[grossCol]);
    const employeeCount = employeeCol !== -1 ? Number(row[employeeCol]) : 0;

    if (isNaN(grossUp)) { rowErrors.push(`Row "${label}": value is not numeric.`); continue; }

    departments.push({ name: label, grossSalary: grossUp, eobi: 0, tax: 0, netPayable: grossUp, employeeCount: isNaN(employeeCount) ? 0 : employeeCount });
  }

  const blockingErrors = [...rowErrors];
  if (departments.length === 0) blockingErrors.push('No valid department rows found.');
  if (blockingErrors.length > 0) return { error: { sheet: 'UAE', messages: blockingErrors } };

  if (!hasGrandTotal) rowErrors.push('Warning: Grand Total row not found — verify the data is complete.');

  return { data: { country: 'UAE', departments, salaryMonth, eobiMultiplier: 0 } };
}
