export type Country = 'Canada' | 'Pakistan' | 'UAE';

export interface Department {
  name: string;
  grossSalary: number;
  eobi: number;
  tax: number;
  netPayable: number;
  employeeCount: number;
}

export interface SheetData {
  country: Country;
  departments: Department[];
  salaryMonth: string;
  eobiMultiplier: number;
}

export interface JEEntry {
  account: string;
  debit: number | null;
  credit: number | null;
  description: string;
}

export interface JEResult {
  country: Country;
  salaryMonth: string;
  entries: JEEntry[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
  diff: number;
}
