import * as XLSX from 'xlsx';

export interface PaymentDept {
  name: string;
  grossSalary: number;
  totalDeduction: number | null;
  grossUp1pct: number | null;
  eobi: number | null;
  tax: number | null;
  netPayable: number | null;
  employeeCount: number;
}

export interface PaymentSheetData {
  region: 'UAE' | 'Pakistan';
  departments: PaymentDept[];
  salaryMonth: string;
}

export interface PaymentSheetError {
  sheet: string;
  messages: string[];
}

export interface PaymentParseResult {
  sheets: PaymentSheetData[];
  errors: PaymentSheetError[];
}

function normalize(s: unknown): string {
  return String(s).toLowerCase().replace(/\s+/g, ' ').trim();
}

function findCol(headers: unknown[], keyword: string, exclude?: string): number {
  return headers.findIndex((h) => {
    const n = normalize(h);
    return n.includes(keyword) && (!exclude || !n.includes(exclude));
  });
}

export function parsePayment(workbook: XLSX.WorkBook, salaryMonth: string): PaymentParseResult {
  const sheets: PaymentSheetData[] = [];
  const errors: PaymentSheetError[] = [];
  const names = workbook.SheetNames;

  const uaeName = names.find((s) => s.toLowerCase() === 'uae');
  if (uaeName) {
    const result = parseUAEPayment(workbook, uaeName, salaryMonth);
    'data' in result ? sheets.push(result.data) : errors.push(result.error);
  }

  const pkName = names.find((s) => s.toLowerCase() === 'pakistan');
  if (pkName) {
    const result = parsePKPayment(workbook, pkName, salaryMonth);
    'data' in result ? sheets.push(result.data) : errors.push(result.error);
  }

  if (sheets.length === 0 && errors.length === 0) {
    errors.push({ sheet: 'File', messages: ['No recognizable sheets found. Expected: UAE, Pakistan.'] });
  }

  return { sheets, errors };
}

function parseUAEPayment(
  wb: XLSX.WorkBook,
  sheetName: string,
  salaryMonth: string
): { data: PaymentSheetData } | { error: PaymentSheetError } {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, defval: '' });
  if (!rows.length) return { error: { sheet: 'UAE', messages: ['Sheet is empty.'] } };

  const headers = rows[0] as unknown[];
  const grossCol      = findCol(headers, 'gross', 'up');
  const deductionCol  = findCol(headers, 'deduction');
  const grossUpCol    = findCol(headers, 'up');
  const empCol        = findCol(headers, 'count');

  if (grossCol === -1) return { error: { sheet: 'UAE', messages: ['Missing column: Gross Salary.'] } };

  const departments: PaymentDept[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const label = String(row[0]).trim();
    if (!label || normalize(label) === 'grand total') continue;

    const grossSalary   = Number(row[grossCol])                           || 0;
    const totalDeduction = deductionCol !== -1 ? Number(row[deductionCol]) : null;
    const grossUp1pct    = grossUpCol  !== -1  ? Number(row[grossUpCol])   : null;
    const employeeCount  = empCol      !== -1  ? Number(row[empCol])       : 0;

    departments.push({
      name: label,
      grossSalary,
      totalDeduction: isNaN(totalDeduction as number) ? null : totalDeduction,
      grossUp1pct:    isNaN(grossUp1pct as number)    ? null : grossUp1pct,
      eobi: null, tax: null, netPayable: null,
      employeeCount: isNaN(employeeCount) ? 0 : employeeCount,
    });
  }

  if (!departments.length) return { error: { sheet: 'UAE', messages: ['No valid department rows found.'] } };
  return { data: { region: 'UAE', departments, salaryMonth } };
}

function parsePKPayment(
  wb: XLSX.WorkBook,
  sheetName: string,
  salaryMonth: string
): { data: PaymentSheetData } | { error: PaymentSheetError } {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, defval: '' });
  if (!rows.length) return { error: { sheet: 'Pakistan', messages: ['Sheet is empty.'] } };

  const headers = rows[0] as unknown[];
  const grossCol = findCol(headers, 'gross', 'up');
  const eobiCol  = findCol(headers, 'eobi');
  const taxCol   = findCol(headers, 'tax');
  const netCol   = findCol(headers, 'net');
  const empCol   = findCol(headers, 'count');

  const missing: string[] = [];
  if (grossCol === -1) missing.push('Gross Salary');
  if (eobiCol  === -1) missing.push('EOBI Contribution');
  if (taxCol   === -1) missing.push('Tax');
  if (netCol   === -1) missing.push('Net Payable');
  if (missing.length) return { error: { sheet: 'Pakistan', messages: [`Missing columns: ${missing.join(', ')}.`] } };

  const departments: PaymentDept[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const label = String(row[0]).trim();
    if (!label || normalize(label) === 'grand total') continue;

    const grossSalary   = Number(row[grossCol]) || 0;
    const eobi          = Number(row[eobiCol])  || 0;
    const tax           = Number(row[taxCol])   || 0;
    const netPayable    = Number(row[netCol])   || 0;
    const employeeCount = empCol !== -1 ? Number(row[empCol]) : 0;

    departments.push({
      name: label,
      grossSalary,
      eobi,
      tax,
      netPayable,
      totalDeduction: null,
      grossUp1pct: null,
      employeeCount: isNaN(employeeCount) ? 0 : employeeCount,
    });
  }

  if (!departments.length) return { error: { sheet: 'Pakistan', messages: ['No valid department rows found.'] } };
  return { data: { region: 'Pakistan', departments, salaryMonth } };
}
