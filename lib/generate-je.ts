import type { SheetData, JEEntry, JEResult } from './types';

export function generateJE(data: SheetData): JEResult {
  const { country, departments, salaryMonth, eobiMultiplier } = data;
  const entries: JEEntry[] = [];

  const totalGross = departments.reduce((s, d) => s + d.grossSalary, 0);
  const totalEobiEmployee = departments.reduce((s, d) => s + d.eobi, 0);
  const totalTax = departments.reduce((s, d) => s + d.tax, 0);
  const totalNetPayable = departments.reduce((s, d) => s + d.netPayable, 0);
  const employerEobi = totalEobiEmployee * eobiMultiplier;
  const totalEobiPayable = totalEobiEmployee + employerEobi;

  for (const dept of departments) {
    entries.push({
      account: dept.name,
      debit: dept.grossSalary,
      credit: null,
      description: `Salary of ${salaryMonth}`,
    });
  }

  if (eobiMultiplier > 0) {
    entries.push({
      account: 'EOBI Expense',
      debit: employerEobi,
      credit: null,
      description: `EOBI Employer Contribution for ${salaryMonth}`,
    });
  }

  entries.push({
    account: 'Salaries Payable',
    debit: null,
    credit: totalNetPayable,
    description: `Salary of ${salaryMonth}`,
  });

  if (eobiMultiplier > 0) {
    entries.push({
      account: 'EOBI Payable',
      debit: null,
      credit: totalEobiPayable,
      description: `EOBI Payable for ${salaryMonth}`,
    });
    entries.push({
      account: 'Withholding Tax Payable',
      debit: null,
      credit: totalTax,
      description: `Withholding Tax Payable for ${salaryMonth}`,
    });
  }

  const totalDebit = totalGross + employerEobi;
  const totalCredit = eobiMultiplier > 0
    ? totalNetPayable + totalEobiPayable + totalTax
    : totalNetPayable;

  const diff = Math.abs(totalDebit - totalCredit);
  const balanced = diff < 0.01;

  return { country, salaryMonth, entries, totalDebit, totalCredit, balanced, diff };
}
