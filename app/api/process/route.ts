import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { parsePayroll } from '@/lib/parse-payroll';
import { generateJE } from '@/lib/generate-je';
import { writeJEExcel } from '@/lib/write-je-excel';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

const FILENAME_PATTERN = /^Payroll_Expense_([A-Za-z]+)_(\d{4})\.xlsx$/;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const MONTH_NUMS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

export async function POST(req: NextRequest) {
  // Rate limiting — 10 uploads per minute per IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown';
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${rl.resetInSeconds}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.resetInSeconds) } }
    );
  }

  // Auth check
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large. Maximum allowed size is 5 MB (your file: ${(file.size / 1024 / 1024).toFixed(1)} MB).` },
      { status: 413 }
    );
  }

  const match = file.name.match(FILENAME_PATTERN);
  if (!match) {
    return NextResponse.json(
      { error: 'Invalid filename. Expected: Payroll_Expense_Month_Year.xlsx' },
      { status: 400 }
    );
  }

  const [, month, year] = match;
  const salaryMonth = `${month} ${year}`;
  const salaryMonthNum = MONTH_NUMS[month.toLowerCase()] ?? 0;

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);
  const { sheets, errors } = parsePayroll(workbook, salaryMonth);

  if (sheets.length === 0) {
    return NextResponse.json({ error: 'No sheets could be processed.', sheetErrors: errors }, { status: 400 });
  }

  const results = sheets.map((sheetData) => {
    const je = generateJE(sheetData);
    const excelBytes = writeJEExcel(je);
    return {
      country: sheetData.country,
      balanced: je.balanced,
      diff: je.diff,
      totalDebit: je.totalDebit,
      totalCredit: je.totalCredit,
      filename: `FinBot_${sheetData.country}_${month}_${year}.xlsx`,
      file: Buffer.from(excelBytes).toString('base64'),
      sheetData,
      je,
    };
  });

  // Save to Supabase (non-blocking on failure — JE files are still returned)
  try {
    const { data: snapshot, error: snapErr } = await supabase
      .from('payroll_snapshots')
      .insert({
        uploaded_by: user.id,
        salary_month: salaryMonth,
        salary_year: parseInt(year),
        salary_month_num: salaryMonthNum,
        filename: file.name,
      })
      .select('id')
      .single();

    if (!snapErr && snapshot) {
      const deptRows = results.flatMap((r) =>
        r.sheetData.departments.map((d) => ({
          snapshot_id: snapshot.id,
          region: r.country,
          department: d.name,
          gross_salary: d.grossSalary,
          net_payable: d.netPayable,
          eobi: d.eobi,
          tax: d.tax,
          employee_count: d.employeeCount,
        }))
      );

      const jeRows = results.map((r) => ({
        snapshot_id: snapshot.id,
        region: r.country,
        balanced: r.balanced,
        diff: r.diff,
        total_debit: r.totalDebit,
        total_credit: r.totalCredit,
      }));

      await Promise.all([
        supabase.from('department_data').insert(deptRows),
        supabase.from('je_results').insert(jeRows),
      ]);
    }
  } catch {
    // Supabase save failed — still return the JE files
  }

  return NextResponse.json({
    results: results.map(({ sheetData: _, je: __, ...rest }) => rest),
    sheetErrors: errors,
  });
}
